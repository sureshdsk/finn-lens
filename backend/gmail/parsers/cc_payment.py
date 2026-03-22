"""Parser for CC payment received/confirmation emails."""
from __future__ import annotations

import re

from banking.constants import CC_DOMAINS
from banking.email_extractor import extract_cc_payment

from .base import DataType, ExtractionResult

_PAYMENT_SUBJECT_RE = re.compile(
    r"(payment\s+received|payment\s+successful|payment\s+confirmation|"
    r"payment\s+credited|amount\s+received)",
    re.IGNORECASE,
)

# Exclude transaction alerts
_ALERT_KEYWORDS = ["transaction", "spent", "debited", "purchase", "charged"]


class CreditCardPaymentParser:
    """Email parser for CC payment received/confirmation emails."""

    def can_parse(self, sender: str, subject: str) -> bool:
        sender_lower = sender.lower()
        subject_lower = subject.lower()

        domain_match = any(domain in sender_lower for domain in CC_DOMAINS)
        payment_match = bool(_PAYMENT_SUBJECT_RE.search(subject_lower))
        is_alert = any(kw in subject_lower for kw in _ALERT_KEYWORDS)

        return domain_match and payment_match and not is_alert

    def parse(
        self,
        sender: str,
        subject: str,
        body: str,
        attachments: list[bytes] | None = None,
    ) -> list[ExtractionResult]:
        from banking.constants import infer_issuer

        extracted = extract_cc_payment(subject, body)
        if not extracted.has_data:
            return []

        issuer = infer_issuer(sender)

        return [
            ExtractionResult(
                data_type=DataType.CC_BILL,
                confidence=0.85,
                amount=extracted.amount,
                currency=extracted.currency,
                transaction_date=extracted.payment_date,
                merchant_or_provider=issuer,
                description=subject,
                extra={
                    "card_last4": extracted.card_last4,
                    "payment_amount": extracted.amount,
                    "payment_date": str(extracted.payment_date) if extracted.payment_date else None,
                    "issuer": issuer,
                    "is_payment": True,
                },
            )
        ]
