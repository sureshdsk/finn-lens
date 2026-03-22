"""Base classes and utilities for credit card statement PDF parsers.

Each bank has its own parser module (icici_cc.py, axis_cc.py, etc.) that
subclasses BaseCCStatementParser. The registry auto-selects the right parser
by issuer code, falling back to GenericCCStatementParser.
"""
from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Iterator, Protocol

logger = logging.getLogger(__name__)


@dataclass
class CCTransactionRecord:
    transaction_date: date
    description: str
    amount: float  # positive = debit, negative = credit


@dataclass
class CCParseResult:
    """Result of parsing a CC statement PDF."""
    records: list[CCTransactionRecord]
    card_last4: str = ""  # extracted from PDF content


class CCStatementParser(Protocol):
    """Protocol for bank-specific CC statement PDF parsers."""

    issuer: str

    def parse(self, pdf_bytes: bytes, password: str | None = None) -> Iterator[CCTransactionRecord]:
        """Parse a CC statement PDF and yield transaction records."""
        ...


# ── Parser Registry ──────────────────────────────────────────────────────

_PARSERS: dict[str, CCStatementParser] = {}


def register_cc_parser(parser: CCStatementParser) -> None:
    _PARSERS[parser.issuer] = parser


def get_cc_parser(issuer: str) -> CCStatementParser:
    """Get parser for issuer, falling back to generic."""
    return _PARSERS.get(issuer, _PARSERS.get("__generic__"))


# ── Shared PDF utilities ─────────────────────────────────────────────────

_DATE_RE = re.compile(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})")
_AMOUNT_RE = re.compile(r"([\d,]+\.\d{2})", re.IGNORECASE)


def open_pdf(pdf_bytes: bytes, password: str | None = None):
    """Open a PDF with pdfplumber, handling passwords."""
    import pdfplumber
    return pdfplumber.open(io.BytesIO(pdf_bytes), password=password)


def extract_text_pages(pdf_bytes: bytes, password: str | None = None) -> list[str]:
    """Extract text from all pages of a PDF."""
    pages: list[str] = []
    try:
        with open_pdf(pdf_bytes, password) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                if text:
                    pages.append(text)
    except Exception as e:
        logger.warning(f"PDF text extraction failed: {e}")
    return pages


def parse_date(val: str) -> date | None:
    """Parse DD/MM/YYYY or DD-MM-YYYY date string."""
    if not val:
        return None
    m = _DATE_RE.match(val.strip())
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    return None


_CARD_NUM_RE = re.compile(r"\d{4,6}[*Xx]+(\d{4})")


def extract_card_last4(text: str) -> str:
    """Extract card last 4 digits from PDF text like '533467******8858'."""
    m = _CARD_NUM_RE.search(text)
    return m.group(1) if m else ""


def parse_amount(val: str) -> float | None:
    """Parse amount string like '11,503.37'."""
    if not val:
        return None
    m = _AMOUNT_RE.search(val)
    if not m:
        return None
    return float(m.group(1).replace(",", ""))
