import hashlib
from dataclasses import dataclass
from decimal import Decimal
from datetime import date

from django.db import transaction as db_transaction

from .models import BankAccount, CreditCardBill, Family, Transaction
from .protocols import StatementParser
from .unified import get_or_create_unified, make_dedup_key


@dataclass
class TransactionFilters:
    year: int | None = None
    month: int | None = None
    txn_type: str | None = None  # 'debit' | 'credit'
    search: str | None = None
    category: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    sort: str = "-transaction_date"  # "transaction_date" or "-transaction_date"
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
    if filters.category:
        qs = qs.filter(category=filters.category)
    if filters.date_from:
        qs = qs.filter(transaction_date__gte=filters.date_from)
    if filters.date_to:
        qs = qs.filter(transaction_date__lte=filters.date_to)

    if filters.sort in ("transaction_date", "-transaction_date"):
        qs = qs.order_by(filters.sort, "created_at")
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
            pre_category = _classify_bank_description(
                rec["description"], is_debit=bool(rec.get("debit"))
            )
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
                    "category": pre_category,
                },
            )
            if created:
                count += 1
                # Create unified transaction
                amount = rec.get("debit") or rec.get("credit")
                if amount:
                    inst_type = "bank_debit" if rec.get("debit") else "bank_credit"
                    unified_key = make_dedup_key(
                        account.family_id, inst_type, account.pk,
                        rec["transaction_date"], amount,
                    )
                    ut, _ = get_or_create_unified(
                        family=account.family,
                        transaction_date=rec["transaction_date"],
                        amount=Decimal(str(amount)),
                        currency=account.currency,
                        description=rec["description"],
                        category=pre_category,
                        instrument_type=inst_type,
                        bank_account=account,
                        dedup_key=unified_key,
                        source_type="bank_statement",
                        source_bank_transaction=obj,
                    )
                    obj.unified_transaction = ut
                    obj.save(update_fields=["unified_transaction"])

    # Detect CC bill payments
    _link_cc_bill_payments(account)

    return count


def _link_cc_bill_payments(account: BankAccount) -> None:
    """Detect bank debits that are CC bill payments and link them.

    Matches by description patterns (CCPAY, credit card, card payment, ICICI/HDFC/Axis card)
    and also by exact amount matching against CC bills.
    """
    import re
    from datetime import timedelta

    cc_payment_re = re.compile(
        r"(?:cc\s*pay|credit\s*card|card\s*(?:bill|payment)|"
        r"ccpay|amex|visa|master\s*card|rupay|"
        r"icici\s*(?:bank\s*)?(?:card|cc)|"
        r"hdfc\s*(?:bank\s*)?(?:card|cc)|"
        r"axis\s*(?:bank\s*)?(?:card|cc)|"
        r"sbi\s*(?:card|cc)|"
        r"kotak\s*(?:card|cc))",
        re.IGNORECASE,
    )

    family = account.family
    bills_exist = CreditCardBill.objects.filter(card__family=family).exists()
    if not bills_exist:
        return

    debits = Transaction.objects.filter(
        account=account,
        debit__isnull=False,
    )

    for txn in debits:
        if not cc_payment_re.search(txn.description):
            continue
        if CreditCardBill.objects.filter(payment_bank_transaction=txn).exists():
            continue

        # Match by amount + date proximity (bill statement_date within 45 days before payment)
        bill = (
            CreditCardBill.objects.filter(
                card__family=family,
                total_due=txn.debit,
                statement_date__gte=txn.transaction_date - timedelta(days=45),
                statement_date__lte=txn.transaction_date,
                payment_bank_transaction__isnull=True,
            )
            .order_by("-statement_date")
            .first()
        )
        if bill:
            bill.payment_bank_transaction = txn
            bill.is_paid = True
            bill.save(update_fields=["payment_bank_transaction", "is_paid"])

            if txn.unified_transaction:
                txn.unified_transaction.category = "transfers_payments"
                txn.unified_transaction.save(update_fields=["category"])


def _classify_bank_description(description: str, is_debit: bool) -> str:
    """Rule-based pre-classification for bank statement descriptions."""
    import re
    desc = description.lower()

    # Transfers: IMPS, NEFT, RTGS to individuals
    if re.match(r"^(mmt/imps|neft|rtgs)", desc):
        return "transfers_payments"

    # CC bill payments
    if re.search(r"(cc\s*pay|credit\s*card|card\s*payment|ccpay)", desc):
        return "transfers_payments"

    # Investment: mutual fund, stock platforms
    if any(kw in desc for kw in ["bsestarmf", "groww", "zerodha", "kuvera", "mutual fund", "mf purchase"]):
        return "investment_finance"

    # Bills: BIL/BPAY, insurance, electricity, gas
    if desc.startswith("bil/") or any(kw in desc for kw in ["insurance", "lic", "electricity", "bescom", "gas"]):
        return "bills_utilities"

    # Large UPI transfers (>=5000) to personal handles are likely P2P
    if is_debit and re.search(r"upi/.+@", desc):
        # Known merchants stay uncategorized (for ML to handle)
        if any(kw in desc for kw in ["swiggy", "zomato", "amazon", "flipkart", "phonepe merchant"]):
            return "uncategorized"
        # Check if it looks like Razorpay/BSEStar investment
        if any(kw in desc for kw in ["razorpay", "bsestarmf", "groww"]):
            return "investment_finance"

    return "uncategorized"


def _make_reference(rec: dict) -> str:
    key = f"{rec['transaction_date']}|{rec['value_date']}|{rec['description']}|{rec.get('debit')}|{rec.get('credit')}|{rec['balance']}"
    return hashlib.sha256(key.encode()).hexdigest()[:32]
