from typing import Annotated
from django_bolt import ViewSet, Request, IsAuthenticated, JWTAuthentication, UploadFile
from django_bolt.params import File
from django_bolt.exceptions import NotFound, BadRequest
from django.contrib.auth import get_user_model
from django.db import models

from .api import api
from .models import (
    BankAccount,
    CreditCard,
    CreditCardBill,
    CreditCardTransaction,
    Family,
    Subscription,
    SubscriptionPayment,
    UnifiedTransaction,
)
from .serializers import (
    AccountSchema,
    CardSchema,
    CategoryBreakdownSchema,
    CCTransactionListSchema,
    CreateAccountSchema,
    CreateCardSchema,
    CreditCardBillSchema,
    CreditCardTransactionSchema,
    MaterializeResultSchema,
    MonthlySummarySchema,
    MonthlySpendingSchema,
    SpendingSummarySchema,
    SubscriptionDetectResultSchema,
    SubscriptionListSchema,
    SubscriptionSchema,
    SubscriptionUpdateSchema,
    TransactionListSchema,
    TransactionSchema,
    TransactionSourceSchema,
    UnifiedTransactionDetailSchema,
    UnifiedTransactionListSchema,
    UnifiedTransactionSchema,
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
        raise NotFound(
            detail="No family found for this user. Run bootstrap_data first."
        )


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

    async def list(
        self,
        request: Request,
        id: int,
        page: int = 1,
        page_size: int = 50,
        year: int | None = None,
        month: int | None = None,
        type: str | None = None,
        search: str | None = None,
        category: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        sort: str = "-transaction_date",
    ):
        """GET /api/banking/accounts/{id}/transactions/ — paginated transactions"""
        await _assert_account_owner(id, int(request.context["user_id"]))

        from datetime import date as date_type

        filters = TransactionFilters(
            year=year,
            month=month,
            txn_type=type,
            search=search,
            category=category,
            date_from=date_type.fromisoformat(date_from) if date_from else None,
            date_to=date_type.fromisoformat(date_to) if date_to else None,
            sort=sort,
            page=page,
            page_size=page_size,
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

    async def create(
        self, request: Request, id: int, file: Annotated[UploadFile, File()]
    ):
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

    async def list(self, request: Request, year: int = 2025):
        """GET /api/banking/summary/?year=2025 — monthly summary for the family"""
        family = await _get_family(int(request.context["user_id"]))
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


# ── Credit Card ViewSets ─────────────────────────────────────────────────────


@api.viewset("/cards")
class CardListViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        """GET /api/banking/cards/ — list all CC cards for the user's family"""
        family = await _get_family(int(request.context["user_id"]))
        cards = [
            c
            async for c in CreditCard.objects.filter(family=family).order_by(
                "created_at"
            )
        ]

        result = []
        for card in cards:
            count = await card.transactions.acount()
            last_bill = await card.bills.order_by("-statement_date").afirst()
            result.append(
                CardSchema(
                    id=card.pk,
                    issuer=card.issuer,
                    card_last4=card.card_last4,
                    card_name=card.card_name,
                    billing_day=card.billing_day,
                    credit_limit=str(card.credit_limit) if card.credit_limit else None,
                    currency=card.currency,
                    transaction_count=count,
                    last_bill_total=str(last_bill.total_due)
                    if last_bill and last_bill.total_due
                    else None,
                    last_bill_date=str(last_bill.statement_date) if last_bill else None,
                )
            )
        return result

    async def create(self, request: Request, data: CreateCardSchema):
        """POST /api/banking/cards/ — manually add a credit card"""
        family = await _get_family(int(request.context["user_id"]))

        if len(data.card_last4) != 4 or not data.card_last4.isdigit():
            raise BadRequest(detail="card_last4 must be exactly 4 digits")

        from decimal import Decimal, InvalidOperation

        credit_limit = None
        if data.credit_limit:
            try:
                credit_limit = Decimal(data.credit_limit)
            except InvalidOperation:
                raise BadRequest(detail="Invalid credit_limit value")

        card = await CreditCard.objects.acreate(
            family=family,
            issuer=data.issuer,
            card_last4=data.card_last4,
            card_name=data.card_name,
            billing_day=data.billing_day,
            credit_limit=credit_limit,
            currency=data.currency,
        )
        return CardSchema(
            id=card.pk,
            issuer=card.issuer,
            card_last4=card.card_last4,
            card_name=card.card_name,
            billing_day=card.billing_day,
            credit_limit=str(card.credit_limit) if card.credit_limit else None,
            currency=card.currency,
            transaction_count=0,
        )


@api.viewset("/cards/{id}/bills")
class CardBillViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request, id: int):
        """GET /api/banking/cards/{id}/bills/ — bills for a card"""
        await _assert_card_owner(id, int(request.context["user_id"]))
        from django.db.models import Count, Sum

        bills = [
            CreditCardBillSchema(
                id=b.pk,
                statement_date=str(b.statement_date),
                due_date=str(b.due_date) if b.due_date else None,
                total_due=str(b.total_due) if b.total_due else None,
                min_due=str(b.min_due) if b.min_due else None,
                billing_period_start=str(b.billing_period_start)
                if b.billing_period_start
                else None,
                billing_period_end=str(b.billing_period_end)
                if b.billing_period_end
                else None,
                is_paid=b.is_paid,
                paid_date=(
                    str(b.payment_txn_date)
                    if getattr(b, "payment_txn_date", None)
                    else None
                ),
                transaction_count=b.txn_count,
                transactions_total=str(b.txn_total) if b.txn_total else None,
                gmail_message_id=b.source_email.message_id
                if b.source_email_id
                else None,
            )
            async for b in (
                CreditCardBill.objects.filter(card_id=id)
                .select_related("source_email", "payment_bank_transaction")
                .annotate(
                    txn_count=Count("transactions"),
                    txn_total=Sum(
                        "transactions__amount",
                        filter=models.Q(transactions__amount__gt=0),
                    ),
                    payment_txn_date=models.F(
                        "payment_bank_transaction__transaction_date"
                    ),
                )
                .order_by("-statement_date")
            )
        ]
        return bills


@api.viewset("/cards/{id}/transactions")
class CardTransactionViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(
        self,
        request: Request,
        id: int,
        page: int = 1,
        page_size: int = 50,
        bill_id: str | None = None,
        year: int | None = None,
        month: int | None = None,
        category: str | None = None,
        search: str | None = None,
        sort: str = "-transaction_date",
    ):
        """GET /api/banking/cards/{id}/transactions/ — paginated CC transactions"""
        await _assert_card_owner(id, int(request.context["user_id"]))

        qs = CreditCardTransaction.objects.filter(card_id=id)

        if bill_id is not None:
            if bill_id == "unbilled":
                latest_bill = await (
                    CreditCardBill.objects.filter(card_id=id)
                    .order_by("-billing_period_end")
                    .values_list("billing_period_end", flat=True)
                    .afirst()
                )
                qs = qs.filter(bill__isnull=True)
                if latest_bill:
                    qs = qs.filter(transaction_date__gt=latest_bill)
            else:
                qs = qs.filter(bill_id=int(bill_id))
        if year is not None:
            qs = qs.filter(transaction_date__year=year)
        if month is not None:
            qs = qs.filter(transaction_date__month=month)
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(description__icontains=search)

        if sort in ("transaction_date", "-transaction_date", "amount", "-amount"):
            qs = qs.order_by(sort)

        total = await qs.acount()
        offset = (page - 1) * page_size
        items = [
            CreditCardTransactionSchema(
                id=t.pk,
                transaction_date=str(t.transaction_date),
                transaction_time=str(t.transaction_time)
                if t.transaction_time
                else None,
                amount=str(t.amount),
                currency=t.currency,
                description=t.description,
                merchant_name=t.merchant_name,
                category=t.category,
                category_confidence=t.category_confidence,
                is_user_categorized=t.is_user_categorized,
                source_type=t.source_type,
            )
            async for t in qs[offset : offset + page_size]
        ]

        return CCTransactionListSchema(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )


@api.viewset("/cards/materialize")
class CardMaterializeViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request):
        """POST /api/banking/cards/materialize/ — materialize CC data from emails"""
        from .cc_services import materialize_cc_data

        user_id = int(request.context["user_id"])
        result = await _run_sync(materialize_cc_data, user_id)
        return MaterializeResultSchema(**result)


@api.viewset("/cards/{id}/classify")
class CardClassifyViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request, id: int):
        """POST /api/banking/cards/{id}/classify/ — classify uncategorized CC transactions"""
        await _assert_card_owner(id, int(request.context["user_id"]))
        from .cc_services import classify_cc_transactions

        classified = await _run_sync(classify_cc_transactions, id)
        return {"classified": classified}


# ── Subscription ViewSets ────────────────────────────────────────────────────


@api.viewset("/subscriptions")
class SubscriptionListViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(
        self, request: Request, status: str | None = None, category: str | None = None
    ):
        """GET /api/banking/subscriptions/ — list subscriptions"""
        family = await _get_family(int(request.context["user_id"]))

        qs = Subscription.objects.filter(family=family)
        if status:
            qs = qs.filter(status=status)
        if category:
            qs = qs.filter(category=category)

        total = await qs.acount()
        subs = [s async for s in qs]

        items = []
        for s in subs:
            payment_count = await s.payments.acount()
            from django.db.models import Sum

            agg = await s.payments.aaggregate(total=Sum("amount"))
            total_spent = agg["total"]

            items.append(
                SubscriptionSchema(
                    id=s.pk,
                    name=s.name,
                    category=s.category,
                    cost=str(s.cost),
                    currency=s.currency,
                    cycle=s.cycle,
                    renew_date=str(s.next_renewal_date)
                    if s.next_renewal_date
                    else None,
                    status=s.status,
                    icon=s.icon,
                    color=s.color,
                    description=s.description,
                    start_date=str(s.start_date) if s.start_date else None,
                    payment_method=s.payment_method,
                    plan=s.plan,
                    total_spent=str(total_spent) if total_spent else None,
                    last_billed=str(s.last_billed_date) if s.last_billed_date else None,
                    auto_renew=s.auto_renew,
                    source=s.source,
                    confidence=s.confidence,
                    payment_count=payment_count,
                )
            )
        return SubscriptionListSchema(items=items, total=total)


@api.viewset("/subscriptions/{id}")
class SubscriptionDetailViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def retrieve(self, request: Request, id: int):
        """GET /api/banking/subscriptions/{id}/ — detail with payments"""
        sub = await _assert_subscription_owner(id, int(request.context["user_id"]))
        payment_count = await sub.payments.acount()
        from django.db.models import Sum

        agg = await sub.payments.aaggregate(total=Sum("amount"))
        total_spent = agg["total"]

        return SubscriptionSchema(
            id=sub.pk,
            name=sub.name,
            category=sub.category,
            cost=str(sub.cost),
            currency=sub.currency,
            cycle=sub.cycle,
            renew_date=str(sub.next_renewal_date) if sub.next_renewal_date else None,
            status=sub.status,
            icon=sub.icon,
            color=sub.color,
            description=sub.description,
            start_date=str(sub.start_date) if sub.start_date else None,
            payment_method=sub.payment_method,
            plan=sub.plan,
            total_spent=str(total_spent) if total_spent else None,
            last_billed=str(sub.last_billed_date) if sub.last_billed_date else None,
            auto_renew=sub.auto_renew,
            source=sub.source,
            confidence=sub.confidence,
            payment_count=payment_count,
        )

    async def partial_update(
        self, request: Request, id: int, data: SubscriptionUpdateSchema
    ):
        """PATCH /api/banking/subscriptions/{id}/ — update status, auto_renew, etc."""
        sub = await _assert_subscription_owner(id, int(request.context["user_id"]))

        if data.status is not None:
            sub.status = data.status
        if data.auto_renew is not None:
            sub.auto_renew = data.auto_renew
        if data.category is not None:
            sub.category = data.category
        if data.name is not None:
            sub.name = data.name

        await sub.asave()

        payment_count = await sub.payments.acount()
        from django.db.models import Sum

        agg = await sub.payments.aaggregate(total=Sum("amount"))
        total_spent = agg["total"]

        return SubscriptionSchema(
            id=sub.pk,
            name=sub.name,
            category=sub.category,
            cost=str(sub.cost),
            currency=sub.currency,
            cycle=sub.cycle,
            renew_date=str(sub.next_renewal_date) if sub.next_renewal_date else None,
            status=sub.status,
            icon=sub.icon,
            color=sub.color,
            description=sub.description,
            start_date=str(sub.start_date) if sub.start_date else None,
            payment_method=sub.payment_method,
            plan=sub.plan,
            total_spent=str(total_spent) if total_spent else None,
            last_billed=str(sub.last_billed_date) if sub.last_billed_date else None,
            auto_renew=sub.auto_renew,
            source=sub.source,
            confidence=sub.confidence,
            payment_count=payment_count,
        )


@api.viewset("/subscriptions/detect")
class SubscriptionDetectViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request):
        """POST /api/banking/subscriptions/detect/ — run detection + materialization"""
        from .sub_services import materialize_subscriptions

        family = await _get_family(int(request.context["user_id"]))
        result = await _run_sync(materialize_subscriptions, family)
        return SubscriptionDetectResultSchema(**result)


# ── Unified Transaction ViewSets ──────────────────────────────────────────────


@api.viewset("/transactions/unified")
class UnifiedTransactionListViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(
        self,
        request: Request,
        page: int = 1,
        page_size: int = 50,
        instrument_type: str | None = None,
        category: str | None = None,
        year: int | None = None,
        month: int | None = None,
        search: str | None = None,
        exclude_transfers: str | None = None,
        sort: str = "-transaction_date",
    ):
        """GET /api/banking/transactions/unified/ — paginated unified transactions"""
        family = await _get_family(int(request.context["user_id"]))

        qs = UnifiedTransaction.objects.filter(family=family)

        if instrument_type:
            qs = qs.filter(instrument_type=instrument_type)
        if category:
            qs = qs.filter(category=category)
        if year is not None:
            qs = qs.filter(transaction_date__year=year)
        if month is not None:
            qs = qs.filter(transaction_date__month=month)
        if search:
            qs = qs.filter(
                models.Q(merchant_name__icontains=search)
                | models.Q(description__icontains=search)
            )
        if exclude_transfers == "true":
            qs = qs.exclude(category="transfers_payments")

        if sort in ("transaction_date", "-transaction_date", "amount", "-amount"):
            qs = qs.order_by(sort)

        total = await qs.acount()
        offset = (page - 1) * page_size

        from django.db.models import Count

        qs = qs.annotate(src_count=Count("sources"))

        items = [
            UnifiedTransactionSchema(
                id=t.pk,
                transaction_date=str(t.transaction_date),
                amount=str(t.amount),
                currency=t.currency,
                merchant_name=t.merchant_name,
                description=t.description[:200],
                category=t.category,
                category_confidence=t.category_confidence,
                instrument_type=t.instrument_type,
                source_count=t.src_count,
                credit_card_label=f"{t.credit_card.issuer} ••{t.credit_card.card_last4}"
                if t.credit_card_id
                else None,
                bank_account_label=f"{t.bank_account.bank_name}"
                if t.bank_account_id
                else None,
            )
            async for t in qs.select_related("credit_card", "bank_account")[
                offset : offset + page_size
            ]
        ]

        return UnifiedTransactionListSchema(
            items=items, total=total, page=page, page_size=page_size
        )


@api.viewset("/transactions/unified/{id}")
class UnifiedTransactionDetailViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def partial_update(self, request: Request, id: int):
        """PATCH /api/banking/transactions/unified/{id}/ — update category"""
        user_id = int(request.context["user_id"])
        try:
            ut = await UnifiedTransaction.objects.select_related("family").aget(pk=id)
        except UnifiedTransaction.DoesNotExist:
            raise NotFound(detail="Transaction not found")
        if ut.family.owner_id != user_id:
            raise NotFound(detail="Transaction not found")

        import msgspec

        body = msgspec.json.decode(await request.body)
        category = body.get("category")
        if not category:
            raise BadRequest(detail="category is required")

        # Update unified transaction
        ut.category = category
        ut.is_user_categorized = True
        ut.category_confidence = 1.0
        await ut.asave(
            update_fields=[
                "category",
                "is_user_categorized",
                "category_confidence",
                "updated_at",
            ]
        )

        # Propagate to source records
        from asgiref.sync import sync_to_async

        await sync_to_async(_propagate_category)(ut, category)

        return {"id": ut.pk, "category": ut.category}

    async def retrieve(self, request: Request, id: int):
        """GET /api/banking/transactions/unified/{id}/ — detail with sources"""
        user_id = int(request.context["user_id"])
        try:
            ut = await UnifiedTransaction.objects.select_related(
                "credit_card", "bank_account", "family"
            ).aget(pk=id)
        except UnifiedTransaction.DoesNotExist:
            raise NotFound(detail="Transaction not found")
        if ut.family.owner_id != user_id:
            raise NotFound(detail="Transaction not found")

        sources = [
            TransactionSourceSchema(
                id=s.pk,
                source_type=s.source_type,
                raw_description=s.raw_description,
                raw_amount=str(s.raw_amount) if s.raw_amount else None,
                raw_currency=s.raw_currency,
                priority=s.priority,
                email_subject=s.email.subject if s.email_id else None,
                gmail_message_id=s.email.message_id if s.email_id else None,
            )
            async for s in ut.sources.select_related("email").order_by("-priority")
        ]

        return UnifiedTransactionDetailSchema(
            id=ut.pk,
            transaction_date=str(ut.transaction_date),
            amount=str(ut.amount),
            currency=ut.currency,
            merchant_name=ut.merchant_name,
            description=ut.description,
            category=ut.category,
            instrument_type=ut.instrument_type,
            credit_card_label=f"{ut.credit_card.issuer} ••{ut.credit_card.card_last4}"
            if ut.credit_card_id
            else None,
            bank_account_label=f"{ut.bank_account.bank_name}"
            if ut.bank_account_id
            else None,
            sources=sources,
        )


@api.viewset("/spending/summary")
class SpendingSummaryViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(
        self, request: Request, year: int | None = None, month: int | None = None
    ):
        """GET /api/banking/spending/summary/ — spending summary with category breakdown"""
        family = await _get_family(int(request.context["user_id"]))

        from django.db.models import Sum, Count

        qs = UnifiedTransaction.objects.filter(
            family=family,
            instrument_type__in=["credit_card", "bank_debit"],
        ).exclude(category="transfers_payments")

        if year is not None:
            qs = qs.filter(transaction_date__year=year)
        if month is not None:
            qs = qs.filter(transaction_date__month=month)

        # Total spending
        agg = await qs.filter(amount__gt=0).aaggregate(
            total=Sum("amount"), count=Count("id")
        )
        total_spending = agg["total"] or 0
        txn_count = agg["count"] or 0

        # Total income
        income_qs = UnifiedTransaction.objects.filter(
            family=family,
            instrument_type="bank_credit",
        )
        if year is not None:
            income_qs = income_qs.filter(transaction_date__year=year)
        if month is not None:
            income_qs = income_qs.filter(transaction_date__month=month)
        income_agg = await income_qs.aaggregate(total=Sum("amount"))
        total_income = income_agg["total"] or 0

        # Category breakdown
        cats = [
            CategoryBreakdownSchema(
                category=row["category"],
                total=str(row["cat_total"]),
                count=row["cat_count"],
            )
            async for row in qs.filter(amount__gt=0)
            .values("category")
            .annotate(cat_total=Sum("amount"), cat_count=Count("id"))
            .order_by("-cat_total")
        ]

        return SpendingSummarySchema(
            total_spending=str(total_spending),
            total_income=str(total_income),
            transaction_count=txn_count,
            categories=cats,
        )


@api.viewset("/spending/monthly")
class MonthlySpendingViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request, year: int | None = None):
        """GET /api/banking/spending/monthly/ — monthly income/expense/savings breakdown"""
        family = await _get_family(int(request.context["user_id"]))

        from django.db.models import Sum
        from django.db.models.functions import ExtractMonth, ExtractYear

        MONTH_LABELS = [
            "",
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]

        # Expense by month (CC + bank debits, excl transfers)
        expense_qs = UnifiedTransaction.objects.filter(
            family=family,
            instrument_type__in=["credit_card", "bank_debit"],
            amount__gt=0,
        ).exclude(category="transfers_payments")
        if year is not None:
            expense_qs = expense_qs.filter(transaction_date__year=year)

        expense_by_month = {
            (r["y"], r["m"]): r["total"]
            async for r in expense_qs.annotate(
                y=ExtractYear("transaction_date"), m=ExtractMonth("transaction_date")
            )
            .values("y", "m")
            .annotate(total=Sum("amount"))
            .order_by("y", "m")
        }

        # Income by month
        income_qs = UnifiedTransaction.objects.filter(
            family=family,
            instrument_type="bank_credit",
        )
        if year is not None:
            income_qs = income_qs.filter(transaction_date__year=year)

        income_by_month = {
            (r["y"], r["m"]): r["total"]
            async for r in income_qs.annotate(
                y=ExtractYear("transaction_date"), m=ExtractMonth("transaction_date")
            )
            .values("y", "m")
            .annotate(total=Sum("amount"))
            .order_by("y", "m")
        }

        all_months = sorted(set(expense_by_month.keys()) | set(income_by_month.keys()))

        result = []
        for y, m in all_months:
            expense = expense_by_month.get((y, m), 0) or 0
            income = income_by_month.get((y, m), 0) or 0
            savings = income - expense
            result.append(
                MonthlySpendingSchema(
                    year=y,
                    month=m,
                    month_label=f"{MONTH_LABELS[m]} {y}",
                    income=str(income),
                    expense=str(expense),
                    savings=str(savings),
                )
            )

        return result


# ── helpers ──────────────────────────────────────────────────────────────────


def _propagate_category(ut: UnifiedTransaction, category: str) -> None:
    """Sync category from UnifiedTransaction to all source records."""
    from .models import TransactionSource

    for src in TransactionSource.objects.filter(unified_transaction=ut).select_related(
        "cc_transaction", "bank_transaction"
    ):
        if src.cc_transaction:
            src.cc_transaction.category = category
            src.cc_transaction.is_user_categorized = True
            src.cc_transaction.category_confidence = 1.0
            src.cc_transaction.save(
                update_fields=["category", "is_user_categorized", "category_confidence"]
            )
        if src.bank_transaction:
            src.bank_transaction.category = category
            src.bank_transaction.is_user_categorized = True
            src.bank_transaction.category_confidence = 1.0
            src.bank_transaction.save(
                update_fields=["category", "is_user_categorized", "category_confidence"]
            )


async def _assert_account_owner(account_id: int, user_id: int) -> BankAccount:
    try:
        acc = await BankAccount.objects.select_related("family").aget(pk=account_id)
    except BankAccount.DoesNotExist:
        raise NotFound(detail="Account not found")
    if acc.family.owner_id != user_id:
        raise NotFound(detail="Account not found")
    return acc


async def _assert_card_owner(card_id: int, user_id: int) -> CreditCard:
    try:
        card = await CreditCard.objects.select_related("family").aget(pk=card_id)
    except CreditCard.DoesNotExist:
        raise NotFound(detail="Card not found")
    if card.family.owner_id != user_id:
        raise NotFound(detail="Card not found")
    return card


async def _assert_subscription_owner(sub_id: int, user_id: int) -> Subscription:
    try:
        sub = await Subscription.objects.select_related("family").aget(pk=sub_id)
    except Subscription.DoesNotExist:
        raise NotFound(detail="Subscription not found")
    if sub.family.owner_id != user_id:
        raise NotFound(detail="Subscription not found")
    return sub


async def _run_sync(fn, *args):
    from asgiref.sync import sync_to_async

    return await sync_to_async(fn)(*args)
