from typing import Protocol, Iterator, TypedDict
from decimal import Decimal
from datetime import date


class TransactionRecord(TypedDict):
    transaction_date: date
    value_date: date
    description: str
    cheque_number: str | None
    debit: Decimal | None
    credit: Decimal | None
    balance: Decimal


class AccountMeta(TypedDict):
    account_holder_name: str
    account_number: str


class StatementParser(Protocol):
    bank_name: str

    def parse(self, file_bytes: bytes) -> tuple[AccountMeta, Iterator[TransactionRecord]]:
        """Returns (account_meta, transactions_iter)"""
        ...
