"""ICICI Credit Card statement PDF parser.

Format (text extraction):
    DD/MM/YYYY <serial_number> <description> <reward_points> [<intl_amount> <currency>] <amount> [CR]

Example:
    12/02/2026 12866590863 ZOMATO NEW DELHI IN 4 444.93
    05/03/2026 12988338504 CLAUDE.AI SUBSCRIPTION 0 118 USD 11,149.05
    17/02/2026 12896437016 AMAZON INDIA CYBS SI MUMBAI IN -2 66.50 CR
"""
from __future__ import annotations

import re
from typing import Iterator

from .cc_base import CCTransactionRecord, CCStatementParser, extract_text_pages, extract_card_last4, parse_date


# DD/MM/YYYY <serial> <description> <points> [<intl> <currency>] <amount> [CR]
_TXN_RE = re.compile(
    r"(\d{1,2}/\d{1,2}/\d{4})\s+"           # date
    r"(\d{8,15})\s+"                          # serial number
    r"(.+?)\s+"                               # description (non-greedy)
    r"(-?\d+)\s+"                             # reward points
    r"(?:(\d+)\s+(?:USD|EUR|GBP)\s+)?"        # optional intl amount + currency
    r"([\d,]+\.\d{2})\s*(CR)?",               # amount + optional CR
    re.IGNORECASE,
)


class ICICICCStatementParser(CCStatementParser):
    issuer = "ICICI"

    def parse(self, pdf_bytes: bytes, password: str | None = None) -> Iterator[CCTransactionRecord]:
        pages = extract_text_pages(pdf_bytes, password)
        seen: set[str] = set()
        self._last_card_last4 = extract_card_last4(pages[0]) if pages else ""

        for text in pages:
            for match in _TXN_RE.finditer(text):
                txn_date = parse_date(match.group(1))
                if not txn_date:
                    continue

                description = match.group(3).strip()
                # Clean: remove stray percentage labels (from pie charts in PDF)
                description = re.sub(r"^\d{1,3}%\s*", "", description).strip()
                if not description or len(description) < 2:
                    continue

                intl_amount = match.group(5)
                amount_str = match.group(6)
                is_credit = bool(match.group(7))

                try:
                    amount = float(amount_str.replace(",", ""))
                except ValueError:
                    continue

                if is_credit:
                    amount = -amount

                # Dedup (same page text can overlap)
                key = f"{txn_date}|{amount:.2f}"
                if key in seen:
                    continue
                seen.add(key)

                if intl_amount:
                    description = f"{description} ({intl_amount} USD)"

                yield CCTransactionRecord(
                    transaction_date=txn_date,
                    description=description,
                    amount=amount,
                )
