"""Materialization and classification services for credit card data."""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db import transaction as db_transaction

from .constants import infer_issuer
from .models import CreditCard, CreditCardBill, CreditCardTransaction, Family
from gmail.models import ExtractedFinancialData, GmailAccount

logger = logging.getLogger(__name__)


@dataclass
class MaterializeResult:
    cards: int = 0
    bills: int = 0
    transactions: int = 0

    def to_dict(self) -> dict[str, int]:
        return {"cards": self.cards, "bills": self.bills, "transactions": self.transactions}


class CCMaterializer:
    """Creates CreditCard, CreditCardBill, CreditCardTransaction from extracted email data."""

    def materialize(self, user_id: int) -> dict[str, int]:
        gmail_accounts = list(GmailAccount.objects.filter(user_id=user_id))
        if not gmail_accounts:
            return MaterializeResult().to_dict()

        try:
            family = Family.objects.get(owner_id=user_id)
        except Family.DoesNotExist:
            return MaterializeResult().to_dict()

        account_ids = [a.pk for a in gmail_accounts]
        extracted = ExtractedFinancialData.objects.filter(
            email__gmail_account_id__in=account_ids,
            data_type__in=["cc_transaction", "cc_bill"],
        ).select_related("email")

        result = MaterializeResult()

        with db_transaction.atomic():
            for record in extracted:
                data = record.data_json
                card_last4 = data.get("card_last4", "")
                if not card_last4 or len(card_last4) != 4:
                    continue

                issuer = data.get("issuer") or infer_issuer(record.email.sender)
                card, created = CreditCard.objects.get_or_create(
                    family=family,
                    issuer=issuer,
                    card_last4=card_last4,
                    defaults={"currency": data.get("currency", "INR")},
                )
                if created:
                    result.cards += 1

                if record.data_type == "cc_bill":
                    if self._materialize_bill(card, record, data):
                        result.bills += 1
                elif record.data_type == "cc_transaction":
                    if self._materialize_transaction(card, record, data):
                        result.transactions += 1

        logger.info(
            f"Materialized CC data for user {user_id}: "
            f"{result.cards} cards, {result.bills} bills, {result.transactions} txns"
        )
        return result.to_dict()

    def _materialize_bill(
        self, card: CreditCard, record: ExtractedFinancialData, data: dict
    ) -> bool:
        due_date = self._parse_date(data.get("due_date"))
        statement_date = due_date or (
            record.email.received_at.date() if record.email.received_at else None
        )
        if not statement_date:
            return False

        _, created = CreditCardBill.objects.get_or_create(
            card=card,
            statement_date=statement_date,
            defaults={
                "due_date": due_date,
                "total_due": Decimal(str(data["total_due"])) if data.get("total_due") else None,
                "min_due": Decimal(str(data["min_due"])) if data.get("min_due") else None,
                "source_email": record.email,
            },
        )
        return created

    def _materialize_transaction(
        self, card: CreditCard, record: ExtractedFinancialData, data: dict
    ) -> bool:
        amount = data.get("amount")
        if not amount:
            return False

        txn_date = self._parse_date(data.get("transaction_date"))
        if not txn_date:
            txn_date = record.email.received_at.date()

        merchant = data.get("merchant_or_provider", "")
        description = data.get("description", "") or merchant
        source = data.get("source", "alert")

        # Parse transaction time if available
        from datetime import time as time_type
        txn_time = None
        time_str = data.get("transaction_time", "")
        if time_str:
            try:
                parts = time_str.split(":")
                txn_time = time_type(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)
            except (ValueError, IndexError):
                pass

        dedup = self._make_dedup_hash(card.card_last4, txn_date, amount, merchant or description)

        _, created = CreditCardTransaction.objects.get_or_create(
            dedup_hash=dedup,
            defaults={
                "card": card,
                "transaction_date": txn_date,
                "transaction_time": txn_time,
                "amount": Decimal(str(amount)),
                "currency": data.get("currency", "INR"),
                "description": description,
                "merchant_name": merchant,
                "source_type": source if source in ("alert", "statement") else "alert",
            },
        )
        return created

    @staticmethod
    def _parse_date(val: str | None) -> date | None:
        if not val or val == "None":
            return None
        try:
            return date.fromisoformat(val)
        except ValueError:
            return None

    @staticmethod
    def _make_dedup_hash(card_last4: str, txn_date: date, amount: float, description: str) -> str:
        key = f"{card_last4}|{txn_date}|{amount:.2f}|{description[:10]}"
        return hashlib.sha256(key.encode()).hexdigest()


class CCClassifier:
    """Classifies uncategorized CC transactions using the same pipeline as bank transactions.

    Phase 1: merchant lookup (fast, pattern-based)
    Phase 2: ML pipeline (GLiNER entity extraction + GLiClass category classification)
    """

    def classify(self, card_id: int) -> int:
        txns = list(
            CreditCardTransaction.objects.filter(
                card_id=card_id,
                is_user_categorized=False,
                category="uncategorized",
            )
        )
        if not txns:
            return 0

        needs_ml = self._classify_by_merchant(txns)

        if needs_ml:
            self._classify_by_ml(needs_ml)

        CreditCardTransaction.objects.bulk_update(
            txns,
            fields=["category", "category_confidence", "merchant_name"],
        )

        classified_count = sum(1 for t in txns if t.category != "uncategorized")
        logger.info(f"Classified {classified_count}/{len(txns)} CC transactions for card {card_id}")
        return classified_count

    def _classify_by_merchant(
        self, txns: list[CreditCardTransaction]
    ) -> list[CreditCardTransaction]:
        from classifier.merchants.indian_merchants import lookup_merchant

        needs_ml: list[CreditCardTransaction] = []
        for txn in txns:
            # Try merchant_name first (already extracted from email), then description
            match = None
            if txn.merchant_name:
                match = lookup_merchant(txn.merchant_name)
            if not match:
                match = lookup_merchant(txn.description)

            if match:
                category, merchant_name, confidence = match
                txn.category = category
                txn.category_confidence = confidence
                # Only overwrite merchant_name if it was empty
                if not txn.merchant_name:
                    txn.merchant_name = merchant_name
            else:
                needs_ml.append(txn)
        return needs_ml

    def _classify_by_ml(self, txns: list[CreditCardTransaction]) -> None:
        from classifier.providers import get_extractor, get_classifier

        try:
            extractor = get_extractor()
            classifier = get_classifier()
        except Exception as e:
            logger.warning(f"Failed to load ML models: {e}")
            return

        descriptions = [t.description for t in txns]

        try:
            entities_list = extractor.extract_batch(descriptions)
        except Exception as e:
            logger.warning(f"GLiNER extraction failed: {e}")
            entities_list = [None] * len(txns)

        classify_items: list[tuple[str, str]] = []
        for txn, entities in zip(txns, entities_list):
            if entities and entities.merchant_name and not txn.merchant_name:
                txn.merchant_name = entities.merchant_name
            classify_items.append((txn.description, txn.merchant_name))

        try:
            classifications = classifier.classify_batch(classify_items)
            for txn, result in zip(txns, classifications):
                if result.confidence > 0.2:
                    txn.category = result.category
                    txn.category_confidence = result.confidence
        except Exception as e:
            logger.warning(f"GLiClass classification failed: {e}")


# ── Module-level aliases for backward compatibility ──────────────────────────


def materialize_cc_data(user_id: int) -> dict[str, int]:
    return CCMaterializer().materialize(user_id)


def classify_cc_transactions(card_id: int) -> int:
    return CCClassifier().classify(card_id)
