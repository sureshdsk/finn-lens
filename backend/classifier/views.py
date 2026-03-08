from django_bolt import ViewSet, Request, IsAuthenticated, JWTAuthentication
from django_bolt.exceptions import NotFound, BadRequest

from .api import api
from .serializers import ClassifyResultSchema, OverrideCategorySchema, CategorySchema
from .services import classify_account_transactions, override_transaction_category
from banking.models import BankAccount, Transaction

_auth = [JWTAuthentication()]
_guards = [IsAuthenticated]

CATEGORIES = [
    ("food", "Food"),
    ("groceries", "Groceries"),
    ("clothing", "Clothing"),
    ("entertainment", "Entertainment"),
    ("ecommerce", "E-commerce"),
    ("travel_transport", "Travel & Transport"),
    ("bills_utilities", "Bills & Utilities"),
    ("healthcare", "Healthcare"),
    ("education", "Education"),
    ("investment_finance", "Investment & Finance"),
    ("services_misc", "Services & Misc"),
    ("transfers_payments", "Transfers & Payments"),
    ("uncategorized", "Uncategorized"),
]


@api.viewset("/categories")
class CategoryListViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def list(self, request: Request):
        return [CategorySchema(slug=s, label=l) for s, l in CATEGORIES]


@api.viewset("/accounts/{id}/classify")
class ClassifyViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def create(self, request: Request, id: int):
        acc = await _assert_account_owner(id, int(request.context["user_id"]))
        total = await Transaction.objects.filter(account_id=acc.pk).acount()

        from asgiref.sync import sync_to_async
        classified = await sync_to_async(classify_account_transactions)(acc.pk)

        return ClassifyResultSchema(classified=classified, total=total, account_id=id)


@api.viewset("/transactions/{id}/category")
class TransactionCategoryViewSet(ViewSet):
    auth = _auth
    guards = _guards

    async def update(self, request: Request, id: int, data: OverrideCategorySchema):
        valid_slugs = [s for s, _ in CATEGORIES]
        if data.category not in valid_slugs:
            raise BadRequest(detail=f"Invalid category: {data.category}")

        from asgiref.sync import sync_to_async
        try:
            txn = await sync_to_async(override_transaction_category)(id, data.category)
        except Transaction.DoesNotExist:
            raise NotFound(detail="Transaction not found")

        return {"id": txn.pk, "category": txn.category, "is_user_categorized": True}


async def _assert_account_owner(account_id: int, user_id: int) -> BankAccount:
    from banking.models import Family
    try:
        acc = await BankAccount.objects.select_related("family").aget(pk=account_id)
    except BankAccount.DoesNotExist:
        raise NotFound(detail="Account not found")
    if acc.family.owner_id != user_id:
        raise NotFound(detail="Account not found")
    return acc
