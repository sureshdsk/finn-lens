"""Extract payment confirmation data from CC payment received emails.

Pure-Python module with no Django/ORM dependencies.
Handles ICICI, HDFC, Axis, SBI, Kotak formats.
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass
class CCPaymentExtract:
    """Structured data from a CC payment confirmation email."""
    amount: Optional[float] = None
    card_last4: str = ""
    payment_date: Optional[date] = None
    currency: str = "INR"

    @property
    def has_data(self) -> bool:
        return self.amount is not None and bool(self.card_last4)


_CURRENCY_SYM = r"(?:₹|&#8377;|Rs\.?\s*|INR\s*)"

# "payment of INR 11,503.37" or "payment of ₹11,503.37"
_AMOUNT_RE = re.compile(
    rf"(?:payment|paid|received)\s+(?:of\s+)?{_CURRENCY_SYM}\s*([\d,]+(?:\.\d{{1,2}})?)",
    re.IGNORECASE,
)

# Card last 4: "Card account 4375 XXXX XXXX 3003" or "card no. XX8858" or "card ending XX58"
_CARD_RE = re.compile(
    r"(?:card\s*(?:account|no\.?|number|ending)?[\s:]*(?:\d{4}\s*)?(?:xx|XX|[*xX]+\s*)+(\d{4}))|"
    r"(?:xx(\d{4}))|(?:XX(\d{4}))",
    re.IGNORECASE,
)

# Date: "on 25-Feb-2026" or "on 19/02/2026" or "dated February 25, 2026"
_DATE_PATTERNS = [
    (re.compile(r"on\s+(\d{1,2}-\w{3}-\d{4})", re.IGNORECASE), ["%d-%b-%Y"]),
    (re.compile(r"on\s+(\d{1,2}[-/]\d{1,2}[-/]\d{4})"), ["%d-%m-%Y", "%d/%m/%Y"]),
    (re.compile(r"(?:on|dated)\s+(\w+\s+\d{1,2},?\s+\d{4})", re.IGNORECASE), ["%B %d, %Y", "%B %d %Y", "%b %d, %Y"]),
]


def extract_cc_payment(subject: str, body_html: str) -> CCPaymentExtract:
    """Extract CC payment confirmation data from email subject + body HTML."""
    combined = f"{subject}\n{body_html}"
    combined = html.unescape(combined)
    clean = re.sub(r"<style[^>]*>.*?</style>", " ", combined, flags=re.DOTALL)
    clean = re.sub(r"<[^>]+>", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    result = CCPaymentExtract()

    # Amount
    m = _AMOUNT_RE.search(clean)
    if m:
        try:
            result.amount = float(m.group(1).replace(",", ""))
        except ValueError:
            pass

    # Card last 4
    m = _CARD_RE.search(clean)
    if m:
        result.card_last4 = next((g for g in m.groups() if g), "")

    # Payment date
    for pattern, formats in _DATE_PATTERNS:
        m = pattern.search(clean)
        if m:
            for fmt in formats:
                try:
                    result.payment_date = datetime.strptime(m.group(1).strip(), fmt).date()
                    break
                except ValueError:
                    continue
            if result.payment_date:
                break

    return result
