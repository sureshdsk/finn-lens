from __future__ import annotations

import re
from datetime import date

from .base import BaseEmailParser, DataType, ExtractionResult

# Amount pattern: ₹1,234.56 or ₹1234.56
AMOUNT_RE = re.compile(r"(?:₹|Rs\.?\s*|INR\s*)([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)

# Units pattern
UNITS_RE = re.compile(r"UNITS\s+ALLOCATED\s+([\d,]+(?:\.\d{1,4})?)", re.IGNORECASE)

# NAV pattern
NAV_RE = re.compile(r"NAV\s+([\d,]+(?:\.\d{1,4})?)", re.IGNORECASE)

# Scheme name — appears between "SCHEME NAME" and "SIP AMOUNT" or "AMOUNT"
SCHEME_RE = re.compile(r"SCHEME\s+NAME\s+(.+?)(?:SIP\s+AMOUNT|AMOUNT)", re.IGNORECASE | re.DOTALL)

# Order ID
ORDER_ID_RE = re.compile(r"ORDER\s+ID\s+(\S+)", re.IGNORECASE)

# SIP due date
DUE_DATE_RE = re.compile(r"DUE\s+DATE\s+(\d{1,2}\s+\w+\s+\d{4})", re.IGNORECASE)

# SIP due amount
SIP_AMOUNT_RE = re.compile(r"SIP\s+AMOUNT\s+(?:₹|Rs\.?\s*|INR\s*)([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)

GROWW_DOMAINS = ["groww.in"]

# Subjects we can parse
PARSEABLE_SUBJECTS = {
    "units_allocated": "units allocated",
    "instalment_due": "instalment due",
}


class GrowwInvestmentParser:
    def can_parse(self, sender: str, subject: str) -> bool:
        sender_lower = sender.lower()
        subject_lower = subject.lower()
        if not any(d in sender_lower for d in GROWW_DOMAINS):
            return False
        return any(kw in subject_lower for kw in PARSEABLE_SUBJECTS.values())

    def parse(self, sender: str, subject: str, body: str, attachments: list[bytes] | None = None) -> list[ExtractionResult]:
        subject_lower = subject.lower()

        # Strip HTML
        text = re.sub(r"<[^>]+>", " ", body)
        text = re.sub(r"\s+", " ", text).strip()
        combined = f"{subject}\n{text}"

        if "units allocated" in subject_lower:
            return self._parse_units_allocated(combined, subject)
        elif "instalment due" in subject_lower:
            return self._parse_sip_due(combined, subject)

        return []

    def _parse_units_allocated(self, text: str, subject: str) -> list[ExtractionResult]:
        # Extract scheme name
        scheme_match = SCHEME_RE.search(text)
        scheme_name = scheme_match.group(1).strip() if scheme_match else ""

        # Extract amount
        amount = None
        amount_match = SIP_AMOUNT_RE.search(text)
        if not amount_match:
            amount_match = AMOUNT_RE.search(text)
        if amount_match:
            amount = float(amount_match.group(1).replace(",", ""))

        # Extract units
        units = None
        units_match = UNITS_RE.search(text)
        if units_match:
            units = float(units_match.group(1).replace(",", ""))

        # Extract NAV
        nav = None
        nav_match = NAV_RE.search(text)
        if nav_match:
            nav = float(nav_match.group(1).replace(",", ""))

        # Extract order ID
        order_id = ""
        order_match = ORDER_ID_RE.search(text)
        if order_match:
            order_id = order_match.group(1)

        if not scheme_name and not amount:
            return []

        confidence = 0.5
        if scheme_name:
            confidence += 0.2
        if amount:
            confidence += 0.1
        if units:
            confidence += 0.1
        if nav:
            confidence += 0.1

        return [
            ExtractionResult(
                data_type=DataType.INVESTMENT_UPDATE,
                confidence=min(confidence, 1.0),
                amount=amount,
                currency="INR",
                merchant_or_provider="Groww",
                description=subject,
                extra={
                    "investment_type": "mutual_fund",
                    "transaction_type": "sip_purchase",
                    "scheme_name": scheme_name,
                    "units": units,
                    "nav": nav,
                    "order_id": order_id,
                    "source": "groww",
                },
            )
        ]

    def _parse_sip_due(self, text: str, subject: str) -> list[ExtractionResult]:
        # Extract scheme name
        scheme_match = SCHEME_RE.search(text)
        scheme_name = scheme_match.group(1).strip() if scheme_match else ""

        # Extract amount
        amount = None
        amount_match = SIP_AMOUNT_RE.search(text)
        if not amount_match:
            amount_match = AMOUNT_RE.search(text)
        if amount_match:
            amount = float(amount_match.group(1).replace(",", ""))

        # Extract due date
        due_date_str = ""
        due_match = DUE_DATE_RE.search(text)
        if due_match:
            due_date_str = due_match.group(1)

        if not scheme_name and not amount:
            return []

        return [
            ExtractionResult(
                data_type=DataType.INVESTMENT_UPDATE,
                confidence=0.8,
                amount=amount,
                currency="INR",
                merchant_or_provider="Groww",
                description=subject,
                extra={
                    "investment_type": "mutual_fund",
                    "transaction_type": "sip_due",
                    "scheme_name": scheme_name,
                    "due_date": due_date_str,
                    "source": "groww",
                },
            )
        ]
