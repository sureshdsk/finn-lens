"""Parser for monthly CC statement emails (not transaction alerts).

Detects statement/bill emails, extracts bill summary using the standalone
email_extractor module, and if a PDF attachment is present, delegates to
OCR-based PDF parsing for line-item transactions.
"""
from __future__ import annotations

import logging
import re

from banking.constants import CC_DOMAINS, infer_issuer
from banking.email_extractor import extract_cc_statement

from .base import DataType, ExtractionResult

logger = logging.getLogger(__name__)

# Subject patterns for statement emails (NOT transaction alerts)
_STATEMENT_SUBJECT_RE = re.compile(
    r"(statement|bill|amount\s+due|payment\s+due|monthly\s+summary)",
    re.IGNORECASE,
)

# Exclude transaction alert keywords
_ALERT_KEYWORDS = ["transaction", "spent", "debited", "purchase", "charged"]

# Exclude bank account statement keywords (NOT credit card)
_BANK_STMT_RE = re.compile(
    r"(?:bank\s+statement\s+from|account\s+statement|savings\s+account|"
    r"current\s+account|e-?statement\s+from)",
    re.IGNORECASE,
)


class CreditCardStatementParser:
    """Email parser for monthly CC statement/bill emails."""

    def __init__(self, password_fn: callable | None = None) -> None:
        self._password_fn = password_fn

    def can_parse(self, sender: str, subject: str) -> bool:
        sender_lower = sender.lower()
        subject_lower = subject.lower()

        domain_match = any(domain in sender_lower for domain in CC_DOMAINS)
        statement_match = bool(_STATEMENT_SUBJECT_RE.search(subject_lower))
        is_alert = any(kw in subject_lower for kw in _ALERT_KEYWORDS)
        is_bank_stmt = bool(_BANK_STMT_RE.search(subject))

        return domain_match and statement_match and not is_alert and not is_bank_stmt

    def parse(
        self,
        sender: str,
        subject: str,
        body: str,
        attachments: list[bytes] | None = None,
    ) -> list[ExtractionResult]:
        results: list[ExtractionResult] = []

        extracted = extract_cc_statement(subject, body)
        issuer = infer_issuer(sender)

        if extracted.has_data:
            results.append(
                ExtractionResult(
                    data_type=DataType.CC_BILL,
                    confidence=0.8,
                    amount=extracted.total_due,
                    currency=extracted.currency,
                    transaction_date=extracted.due_date,
                    merchant_or_provider=issuer,
                    description=subject,
                    extra={
                        "card_last4": extracted.card_last4,
                        "total_due": extracted.total_due,
                        "min_due": extracted.min_due,
                        "due_date": str(extracted.due_date) if extracted.due_date else None,
                        "billing_period_start": str(extracted.billing_period_start) if extracted.billing_period_start else None,
                        "billing_period_end": str(extracted.billing_period_end) if extracted.billing_period_end else None,
                        "issuer": issuer,
                    },
                )
            )

        if attachments:
            from banking.parsers.cc_base import get_cc_parser
            pdf_parser = get_cc_parser(issuer)

            password = None
            if self._password_fn:
                password = self._password_fn(issuer)
            if not password:
                password = extracted.pdf_password

            for pdf_bytes in attachments:
                try:
                    records_list = list(pdf_parser.parse(pdf_bytes, password=password))

                    # Use card_last4 from PDF if available (more reliable than email body)
                    pdf_card_last4 = getattr(pdf_parser, "_last_card_last4", "") or extracted.card_last4

                    # Use bill metadata from PDF parser if available
                    bill_meta = getattr(pdf_parser, "_bill_meta", None)
                    if bill_meta and results:
                        bill_extra = results[0].extra
                        bill_extra["card_last4"] = pdf_card_last4
                        if bill_meta.total_due and not bill_extra.get("total_due"):
                            bill_extra["total_due"] = bill_meta.total_due
                            results[0].amount = bill_meta.total_due
                        if bill_meta.min_due and not bill_extra.get("min_due"):
                            bill_extra["min_due"] = bill_meta.min_due
                        if bill_meta.due_date and not bill_extra.get("due_date"):
                            bill_extra["due_date"] = str(bill_meta.due_date)
                            results[0].transaction_date = bill_meta.due_date
                        if bill_meta.billing_period_start and not bill_extra.get("billing_period_start"):
                            bill_extra["billing_period_start"] = str(bill_meta.billing_period_start)
                        if bill_meta.billing_period_end and not bill_extra.get("billing_period_end"):
                            bill_extra["billing_period_end"] = str(bill_meta.billing_period_end)
                    elif pdf_card_last4 and results:
                        results[0].extra["card_last4"] = pdf_card_last4

                    for record in records_list:
                        results.append(
                            ExtractionResult(
                                data_type=DataType.CC_TRANSACTION,
                                confidence=0.9,
                                amount=record.amount,
                                currency=extracted.currency,
                                transaction_date=record.transaction_date,
                                merchant_or_provider=record.description,
                                description=record.description,
                                extra={
                                    "card_last4": pdf_card_last4,
                                    "source": "statement",
                                },
                            )
                        )
                except Exception as e:
                    logger.warning(f"Failed to parse CC statement PDF: {e}")

        return results
