"""ICICI Credit Card statement PDF parser using pdfplumber.

ICICI CC statement PDF structure:
- Page 0: Header table (1 row with column names), then data table(s)
- Subsequent pages may have continuation data tables (no header)

Header row: Date | SerNo. | Transaction Details | Reward Points | Intl. amount | Amount (in `)
Data rows:  DD/MM/YYYY | serial | description | points | intl | amount [CR]
"""
from __future__ import annotations

import io
import re
from datetime import date, datetime
from typing import Iterator

import pdfplumber

from .cc_base import CCStatementParser, CCTransactionRecord

_DATE_RE = re.compile(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})")
_AMOUNT_RE = re.compile(r"([\d,]+\.\d{2})\s*(CR)?", re.IGNORECASE)

# Column keywords for header detection
_HEADER_KEYWORDS = {"date", "transaction", "amount"}


class ICICICCStatementParser(CCStatementParser):
    issuer = "ICICI"

    def parse(self, pdf_bytes: bytes, password: str | None = None) -> Iterator[CCTransactionRecord]:
        with pdfplumber.open(io.BytesIO(pdf_bytes), password=password) as pdf:
            col_map: dict[str, int] | None = None

            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table:
                        continue

                    # Try to detect header row in this table
                    detected = self._detect_header(table)
                    if detected:
                        col_map = detected
                        # Parse data rows after header in this same table
                        yield from self._parse_rows(table[1:], col_map)
                    elif col_map:
                        # Continuation table — use previously detected columns
                        yield from self._parse_rows(table, col_map)

    def _detect_header(self, table: list[list[str | None]]) -> dict[str, int] | None:
        """Check if first row is a header row and return column index map."""
        if not table:
            return None

        row = table[0]
        text = " ".join(str(c or "").lower() for c in row)

        # Must contain date + (amount or transaction)
        if "date" not in text:
            return None
        if "amount" not in text and "transaction" not in text:
            return None

        headers = [str(c or "").strip().lower().replace("\n", " ") for c in row]

        col_map: dict[str, int] = {}
        for i, h in enumerate(headers):
            if "date" in h and "date" not in col_map:
                col_map["date"] = i
            elif any(kw in h for kw in ("transaction", "details", "description", "particulars")):
                col_map["desc"] = i
            elif "amount" in h:
                col_map["amount"] = i

        if "date" in col_map and "amount" in col_map:
            # If no explicit description column, use date+1
            if "desc" not in col_map:
                # Skip SerNo column if present — description is typically 2 after date
                candidate = col_map["date"] + 1
                if candidate < len(headers) and "ser" in headers[candidate]:
                    candidate += 1
                if candidate < len(headers):
                    col_map["desc"] = candidate
            return col_map

        return None

    def _parse_rows(
        self, rows: list[list[str | None]], col_map: dict[str, int]
    ) -> Iterator[CCTransactionRecord]:
        date_col = col_map["date"]
        desc_col = col_map.get("desc", date_col + 1)
        amount_col = col_map["amount"]

        for row in rows:
            if not row:
                continue
            if len(row) <= max(date_col, desc_col, amount_col):
                continue

            txn_date = self._parse_date(str(row[date_col] or "").strip())
            if txn_date is None:
                continue

            description = str(row[desc_col] or "").strip()
            if not description:
                continue

            amount = self._parse_amount(str(row[amount_col] or "").strip())
            if amount is None:
                continue

            yield CCTransactionRecord(
                transaction_date=txn_date,
                description=description,
                amount=amount,
            )

    @staticmethod
    def _parse_date(val: str) -> date | None:
        if not val:
            return None
        m = _DATE_RE.match(val)
        if m:
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if y < 100:
                y += 2000
            try:
                return date(y, mo, d)
            except ValueError:
                return None
        return None

    @staticmethod
    def _parse_amount(val: str) -> float | None:
        if not val:
            return None
        m = _AMOUNT_RE.search(val)
        if not m:
            return None
        amount = float(m.group(1).replace(",", ""))
        if m.group(2):  # CR suffix → credit (negative)
            amount = -amount
        return amount
