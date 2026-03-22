"""Unified transaction creation and deduplication helpers."""
from __future__ import annotations

import hashlib
from decimal import Decimal

from django.db.models import Max

from .models import UnifiedTransaction, TransactionSource


def make_dedup_key(
    family_id: int, instrument_type: str, instrument_id: str | int, txn_date, amount
) -> str:
    amt = round(float(amount), 0)
    raw = f"{family_id}|{instrument_type}|{instrument_id}|{txn_date}|{amt}"
    return hashlib.sha256(raw.encode()).hexdigest()


SOURCE_PRIORITY = {
    "cc_statement_pdf": 100,
    "bank_statement": 90,
    "cc_alert_email": 50,
    "subscription_email": 40,
    "ecommerce_email": 40,
    "bill_email": 40,
    "manual": 30,
}


def get_or_create_unified(
    *,
    family,
    transaction_date,
    amount: Decimal,
    currency: str = "INR",
    merchant_name: str = "",
    description: str = "",
    category: str = "uncategorized",
    category_confidence: float = 0.0,
    is_user_categorized: bool = False,
    instrument_type: str = "unknown",
    bank_account=None,
    credit_card=None,
    dedup_key: str,
    source_type: str = "manual",
    source_bank_transaction=None,
    source_cc_transaction=None,
    source_extracted_data=None,
    source_email=None,
    raw_description: str = "",
    raw_amount: Decimal | None = None,
    raw_currency: str = "",
) -> tuple[UnifiedTransaction, bool]:
    """Get or create a UnifiedTransaction with a TransactionSource.

    If a unified transaction with the same dedup_key exists, adds a new source
    and upgrades canonical fields if the new source has higher priority.

    Returns (unified_transaction, created).
    """
    priority = SOURCE_PRIORITY.get(source_type, 30)

    ut, created = UnifiedTransaction.objects.get_or_create(
        dedup_key=dedup_key,
        defaults={
            "family": family,
            "transaction_date": transaction_date,
            "amount": amount,
            "currency": currency,
            "merchant_name": merchant_name,
            "description": description,
            "category": category,
            "category_confidence": category_confidence,
            "is_user_categorized": is_user_categorized,
            "instrument_type": instrument_type,
            "bank_account": bank_account,
            "credit_card": credit_card,
        },
    )

    if not created:
        # Upgrade canonical fields if new source has higher priority
        existing_max = ut.sources.aggregate(max_p=Max("priority"))["max_p"] or 0

        if priority > existing_max:
            if merchant_name:
                ut.merchant_name = merchant_name
            if description:
                ut.description = description
            if category != "uncategorized":
                ut.category = category
                ut.category_confidence = category_confidence
            ut.save(update_fields=[
                "merchant_name", "description", "category", "category_confidence", "updated_at"
            ])

    # Add source (idempotent per source_type + source FK)
    source_kwargs: dict = {
        "unified_transaction": ut,
        "source_type": source_type,
    }
    if source_cc_transaction:
        source_kwargs["cc_transaction"] = source_cc_transaction
    elif source_bank_transaction:
        source_kwargs["bank_transaction"] = source_bank_transaction

    TransactionSource.objects.get_or_create(
        **source_kwargs,
        defaults={
            "extracted_data": source_extracted_data,
            "email": source_email,
            "raw_description": raw_description or description,
            "raw_amount": raw_amount if raw_amount is not None else amount,
            "raw_currency": raw_currency or currency,
            "priority": priority,
        },
    )

    return ut, created
