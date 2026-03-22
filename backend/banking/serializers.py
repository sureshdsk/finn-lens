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
    transaction_count: int = 0
    transactions_total: Optional[str] = None
    gmail_message_id: Optional[str] = None


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


# ── Subscription schemas ───────────────────────────────────────────────────


class SubscriptionSchema(msgspec.Struct):
    id: int
    name: str
    category: str
    cost: str
    currency: str
    cycle: str
    renew_date: Optional[str]
    status: str
    icon: str
    color: str
    description: str
    start_date: Optional[str]
    payment_method: str
    plan: str
    total_spent: Optional[str]
    last_billed: Optional[str]
    auto_renew: bool
    source: str
    confidence: float
    payment_count: int


class SubscriptionListSchema(msgspec.Struct):
    items: list[SubscriptionSchema]
    total: int


class SubscriptionUpdateSchema(msgspec.Struct):
    status: Optional[str] = None
    auto_renew: Optional[bool] = None
    category: Optional[str] = None
    name: Optional[str] = None


class SubscriptionDetectResultSchema(msgspec.Struct):
    detected: int
    created: int
    payments_linked: int


# ── Unified transaction schemas ──────────────────────────────────────────


class UnifiedTransactionSchema(msgspec.Struct):
    id: int
    transaction_date: str
    amount: str
    currency: str
    merchant_name: str
    description: str
    category: str
    category_confidence: float
    instrument_type: str
    source_count: int = 0
    credit_card_label: Optional[str] = None
    bank_account_label: Optional[str] = None


class UnifiedTransactionListSchema(msgspec.Struct):
    items: list[UnifiedTransactionSchema]
    total: int
    page: int
    page_size: int


class TransactionSourceSchema(msgspec.Struct):
    id: int
    source_type: str
    raw_description: str
    raw_amount: Optional[str]
    raw_currency: str
    priority: int
    email_subject: Optional[str] = None
    gmail_message_id: Optional[str] = None


class UnifiedTransactionDetailSchema(msgspec.Struct):
    id: int
    transaction_date: str
    amount: str
    currency: str
    merchant_name: str
    description: str
    category: str
    instrument_type: str
    credit_card_label: Optional[str]
    bank_account_label: Optional[str]
    sources: list[TransactionSourceSchema]


class CategoryBreakdownSchema(msgspec.Struct):
    category: str
    total: str
    count: int


class SpendingSummarySchema(msgspec.Struct):
    total_spending: str
    total_income: str
    transaction_count: int
    categories: list[CategoryBreakdownSchema]


class MonthlySpendingSchema(msgspec.Struct):
    year: int
    month: int
    month_label: str
    income: str
    expense: str
    savings: str
