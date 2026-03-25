"""Base classes and utilities for bank account e-statement PDF parsers.

Each bank has its own parser module (icici_bank_pdf.py, idfc_bank_pdf.py, etc.)
that subclasses BankPdfStatementParser. The registry auto-selects the right
parser by bank code.

Architecture mirrors cc_base.py — one base, one registry, shared PDF helpers.

Usage:
    from banking.parsers.bank_pdf_base import get_bank_pdf_parser

    parser = get_bank_pdf_parser("ICICI")
    meta, records = parser.parse(pdf_bytes, password="...")
    for rec in records:
        print(rec["transaction_date"], rec["description"], rec["debit"])
"""

from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Iterator, Protocol

from banking.protocols import AccountMeta, TransactionRecord

logger = logging.getLogger(__name__)


# ── Extended metadata for PDF statements ─────────────────────────────────

@dataclass
class StatementPeriod:
    start: date | None = None
    end: date | None = None


# ── Protocol ─────────────────────────────────────────────────────────────

class BankPdfStatementParser(Protocol):
    """Protocol for bank-specific account statement PDF parsers."""

    bank_name: str

    def parse(
        self, pdf_bytes: bytes, password: str | None = None
    ) -> tuple[AccountMeta, list[TransactionRecord], StatementPeriod]:
        """Parse a bank statement PDF.

        Returns:
            (account_meta, transactions, statement_period)
        """
        ...


# ── Parser Registry ──────────────────────────────────────────────────────

_PARSERS: dict[str, BankPdfStatementParser] = {}


def register_bank_pdf_parser(parser: BankPdfStatementParser) -> None:
    _PARSERS[parser.bank_name] = parser


def get_bank_pdf_parser(bank_name: str) -> BankPdfStatementParser | None:
    """Get parser for bank code, or None if unsupported."""
    return _PARSERS.get(bank_name)


def get_supported_banks() -> list[str]:
    """Return list of bank codes with registered PDF parsers."""
    return list(_PARSERS.keys())


# ── Shared PDF utilities ─────────────────────────────────────────────────


def open_pdf(pdf_bytes: bytes, password: str | None = None):
    """Open a PDF with pdfplumber, trying with and without password."""
    import pdfplumber

    try:
        return pdfplumber.open(io.BytesIO(pdf_bytes), password=password or "")
    except Exception:
        if password:
            # Retry without password in case PDF is actually unprotected
            try:
                return pdfplumber.open(io.BytesIO(pdf_bytes))
            except Exception:
                pass
        raise


def parse_date_dmy(val: str) -> date | None:
    """Parse DD-MM-YYYY or DD/MM/YYYY date string."""
    m = re.match(r"(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})", val.strip())
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if y < 100:
        y += 2000
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def parse_indian_amount(val: str) -> Decimal | None:
    """Parse Indian number format like '10,44,602.12' → Decimal."""
    if not val:
        return None
    s = val.replace(",", "").strip()
    if not s:
        return None
    try:
        d = Decimal(s)
        return d if d > 0 else None
    except InvalidOperation:
        return None


def parse_period_text(text: str) -> StatementPeriod:
    """Extract statement period from 'for the period Month DD, YYYY - Month DD, YYYY'."""
    m = re.search(
        r"for the period\s+(\w+ \d{1,2},?\s*\d{4})\s*-\s*(\w+ \d{1,2},?\s*\d{4})",
        text,
    )
    if not m:
        return StatementPeriod()
    fmts = ["%B %d, %Y", "%B %d,%Y", "%B %d %Y"]
    start = end = None
    for fmt in fmts:
        try:
            start = datetime.strptime(m.group(1).strip(), fmt).date()
            break
        except ValueError:
            continue
    for fmt in fmts:
        try:
            end = datetime.strptime(m.group(2).strip(), fmt).date()
            break
        except ValueError:
            continue
    return StatementPeriod(start=start, end=end)


def group_words_into_rows(
    words: list[dict], y_tolerance: float = 3.0
) -> list[list[dict]]:
    """Group pdfplumber words into rows by y-proximity."""
    if not words:
        return []
    words = sorted(words, key=lambda w: (w["top"], w["x0"]))
    rows: list[list[dict]] = [[words[0]]]
    for w in words[1:]:
        if abs(w["top"] - rows[-1][0]["top"]) <= y_tolerance:
            rows[-1].append(w)
        else:
            rows.append([w])
    return rows
