"""Parser for recurring bill and invoice reminder emails."""

from __future__ import annotations

import re
from datetime import date, datetime

from .base import DataType, ExtractionResult

_BILL_SENDERS = [
    "airtel",
    "jio",
    "tatapower",
    "adanielectricity",
    "bescom",
    "lic",
    "hdfclife",
    "policybazaar",
    "paytm",
    "phonepe",
]

_BILL_SUBJECT_KEYWORDS = [
    "bill",
    "invoice",
    "amount due",
    "payment due",
    "due date",
    "premium due",
    "recharge due",
]

_AMOUNT_RE = re.compile(
    r"(?:amount\s+due|bill\s+amount|invoice\s+amount|premium(?:\s+amount)?|pay(?:ment)?\s+of)?[^₹$A-Z0-9]{0,8}(₹|rs\.?\s*|inr\s*|usd\s*|\$)\s*([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)

_DATE_CONTEXT_RE = re.compile(
    r"(?:due\s+date|pay\s+by|bill\s+due\s+on|payment\s+due\s+on|due\s+on)\s*:?\s*([A-Za-z0-9,\-/ ]{6,30})",
    re.IGNORECASE,
)

_DATE_PATTERNS = [
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%Y-%m-%d",
    "%d %b %Y",
    "%d %B %Y",
    "%b %d %Y",
    "%B %d %Y",
    "%b %d, %Y",
    "%B %d, %Y",
]

_BILLER_PATTERNS = [
    re.compile(r"^\s*([A-Za-z][\w&.+-]*(?:\s+[A-Za-z][\w&.+-]*){0,4})\s+(?:bill|invoice|premium)\b", re.IGNORECASE),
    re.compile(r"(?:bill|invoice|premium)\s+(?:from|for)\s+([A-Za-z][\w\s&.+-]{1,50})", re.IGNORECASE),
]


def _parse_date(raw: str) -> date | None:
    cleaned = re.sub(r"\s+", " ", raw.strip())
    for fmt in _DATE_PATTERNS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


class BillParser:
    def can_parse(self, sender: str, subject: str) -> bool:
        sender_lower = sender.lower()
        subject_lower = subject.lower()
        return any(token in sender_lower for token in _BILL_SENDERS) or any(
            keyword in subject_lower for keyword in _BILL_SUBJECT_KEYWORDS
        )

    def parse(
        self,
        sender: str,
        subject: str,
        body: str,
        attachments: list[bytes] | None = None,
    ) -> list[ExtractionResult]:
        text = re.sub(r"\s+", " ", f"{subject}\n{body}")

        amount = None
        currency = "INR"
        amount_match = _AMOUNT_RE.search(text)
        if amount_match:
            currency_token = amount_match.group(1).lower()
            amount = float(amount_match.group(2).replace(",", ""))
            if "$" in currency_token or "usd" in currency_token:
                currency = "USD"

        due_date = None
        date_match = _DATE_CONTEXT_RE.search(text)
        if date_match:
            due_date = _parse_date(date_match.group(1))

        biller_name = ""
        for pattern in _BILLER_PATTERNS:
            match = pattern.search(subject)
            if match:
                biller_name = match.group(1).strip()
                break
        if not biller_name:
            domain_match = re.search(r"@([\w.-]+)", sender)
            if domain_match:
                biller_name = domain_match.group(1).split(".")[0].replace("-", " ").title()

        if not biller_name and amount is None and due_date is None:
            return []

        confidence = 0.45
        if amount is not None:
            confidence += 0.2
        if due_date is not None:
            confidence += 0.2
        if biller_name:
            confidence += 0.1

        return [
            ExtractionResult(
                data_type=DataType.BILL_NOTICE,
                confidence=min(confidence, 1.0),
                amount=amount,
                currency=currency,
                transaction_date=due_date,
                merchant_or_provider=biller_name,
                description=subject,
                extra={
                    "biller_name": biller_name,
                    "due_date": str(due_date) if due_date else None,
                },
            )
        ]
