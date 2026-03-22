"""Generic CC statement PDF parser — fallback for unsupported banks.

Tries common patterns:
1. DD/MM/YYYY <description> <amount> [CR|Dr|Cr]
2. pdfplumber table extraction with header detection
"""
from __future__ import annotations

import io
import logging
import re
from typing import Iterator

from .cc_base import (
    CCTransactionRecord, CCStatementParser,
    extract_text_pages, parse_date, parse_amount,
)

logger = logging.getLogger(__name__)

# Generic: DD/MM/YYYY <description> <amount> [CR|Dr|Cr]
_TXN_RE = re.compile(
    r"(\d{1,2}/\d{1,2}/\d{4})\s+"
    r"(.+?)\s+"
    r"([\d,]+\.\d{2})\s*(CR|Dr|Cr)?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

_AMOUNT_WITH_DIR_RE = re.compile(r"([\d,]+\.\d{2})\s*(CR)?", re.IGNORECASE)


class GenericCCStatementParser(CCStatementParser):
    issuer = "__generic__"

    def parse(self, pdf_bytes: bytes, password: str | None = None) -> Iterator[CCTransactionRecord]:
        # Try text extraction first
        records = list(self._parse_text(pdf_bytes, password))
        if records:
            yield from records
            return

        # Try table extraction
        yield from self._parse_tables(pdf_bytes, password)

    @staticmethod
    def _parse_text(pdf_bytes: bytes, password: str | None = None) -> Iterator[CCTransactionRecord]:
        pages = extract_text_pages(pdf_bytes, password)
        seen: set[str] = set()

        for text in pages:
            for match in _TXN_RE.finditer(text):
                txn_date = parse_date(match.group(1))
                if not txn_date:
                    continue
                description = match.group(2).strip()
                if not description or len(description) < 3:
                    continue
                amount = parse_amount(match.group(3))
                if amount is None:
                    continue

                direction = (match.group(4) or "").lower()
                if direction in ("cr",):
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
    def _parse_tables(pdf_bytes: bytes, password: str | None = None) -> Iterator[CCTransactionRecord]:
        try:
            import pdfplumber
        except ImportError:
            return

        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes), password=password) as pdf:
                col_map: dict[str, int] | None = None
                for page in pdf.pages:
                    for table in (page.extract_tables() or []):
                        if not table:
                            continue
                        detected = _detect_header(table)
                        if detected:
                            col_map = detected
                            yield from _parse_rows(table[1:], col_map)
                        elif col_map:
                            yield from _parse_rows(table, col_map)
        except Exception as e:
            logger.warning(f"Generic table extraction failed: {e}")


def _detect_header(table: list[list[str | None]]) -> dict[str, int] | None:
    if not table:
        return None
    row = table[0]
    text = " ".join(str(c or "").lower() for c in row)
    if "date" not in text:
        return None
    if not any(kw in text for kw in ("amount", "transaction", "details")):
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
        if "desc" not in col_map:
            candidate = col_map["date"] + 1
            if candidate < len(headers) and "ser" in headers[candidate]:
                candidate += 1
            if candidate < len(headers):
                col_map["desc"] = candidate
        return col_map
    return None


def _parse_rows(rows: list[list[str | None]], col_map: dict[str, int]) -> Iterator[CCTransactionRecord]:
    date_col = col_map["date"]
    desc_col = col_map.get("desc", date_col + 1)
    amount_col = col_map["amount"]

    for row in rows:
        if not row or len(row) <= max(date_col, desc_col, amount_col):
            continue
        txn_date = parse_date(str(row[date_col] or ""))
        if not txn_date:
            continue
        description = str(row[desc_col] or "").strip()
        if not description:
            continue
        raw_amount = str(row[amount_col] or "")
        amount = parse_amount(raw_amount)
        if amount is None:
            continue
        if _AMOUNT_WITH_DIR_RE.search(raw_amount) and "cr" in raw_amount.lower():
            amount = -amount
        yield CCTransactionRecord(transaction_date=txn_date, description=description, amount=amount)
