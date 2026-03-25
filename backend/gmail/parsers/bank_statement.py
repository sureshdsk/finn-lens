"""Bank account e-statement email parser.

Detects monthly bank statement emails (e.g. from estatement@icicibank.com),
extracts the attached PDF, parses transactions using the bank PDF parser
registry, and returns ExtractionResults with DataType.BANK_STATEMENT.

The parsed transactions are stored in extra["transactions"] as a list of dicts,
along with account metadata and statement period. The materializer then
creates BankAccount + Transaction records from this data.
"""

from __future__ import annotations

import logging
import re
from typing import Callable

from banking.parsers.bank_pdf_base import get_bank_pdf_parser

from .base import DataType, ExtractionResult

logger = logging.getLogger(__name__)

# Sender → bank code mapping for e-statement emails
_STATEMENT_SENDERS: dict[str, str] = {
    "estatement@icicibank.com": "ICICI",
    # Add more banks here:
    # "estatement@idfcfirstbank.com": "IDFC",
}

# Subject keywords that indicate a bank account statement (not CC statement)
_STATEMENT_SUBJECT_KW = [
    "statement",
    "account statement",
    "e-statement",
    "estatement",
]

# Subject keywords that indicate this is a CC statement, NOT a bank statement
_CC_SUBJECT_KW = [
    "credit card",
    "card statement",
]


class BankStatementParser:
    """Parse bank account e-statement emails with PDF attachments."""

    _password_fn: Callable[[str], str | None] | None = None

    def can_parse(self, sender: str, subject: str) -> bool:
        sender_email = _extract_email(sender)
        if sender_email not in _STATEMENT_SENDERS:
            return False

        subject_lower = subject.lower()

        # Reject CC statements — those are handled by CreditCardStatementParser
        if any(kw in subject_lower for kw in _CC_SUBJECT_KW):
            return False

        # Accept if subject mentions statement
        return any(kw in subject_lower for kw in _STATEMENT_SUBJECT_KW)

    def parse(
        self,
        sender: str,
        subject: str,
        body: str,
        attachments: list[bytes] | None = None,
    ) -> list[ExtractionResult]:
        if not attachments:
            return []

        sender_email = _extract_email(sender)
        bank_code = _STATEMENT_SENDERS.get(sender_email)
        if not bank_code:
            return []

        parser = get_bank_pdf_parser(bank_code)
        if not parser:
            logger.warning(f"No bank PDF parser for {bank_code}")
            return []

        # Try each attachment (find the first valid PDF)
        for pdf_bytes in attachments:
            result = self._try_parse_pdf(parser, bank_code, pdf_bytes)
            if result:
                return result

        return []

    def _try_parse_pdf(
        self, parser, bank_code: str, pdf_bytes: bytes
    ) -> list[ExtractionResult] | None:
        # Get password if available
        password = None
        if self._password_fn:
            password = self._password_fn(bank_code)

        try:
            meta, transactions, period = parser.parse(pdf_bytes, password)
        except Exception as e:
            logger.warning(f"Bank PDF parse failed for {bank_code}: {e}")
            return None

        if not transactions:
            return None

        # Serialize transactions for storage in ExtractedFinancialData.data_json
        txn_dicts = []
        for t in transactions:
            txn_dicts.append({
                "transaction_date": str(t["transaction_date"]),
                "value_date": str(t["value_date"]),
                "description": t["description"],
                "cheque_number": t.get("cheque_number"),
                "debit": float(t["debit"]) if t.get("debit") else None,
                "credit": float(t["credit"]) if t.get("credit") else None,
                "balance": float(t["balance"]),
            })

        return [
            ExtractionResult(
                data_type=DataType.BANK_STATEMENT,
                confidence=0.95,
                description=f"{bank_code} bank statement ({len(transactions)} transactions)",
                extra={
                    "bank_code": bank_code,
                    "account_holder_name": meta.get("account_holder_name", ""),
                    "account_number": meta.get("account_number", ""),
                    "period_start": str(period.start) if period.start else None,
                    "period_end": str(period.end) if period.end else None,
                    "transaction_count": len(transactions),
                    "transactions": txn_dicts,
                },
            )
        ]


def _extract_email(sender: str) -> str:
    """Extract email from 'Name <email>' format."""
    m = re.search(r"<([^>]+)>", sender)
    if m:
        return m.group(1).lower()
    return sender.strip().lower()
