"""Parser for monthly CC statement emails (not transaction alerts).

Detects statement/bill emails, extracts bill summary from email body,
and if a PDF attachment is present, delegates to a bank-specific
CCStatementParser for line-item transactions.
"""
from __future__ import annotations

import logging
import re
from datetime import date, datetime

from banking.constants import CC_DOMAINS, infer_issuer
from banking.parsers.cc_base import CCStatementParser

from .base import DataType, ExtractionResult
from .credit_card import AMOUNT_RE, CARD_RE

logger = logging.getLogger(__name__)

# Subject patterns for statement emails (NOT transaction alerts)
_STATEMENT_SUBJECT_RE = re.compile(
    r"(statement|bill|amount\s+due|payment\s+due|monthly\s+summary)",
    re.IGNORECASE,
)

# Exclude transaction alert keywords
_ALERT_KEYWORDS = ["transaction", "spent", "debited", "purchase", "charged"]

_DUE_DATE_RE = re.compile(
    r"(?:due\s+(?:date|by|on))[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
    re.IGNORECASE,
)

_MIN_DUE_RE = re.compile(
    r"(?:minimum|min\.?\s+(?:amount\s+)?due)[:\s]*(?:₹|Rs\.?\s*|INR\s*)([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)

_TOTAL_DUE_RE = re.compile(
    r"(?:total\s+(?:amount\s+)?due|amount\s+payable|outstanding)[:\s]*(?:₹|Rs\.?\s*|INR\s*)([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)

# Password pattern — banks embed the PDF password in the email body
_PASSWORD_RE = re.compile(
    r"Password[:\s]+([A-Za-z0-9]{4,20})",
    re.IGNORECASE,
)

# Registry of bank-specific CC PDF parsers, keyed by issuer code
_CC_PDF_PARSERS: dict[str, CCStatementParser] = {}


def register_cc_pdf_parser(parser: CCStatementParser) -> None:
    _CC_PDF_PARSERS[parser.issuer] = parser


def _register_default_parsers() -> None:
    from banking.parsers.icici_cc import ICICICCStatementParser
    register_cc_pdf_parser(ICICICCStatementParser())


_register_default_parsers()


class CreditCardStatementParser:
    """Email parser for monthly CC statement/bill emails."""

    def __init__(self, password_fn: callable | None = None) -> None:
        # password_fn(issuer: str) -> str | None
        self._password_fn = password_fn

    def can_parse(self, sender: str, subject: str) -> bool:
        sender_lower = sender.lower()
        subject_lower = subject.lower()

        domain_match = any(domain in sender_lower for domain in CC_DOMAINS)
        statement_match = bool(_STATEMENT_SUBJECT_RE.search(subject_lower))
        is_alert = any(kw in subject_lower for kw in _ALERT_KEYWORDS)

        return domain_match and statement_match and not is_alert

    def parse(
        self,
        sender: str,
        subject: str,
        body: str,
        attachments: list[bytes] | None = None,
    ) -> list[ExtractionResult]:
        results: list[ExtractionResult] = []

        clean_text = re.sub(r"<[^>]+>", " ", f"{subject}\n{body}")
        clean_text = re.sub(r"\s+", " ", clean_text)

        card_last4 = self._extract_card_last4(clean_text)
        total_due = self._extract_total_due(clean_text)
        min_due = self._extract_min_due(clean_text)
        due_date = self._extract_due_date(clean_text)
        pdf_password = self._extract_password(clean_text)
        issuer = infer_issuer(sender)

        if total_due or card_last4:
            results.append(
                ExtractionResult(
                    data_type=DataType.CC_BILL,
                    confidence=0.8,
                    amount=total_due,
                    currency="INR",
                    transaction_date=due_date,
                    merchant_or_provider=issuer,
                    description=subject,
                    extra={
                        "card_last4": card_last4,
                        "total_due": total_due,
                        "min_due": min_due,
                        "due_date": str(due_date) if due_date else None,
                        "issuer": issuer,
                    },
                )
            )

        if attachments:
            pdf_parser = _CC_PDF_PARSERS.get(issuer)
            if pdf_parser:
                # Get password: try callback first, fall back to email-extracted
                password = None
                if self._password_fn:
                    password = self._password_fn(issuer)
                if not password:
                    password = pdf_password
                for pdf_bytes in attachments:
                    try:
                        for record in pdf_parser.parse(pdf_bytes, password=password):
                            results.append(
                                ExtractionResult(
                                    data_type=DataType.CC_TRANSACTION,
                                    confidence=0.9,
                                    amount=record.amount,
                                    currency="INR",
                                    transaction_date=record.transaction_date,
                                    merchant_or_provider=record.description,
                                    description=record.description,
                                    extra={
                                        "card_last4": card_last4,
                                        "source": "statement",
                                    },
                                )
                            )
                    except Exception as e:
                        logger.warning(f"Failed to parse CC statement PDF: {e}")

        return results

    # ── extraction helpers ───────────────────────────────────────────────

    @staticmethod
    def _extract_card_last4(text: str) -> str:
        match = CARD_RE.search(text)
        if match:
            return next((g for g in match.groups() if g), "")
        return ""

    @staticmethod
    def _extract_total_due(text: str) -> float | None:
        match = _TOTAL_DUE_RE.search(text)
        if not match:
            match = AMOUNT_RE.search(text)
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                pass
        return None

    @staticmethod
    def _extract_min_due(text: str) -> float | None:
        match = _MIN_DUE_RE.search(text)
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                pass
        return None

    @staticmethod
    def _extract_password(text: str) -> str | None:
        match = _PASSWORD_RE.search(text)
        if match:
            return match.group(1)
        return None

    @staticmethod
    def _extract_due_date(text: str) -> date | None:
        match = _DUE_DATE_RE.search(text)
        if match:
            for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"]:
                try:
                    return datetime.strptime(match.group(1), fmt).date()
                except ValueError:
                    continue
        return None
