import hashlib
from dataclasses import dataclass
from decimal import Decimal
from datetime import date

from django.db import transaction as db_transaction

from .models import BankAccount, Family, Transaction
from .protocols import StatementParser


@dataclass
class TransactionFilters:
    year: int | None = None
    month: int | None = None
    txn_type: str | None = None  # 'debit' | 'credit'
    search: str | None = None
    page: int = 1
    page_size: int = 50


@dataclass
class MonthlySummary:
    year: int
    month: int
    total_debit: Decimal
    total_credit: Decimal
    net: Decimal


def get_accounts(family_id: int) -> list[BankAccount]:
    return list(BankAccount.objects.filter(family_id=family_id).order_by("created_at"))


def get_transactions(account_id: int, filters: TransactionFilters) -> tuple[list[Transaction], int]:
    qs = Transaction.objects.filter(account_id=account_id)

    if filters.year:
        qs = qs.filter(transaction_date__year=filters.year)
    if filters.month:
        qs = qs.filter(transaction_date__month=filters.month)
    if filters.txn_type == "debit":
        qs = qs.filter(debit__isnull=False)
    elif filters.txn_type == "credit":
        qs = qs.filter(credit__isnull=False)
    if filters.search:
        qs = qs.filter(description__icontains=filters.search)

    total = qs.count()
    offset = (filters.page - 1) * filters.page_size
    rows = list(qs[offset : offset + filters.page_size])
    return rows, total


def get_monthly_summary(family_id: int, year: int) -> list[MonthlySummary]:
    from django.db.models import Sum
    from django.db.models.functions import ExtractMonth, ExtractYear

    qs = (
        Transaction.objects.filter(account__family_id=family_id, transaction_date__year=year)
        .annotate(month=ExtractMonth("transaction_date"))
        .values("month")
        .annotate(total_debit=Sum("debit"), total_credit=Sum("credit"))
        .order_by("month")
    )

    result = []
    for row in qs:
        debit = row["total_debit"] or Decimal("0")
        credit = row["total_credit"] or Decimal("0")
        result.append(
            MonthlySummary(
                year=year,
                month=row["month"],
                total_debit=debit,
                total_credit=credit,
                net=credit - debit,
            )
        )
    return result


def import_statement(account: BankAccount, parser: StatementParser, file_bytes: bytes) -> int:
    meta, txn_iter = parser.parse(file_bytes)

    if meta.get("account_holder_name") and not account.account_holder_name:
        account.account_holder_name = meta["account_holder_name"]
    if meta.get("account_number") and not account.account_number:
        account.account_number = meta["account_number"]
    account.save(update_fields=["account_holder_name", "account_number"])

    count = 0
    with db_transaction.atomic():
        for rec in txn_iter:
            raw = _make_reference(rec)
            obj, created = Transaction.objects.get_or_create(
                account=account,
                raw_reference=raw,
                defaults={
                    "transaction_date": rec["transaction_date"],
                    "value_date": rec["value_date"],
                    "description": rec["description"],
                    "cheque_number": rec.get("cheque_number"),
                    "debit": rec.get("debit"),
                    "credit": rec.get("credit"),
                    "balance": rec["balance"],
                },
            )
            if created:
                count += 1
    return count


def _make_reference(rec: dict) -> str:
    key = f"{rec['transaction_date']}|{rec['value_date']}|{rec['description']}|{rec.get('debit')}|{rec.get('credit')}|{rec['balance']}"
    return hashlib.sha256(key.encode()).hexdigest()[:32]
