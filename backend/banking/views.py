from typing import Annotated
from django_bolt import ViewSet, Request, IsAuthenticated, JWTAuthentication, UploadFile
from django_bolt.params import File
from django_bolt.exceptions import NotFound, BadRequest
from django.contrib.auth import get_user_model

from .api import api
from .models import BankAccount, Family
from .serializers import (
    AccountSchema,
    CreateAccountSchema,
    MonthlySummarySchema,
    TransactionListSchema,
    TransactionSchema,
    UploadResultSchema,
)
from .services import (
    TransactionFilters,
    get_accounts,
    get_monthly_summary,
    get_transactions,
    import_statement,
)
from .parsers.icici import ICICIParser
from .parsers.idfc import IDFCParser

User = get_user_model()

PARSERS = {
    "ICICI": ICICIParser(),
    "IDFC": IDFCParser(),
}

_auth = [JWTAuthentication()]
_guards = [IsAuthenticated]


async def _get_family(user_id: int) -> Family:
    try:
        return await Family.objects.aget(owner_id=user_id)
    except Family.DoesNotExist:
        raise NotFound(detail="No family found for this user. Run bootstrap_data first.")


@api.viewset("/accounts")
class AccountListViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/banking/accounts/ — list all accounts for the user's family"""
        family = await _get_family(int(request.context["user_id"]))
        accounts = await _run_sync(get_accounts, family.pk)

        result = []
        for acc in accounts:
            count = await acc.transactions.acount()
            result.append(
                AccountSchema(
                    id=acc.pk,
                    bank_name=acc.bank_name,
                    account_number=acc.account_number,
                    account_holder_name=acc.account_holder_name,
                    currency=acc.currency,
                    transaction_count=count,
                )
            )
        return result

    async def create(self, request: Request, data: CreateAccountSchema):
        """POST /api/banking/accounts/ — create a new bank account"""
        if data.bank_name not in ("ICICI", "IDFC", "OTHER"):
            raise BadRequest(detail="bank_name must be ICICI, IDFC, or OTHER")

        family = await _get_family(int(request.context["user_id"]))
        acc = await BankAccount.objects.acreate(
            family=family,
            bank_name=data.bank_name,
            account_number=data.account_number,
            account_holder_name=data.account_holder_name,
            currency=data.currency,
        )
        return AccountSchema(
            id=acc.pk,
            bank_name=acc.bank_name,
            account_number=acc.account_number,
            account_holder_name=acc.account_holder_name,
            currency=acc.currency,
            transaction_count=0,
        )


@api.viewset("/accounts/{id}/transactions")
class TransactionListViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request, id: int):
        """GET /api/banking/accounts/{id}/transactions/ — paginated transactions"""
        await _assert_account_owner(id, int(request.context["user_id"]))

        from datetime import date as date_type

        params = request.query
        date_from = None
        date_to = None
        if "date_from" in params:
            date_from = date_type.fromisoformat(params["date_from"])
        if "date_to" in params:
            date_to = date_type.fromisoformat(params["date_to"])

        filters = TransactionFilters(
            year=int(params["year"]) if "year" in params else None,
            month=int(params["month"]) if "month" in params else None,
            txn_type=params.get("type"),
            search=params.get("search"),
            category=params.get("category"),
            date_from=date_from,
            date_to=date_to,
            sort=params.get("sort", "-transaction_date"),
            page=int(params.get("page", 1)),
            page_size=int(params.get("page_size", 50)),
        )
        txns, total = await _run_sync(get_transactions, id, filters)

        items = [
            TransactionSchema(
                id=t.pk,
                transaction_date=str(t.transaction_date),
                value_date=str(t.value_date),
                description=t.description,
                cheque_number=t.cheque_number,
                debit=str(t.debit) if t.debit is not None else None,
                credit=str(t.credit) if t.credit is not None else None,
                balance=str(t.balance),
                category=t.category,
                category_confidence=t.category_confidence,
                merchant_name=t.merchant_name,
                payment_channel=t.payment_channel,
                recipient_name=t.recipient_name,
                upi_handle=t.upi_handle,
                is_user_categorized=t.is_user_categorized,
            )
            for t in txns
        ]
        return TransactionListSchema(
            items=items,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
        )


@api.viewset("/accounts/{id}/upload")
class UploadViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request, id: int, file: Annotated[UploadFile, File()]):
        """POST /api/banking/accounts/{id}/upload/ — upload statement file"""
        acc = await _assert_account_owner(id, int(request.context["user_id"]))

        parser = PARSERS.get(acc.bank_name)
        if parser is None:
            raise BadRequest(detail=f"No parser available for bank: {acc.bank_name}")

        file_bytes = await file.read()
        count = await _run_sync(import_statement, acc, parser, file_bytes)

        classified = 0
        if count > 0:
            from classifier.services import classify_account_transactions
            classified = await _run_sync(classify_account_transactions, acc.pk)

        return UploadResultSchema(imported=count, classified=classified, account_id=id)


@api.viewset("/summary")
class SummaryViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/banking/summary/?year=2025 — monthly summary for the family"""
        family = await _get_family(int(request.context["user_id"]))
        year = int(request.query.get("year", 2025))
        summaries = await _run_sync(get_monthly_summary, family.pk, year)
        return [
            MonthlySummarySchema(
                year=s.year,
                month=s.month,
                total_debit=str(s.total_debit),
                total_credit=str(s.total_credit),
                net=str(s.net),
            )
            for s in summaries
        ]


# ── helpers ──────────────────────────────────────────────────────────────────

async def _assert_account_owner(account_id: int, user_id: int) -> BankAccount:
    try:
        acc = await BankAccount.objects.select_related("family").aget(pk=account_id)
    except BankAccount.DoesNotExist:
        raise NotFound(detail="Account not found")
    if acc.family.owner_id != user_id:
        raise NotFound(detail="Account not found")
    return acc


async def _run_sync(fn, *args):
    from asgiref.sync import sync_to_async
    return await sync_to_async(fn)(*args)
