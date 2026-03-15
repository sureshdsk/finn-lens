from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Protocol


class DataType(str, Enum):
    CC_TRANSACTION = "cc_transaction"
    CC_BILL = "cc_bill"
    SUBSCRIPTION_RENEWAL = "subscription_renewal"
    INVESTMENT_UPDATE = "investment_update"
    BILL_NOTICE = "bill_notice"
    ORDER_CONFIRMATION = "order_confirmation"
    DELIVERY_UPDATE = "delivery_update"


class SourceType(str, Enum):
    CREDIT_CARD = "credit_card"
    SUBSCRIPTION = "subscription"
    INVESTMENT = "investment"
    BILL = "bill"
    ECOMMERCE = "ecommerce"
    BANK = "bank"
    UNKNOWN = "unknown"


@dataclass
class ExtractionResult:
    """Common output from all parsers. Stored as ExtractedFinancialData."""
    data_type: DataType
    confidence: float  # 0.0 - 1.0

    amount: float | None = None
    currency: str = "INR"
    transaction_date: date | None = None
    merchant_or_provider: str = ""
    description: str = ""

    extra: dict = field(default_factory=dict)

    def to_json(self) -> dict:
        return {
            "data_type": self.data_type.value,
            "amount": self.amount,
            "currency": self.currency,
            "transaction_date": str(self.transaction_date) if self.transaction_date else None,
            "merchant_or_provider": self.merchant_or_provider,
            "description": self.description,
            **self.extra,
        }


class BaseEmailParser(Protocol):
    def can_parse(self, sender: str, subject: str) -> bool: ...
    def parse(self, sender: str, subject: str, body: str, attachments: list[bytes] | None = None) -> list[ExtractionResult]: ...
