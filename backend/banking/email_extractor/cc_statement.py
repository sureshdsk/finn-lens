"""Extract structured data from credit card statement emails.

Pure-Python module with no Django/ORM dependencies.
Handles multiple Indian bank email formats (ICICI, HDFC, Axis, SBI, Kotak, etc.)
and common HTML entity encodings (&#8377; for ₹).
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional


@dataclass
class CCStatementExtract:
    """Structured data extracted from a CC statement email."""
    card_last4: str = ""
    issuer: str = ""
    total_due: Optional[float] = None
    min_due: Optional[float] = None
    due_date: Optional[date] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    pdf_password: Optional[str] = None
    currency: str = "INR"
    raw_fields: dict = field(default_factory=dict)

    @property
    def has_data(self) -> bool:
        return bool(self.total_due or self.card_last4)


# ── Currency symbol pattern (handles HTML entities) ──────────────────────

_CURRENCY_SYM = r"(?:₹|&#8377;|&\#8377;|Rs\.?\s*|INR\s*)"

# ── Card last 4 digits ──────────────────────────────────────────────────

_CARD_RE = re.compile(
    r"(?:card\s*(?:ending|no\.?|number)?[\s:]*(?:xx|XX|[*xX]+)?(\d{4}))|"
    r"(?:xx(\d{4}))|(?:XX(\d{4}))|(?:\*+(\d{4}))",
    re.IGNORECASE,
)

# ── Amounts ──────────────────────────────────────────────────────────────

_TOTAL_DUE_RE = re.compile(
    rf"(?:total\s+(?:amount\s+)?due|total\s+outstanding|amount\s+payable)"
    rf"[:\s]*(?:{_CURRENCY_SYM})?\s*([\d,]+(?:\.\d{{1,2}})?)\s*(?:Dr)?",
    re.IGNORECASE,
)

_MIN_DUE_RE = re.compile(
    rf"(?:minimum\s+(?:amount\s+)?due|min\.?\s+(?:amount\s+)?due)"
    rf"[:\s]*(?:{_CURRENCY_SYM}|[\(\)])*\s*([\d,]+(?:\.\d{{1,2}})?)\s*(?:Dr)?",
    re.IGNORECASE,
)

# Generic fallback — any currency amount
_AMOUNT_RE = re.compile(
    rf"{_CURRENCY_SYM}\s*([\d,]+(?:\.\d{{1,2}})?)",
    re.IGNORECASE,
)

# ── Due date ─────────────────────────────────────────────────────────────

# "due by 30/03/2026" or "due date: 30-03-2026" or "Payment Due Date (DD-MM-YYYY) 30/03/2026"
_DUE_DATE_NUMERIC_RE = re.compile(
    r"(?:due\s+(?:date|by|on))[\s:\(\)A-Z-]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
    re.IGNORECASE,
)

# "Payment due by March 30, 2026" or "due by 30 March, 2026"
_DUE_DATE_WRITTEN_RE = re.compile(
    r"(?:due\s+(?:date|by|on))\s+"
    r"(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+\w+,?\s+\d{4})",
    re.IGNORECASE,
)

# ── Billing period ───────────────────────────────────────────────────────

# "for the period February 13, 2026 to March 12, 2026"
_BILLING_PERIOD_RE = re.compile(
    r"(?:for\s+the\s+period|period|billing\s+cycle)\s+"
    r"(\w+\s+\d{1,2},?\s+\d{4})\s+to\s+(\w+\s+\d{1,2},?\s+\d{4})",
    re.IGNORECASE,
)

# "period: 13/02/2026 to 12/03/2026" or "Statement Period 12/12/2025 - 10/01/2026"
_BILLING_PERIOD_NUMERIC_RE = re.compile(
    r"(?:for\s+the\s+period|(?:statement\s+)?period|billing\s+cycle)[:\s]*"
    r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s*[-–to]+\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
    re.IGNORECASE,
)

# ── Password ─────────────────────────────────────────────────────────────

_PASSWORD_RE = re.compile(
    r"Password[:\s]+([A-Za-z0-9]{4,20})",
    re.IGNORECASE,
)


# ── Public API ───────────────────────────────────────────────────────────

def extract_cc_statement(subject: str, body_html: str) -> CCStatementExtract:
    """Extract structured CC statement data from email subject + body HTML.

    Args:
        subject: Email subject line.
        body_html: Raw HTML body of the email.

    Returns:
        CCStatementExtract with all extracted fields.
    """
    # Decode HTML entities, strip tags, normalize whitespace
    combined = f"{subject}\n{body_html}"
    combined = html.unescape(combined)
    clean = re.sub(r"<style[^>]*>.*?</style>", " ", combined, flags=re.DOTALL)
    clean = re.sub(r"<[^>]+>", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    result = CCStatementExtract()
    result.card_last4 = _extract_card_last4(clean)
    result.total_due = _extract_total_due(clean)
    result.min_due = _extract_min_due(clean)
    result.due_date = _extract_due_date(clean)
    result.pdf_password = _extract_password(clean)

    period = _extract_billing_period(clean)
    if period:
        result.billing_period_start, result.billing_period_end = period

    result.raw_fields = {
        "card_last4": result.card_last4,
        "total_due": result.total_due,
        "min_due": result.min_due,
        "due_date": str(result.due_date) if result.due_date else None,
        "billing_period_start": str(result.billing_period_start) if result.billing_period_start else None,
        "billing_period_end": str(result.billing_period_end) if result.billing_period_end else None,
    }

    return result


# ── Extraction helpers ───────────────────────────────────────────────────

def _extract_card_last4(text: str) -> str:
    match = _CARD_RE.search(text)
    if match:
        return next((g for g in match.groups() if g), "")
    return ""


def _extract_total_due(text: str) -> float | None:
    match = _TOTAL_DUE_RE.search(text)
    if match:
        return _parse_amount(match.group(1))
    return None


def _extract_min_due(text: str) -> float | None:
    match = _MIN_DUE_RE.search(text)
    if match:
        return _parse_amount(match.group(1))
    return None


def _extract_due_date(text: str) -> date | None:
    # Try numeric format first
    match = _DUE_DATE_NUMERIC_RE.search(text)
    if match:
        for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"):
            try:
                return datetime.strptime(match.group(1), fmt).date()
            except ValueError:
                continue

    # Try written format: "March 30, 2026" or "30 March 2026"
    match = _DUE_DATE_WRITTEN_RE.search(text)
    if match:
        return _parse_written_date(match.group(1))

    return None


def _extract_billing_period(text: str) -> tuple[date, date] | None:
    # Try written format: "February 13, 2026 to March 12, 2026"
    match = _BILLING_PERIOD_RE.search(text)
    if match:
        start = _parse_written_date(match.group(1))
        end = _parse_written_date(match.group(2))
        if start and end:
            return (start, end)

    # Try numeric format
    match = _BILLING_PERIOD_NUMERIC_RE.search(text)
    if match:
        start = _parse_numeric_date(match.group(1))
        end = _parse_numeric_date(match.group(2))
        if start and end:
            return (start, end)

    return None


def _extract_password(text: str) -> str | None:
    match = _PASSWORD_RE.search(text)
    if match:
        return match.group(1)
    return None


# ── Date parsing utilities ───────────────────────────────────────────────

_WRITTEN_DATE_FORMATS = (
    "%B %d, %Y",    # March 30, 2026
    "%B %d %Y",     # March 30 2026
    "%d %B, %Y",    # 30 March, 2026
    "%d %B %Y",     # 30 March 2026
    "%b %d, %Y",    # Mar 30, 2026
    "%b %d %Y",     # Mar 30 2026
    "%d %b, %Y",    # 30 Mar, 2026
    "%d %b %Y",     # 30 Mar 2026
)


def _parse_written_date(val: str) -> date | None:
    val = val.strip().replace(",", ", ").replace("  ", " ").strip(", ")
    for fmt in _WRITTEN_DATE_FORMATS:
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            continue
    return None


def _parse_numeric_date(val: str) -> date | None:
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"):
        try:
            return datetime.strptime(val.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _parse_amount(val: str) -> float | None:
    try:
        return float(val.replace(",", ""))
    except ValueError:
        return None
