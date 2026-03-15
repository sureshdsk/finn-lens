import msgspec
from typing import Optional


class CreateAccountSchema(msgspec.Struct):
    bank_name: str
    account_number: str = ""
    account_holder_name: str = ""
    currency: str = "INR"


class AccountSchema(msgspec.Struct):
    id: int
    bank_name: str
    account_number: str
    account_holder_name: str
    currency: str
    transaction_count: int


class TransactionSchema(msgspec.Struct):
    id: int
    transaction_date: str
    value_date: str
    description: str
    cheque_number: Optional[str]
    debit: Optional[str]
    credit: Optional[str]
    balance: str
    category: str = "uncategorized"
    category_confidence: float = 0.0
    merchant_name: str = ""
    payment_channel: str = ""
    recipient_name: str = ""
    upi_handle: str = ""
    is_user_categorized: bool = False


class TransactionListSchema(msgspec.Struct):
    items: list[TransactionSchema]
    total: int
    page: int
    page_size: int


class MonthlySummarySchema(msgspec.Struct):
    year: int
    month: int
    total_debit: str
    total_credit: str
    net: str


class UploadResultSchema(msgspec.Struct):
    imported: int
    classified: int
    account_id: int


# ── Credit Card schemas ──────────────────────────────────────────────────────


class CreateCardSchema(msgspec.Struct):
    issuer: str
    card_last4: str
    card_name: str = ""
    billing_day: Optional[int] = None
    credit_limit: Optional[str] = None
    currency: str = "INR"


class CardSchema(msgspec.Struct):
    id: int
    issuer: str
    card_last4: str
    card_name: str
    billing_day: Optional[int]
    credit_limit: Optional[str]
    currency: str
    transaction_count: int
    last_bill_total: Optional[str] = None
    last_bill_date: Optional[str] = None


class CreditCardBillSchema(msgspec.Struct):
    id: int
    statement_date: str
    due_date: Optional[str]
    total_due: Optional[str]
    min_due: Optional[str]
    billing_period_start: Optional[str]
    billing_period_end: Optional[str]
    is_paid: bool


class CreditCardTransactionSchema(msgspec.Struct):
    id: int
    transaction_date: str
    transaction_time: Optional[str]
    amount: str
    currency: str
    description: str
    merchant_name: str
    category: str
    category_confidence: float
    is_user_categorized: bool
    source_type: str


class CCTransactionListSchema(msgspec.Struct):
    items: list[CreditCardTransactionSchema]
    total: int
    page: int
    page_size: int


class MaterializeResultSchema(msgspec.Struct):
    cards: int
    bills: int
    transactions: int
