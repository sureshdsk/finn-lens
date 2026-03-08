import logging

from banking.models import Transaction
from .extractors.regex_extractor import extract_regex
from .merchants.indian_merchants import lookup_merchant
from .models import UserCategoryOverride
from .providers import get_extractor, get_classifier

logger = logging.getLogger(__name__)


def classify_account_transactions(account_id: int) -> int:
    txns = list(
        Transaction.objects.filter(
            account_id=account_id,
            is_user_categorized=False,
            category="uncategorized",
        )
    )
    if not txns:
        return 0

    # Phase 1: regex + merchant lookup (fast path)
    needs_ml: list[Transaction] = []

    for txn in txns:
        regex_result = extract_regex(txn.description)
        txn.payment_channel = regex_result.payment_channel
        txn.upi_handle = regex_result.upi_handle

        merchant_match = lookup_merchant(txn.description)
        if merchant_match:
            category, merchant_name, confidence = merchant_match
            txn.category = category
            txn.merchant_name = merchant_name
            txn.category_confidence = confidence
        else:
            # Check user override history for same description pattern
            override = _find_user_override(txn.description)
            if override:
                txn.category = override
                txn.category_confidence = 0.95
            else:
                needs_ml.append(txn)

    # Phase 2: ML pipeline for remaining
    if needs_ml:
        _run_ml_pipeline(needs_ml)

    # Bulk save
    Transaction.objects.bulk_update(
        txns,
        fields=[
            "category", "category_confidence", "merchant_name",
            "payment_channel", "recipient_name", "upi_handle",
        ],
    )

    classified_count = sum(1 for t in txns if t.category != "uncategorized")
    logger.info(f"Classified {classified_count}/{len(txns)} transactions for account {account_id}")
    return classified_count


def _find_user_override(description: str) -> str | None:
    desc_lower = description.lower()
    overrides = UserCategoryOverride.objects.select_related("transaction").order_by("-created_at")[:100]
    for ov in overrides:
        if ov.transaction.description.lower()[:30] == desc_lower[:30]:
            return ov.new_category
    return None


def _run_ml_pipeline(txns: list[Transaction]) -> None:
    try:
        extractor = get_extractor()
        classifier = get_classifier()
    except Exception as e:
        logger.warning(f"Failed to load ML models: {e}. Skipping ML classification.")
        return

    descriptions = [t.description for t in txns]

    try:
        entities_list = extractor.extract_batch(descriptions)
    except Exception as e:
        logger.warning(f"GLiNER extraction failed: {e}")
        entities_list = [None] * len(txns)

    classify_items = []
    for txn, entities in zip(txns, entities_list):
        if entities:
            if entities.merchant_name and not txn.merchant_name:
                txn.merchant_name = entities.merchant_name
            if entities.recipient_name and not txn.recipient_name:
                txn.recipient_name = entities.recipient_name
        classify_items.append((txn.description, txn.merchant_name))

    try:
        classifications = classifier.classify_batch(classify_items)
        for txn, result in zip(txns, classifications):
            if result.confidence > 0.2:
                txn.category = result.category
                txn.category_confidence = result.confidence
    except Exception as e:
        logger.warning(f"GLiClass classification failed: {e}")


def override_transaction_category(transaction_id: int, new_category: str) -> Transaction:
    txn = Transaction.objects.get(pk=transaction_id)
    UserCategoryOverride.objects.create(
        transaction=txn,
        original_category=txn.category,
        new_category=new_category,
    )
    txn.category = new_category
    txn.is_user_categorized = True
    txn.category_confidence = 1.0
    txn.save(update_fields=["category", "is_user_categorized", "category_confidence"])
    return txn
