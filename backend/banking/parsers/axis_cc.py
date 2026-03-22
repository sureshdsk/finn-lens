"""Axis Bank Credit Card statement PDF parser.

Format (text extraction):
    DATE TRANSACTION DETAILS MERCHANT CATEGORY AMOUNT (Rs.) CASHBACK EARNED
    Card No: 533467******8858 Name SURESH KUMAR
    18/12/2025 SWIGGY MARKETPLACE,GAUTAM BUDDH MISC STORE 963.00 Dr 9.00 Cr
    23/12/2025 BBPS PAYMENT RECEIVED - DP015357... 2,177.32 Cr 0.00 Dr

Amount uses Dr (debit) / Cr (credit) suffix.
Cashback column follows with its own Dr/Cr.

Also extracts bill metadata from the PDF:
    Total Payment Due, Minimum Payment Due, Statement Period, Payment Due Date
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Iterator, Optional

from .cc_base import CCTransactionRecord, CCStatementParser, CCParseResult, extract_text_pages, extract_card_last4, parse_date


# Bill metadata patterns
_TOTAL_DUE_RE = re.compile(r"Total\s+Payment\s+Due\s+([\d,]+(?:\.\d{2})?)\s*Dr", re.IGNORECASE)
_MIN_DUE_RE = re.compile(r"Minimum\s+Payment\s+Due\s+([\d,]+(?:\.\d{2})?)\s*Dr", re.IGNORECASE)
_STMT_PERIOD_RE = re.compile(r"Statement\s+Period\s+(\d{1,2}/\d{1,2}/\d{4})\s*-\s*(\d{1,2}/\d{1,2}/\d{4})", re.IGNORECASE)
_DUE_DATE_RE = re.compile(r"Payment\s+Due\s+Date\s+(\d{1,2}/\d{1,2}/\d{4})", re.IGNORECASE)


@dataclass
class AxisBillMeta:
    total_due: Optional[float] = None
    min_due: Optional[float] = None
    due_date: Optional[date] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None


# Lines to skip (not actual transactions)
_SKIP_RE = re.compile(
    r"Card No:|PAYMENT SUMMARY|ACCOUNT SUMMARY|END OF STATEMENT|"
    r"Total Payment Due|Minimum Payment|Credit Limit|"
    r"Previous Balance|Statement Period|Statement Generation",
    re.IGNORECASE,
)

# Match: <amount> Dr/Cr pattern anywhere in a line
_AMOUNT_DIR_RE = re.compile(r"([\d,]+\.\d{2})\s+(Dr|Cr)", re.IGNORECASE)


class AxisCCStatementParser(CCStatementParser):
    issuer = "AXIS"

    def parse(self, pdf_bytes: bytes, password: str | None = None) -> Iterator[CCTransactionRecord]:
        pages = extract_text_pages(pdf_bytes, password)
        seen: set[str] = set()

        # Extract metadata from first page
        first_page = pages[0] if pages else ""
        self._last_card_last4 = extract_card_last4(first_page)
        self._bill_meta = self._extract_bill_meta(first_page)

        for text in pages:
            for line in text.split("\n"):
                line = line.strip()
                if not line or _SKIP_RE.search(line):
                    continue

                # Must start with a date
                date_match = re.match(r"(\d{1,2}/\d{1,2}/\d{4})\s+", line)
                if not date_match:
                    continue

                txn_date = parse_date(date_match.group(1))
                if not txn_date:
                    continue

                rest = line[date_match.end():]

                # Find first <amount> Dr/Cr — that's the transaction amount
                amt_match = _AMOUNT_DIR_RE.search(rest)
                if not amt_match:
                    continue

                description = rest[:amt_match.start()].strip()
                if not description or len(description) < 3:
                    continue

                try:
                    amount = float(amt_match.group(1).replace(",", ""))
                except ValueError:
                    continue

                if amt_match.group(2).lower() == "cr":
                    amount = -amount

                key = f"{txn_date}|{amount:.2f}"
                if key in seen:
                    continue
                seen.add(key)

                yield CCTransactionRecord(
                    transaction_date=txn_date,
                    description=description,
                    amount=amount,
                )

    @staticmethod
    def _extract_bill_meta(text: str) -> AxisBillMeta:
        """Extract bill metadata from Axis PDF.

        Axis format has headers on one line and values on the next:
            Total Payment Due Minimum Payment Due Statement Period Payment Due Date ...
            10,669.00 Dr 214.00 Dr 12/02/2026 - 10/03/2026 30/03/2026 ...
        """
        meta = AxisBillMeta()

        # Try single-line patterns first
        m = _TOTAL_DUE_RE.search(text)
        if m:
            try:
                meta.total_due = float(m.group(1).replace(",", ""))
            except ValueError:
                pass

        # If single-line didn't work, parse the two-line header/value format
        if meta.total_due is None:
            # Find the header line containing "Total Payment Due"
            lines = text.split("\n")
            for i, line in enumerate(lines):
                if "Total Payment Due" in line and i + 1 < len(lines):
                    values_line = lines[i + 1].strip()
                    # Values: <total> Dr <min> Dr <period_start> - <period_end> <due_date> <gen_date>
                    vals = re.findall(r"([\d,]+(?:\.\d{2})?)\s*Dr", values_line)
                    if len(vals) >= 1:
                        try:
                            meta.total_due = float(vals[0].replace(",", ""))
                        except ValueError:
                            pass
                    if len(vals) >= 2:
                        try:
                            meta.min_due = float(vals[1].replace(",", ""))
                        except ValueError:
                            pass

                    # Extract dates from values line
                    dates = re.findall(r"(\d{1,2}/\d{1,2}/\d{4})", values_line)
                    if len(dates) >= 2:
                        meta.billing_period_start = parse_date(dates[0])
                        meta.billing_period_end = parse_date(dates[1])
                    if len(dates) >= 3:
                        meta.due_date = parse_date(dates[2])
                    break

        # Fallback to standalone patterns
        if meta.due_date is None:
            m = _DUE_DATE_RE.search(text)
            if m:
                meta.due_date = parse_date(m.group(1))

        if meta.billing_period_start is None:
            m = _STMT_PERIOD_RE.search(text)
            if m:
                meta.billing_period_start = parse_date(m.group(1))
                meta.billing_period_end = parse_date(m.group(2))

        return meta
