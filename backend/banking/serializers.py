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
    account_id: int
