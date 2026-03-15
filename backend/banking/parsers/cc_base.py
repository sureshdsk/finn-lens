"""Protocols and shared types for credit card statement parsers."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterator, Protocol


@dataclass
class CCTransactionRecord:
    transaction_date: date
    description: str
    amount: float  # positive = debit, negative = credit


class CCStatementParser(Protocol):
    """Protocol for bank-specific CC statement PDF parsers."""

    issuer: str

    def parse(self, pdf_bytes: bytes, password: str | None = None) -> Iterator[CCTransactionRecord]:
        """Parse a CC statement PDF and yield transaction records."""
        ...
