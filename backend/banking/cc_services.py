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
from .unified import get_or_create_unified, make_dedup_key
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
            is_materialized=False,
        ).select_related("email")

        result = MaterializeResult()

        # Split into bills/transactions first, payments second.
        # Payment emails often arrive before statement emails,
        # so we must create bills before trying to mark them paid.
        records = list(extracted)
        non_payments = [r for r in records if not (r.data_type == "cc_bill" and r.data_json.get("is_payment"))]
        payments = [r for r in records if r.data_type == "cc_bill" and r.data_json.get("is_payment")]

        with db_transaction.atomic():
            # Pass 1: materialize cards, bills, transactions
            for record in non_payments:
                data = record.data_json
                card_last4 = data.get("card_last4", "")
                if not card_last4 or len(card_last4) != 4:
                    record.is_materialized = True
                    record.save(update_fields=["is_materialized"])
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

                record.is_materialized = True
                record.save(update_fields=["is_materialized"])

            # Pass 2: apply payment confirmations (bills now exist)
            for record in payments:
                data = record.data_json
                card_last4 = data.get("card_last4", "")
                if not card_last4 or len(card_last4) != 4:
                    record.is_materialized = True
                    record.save(update_fields=["is_materialized"])
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

                self._mark_bill_paid(card, data)
                record.is_materialized = True
                record.save(update_fields=["is_materialized"])

        self._link_transactions_to_bills(family)
        self._detect_payments_from_transactions(family)

        logger.info(
            f"Materialized CC data for user {user_id}: "
            f"{result.cards} cards, {result.bills} bills, {result.transactions} txns"
        )
        return result.to_dict()

    @staticmethod
    def _link_transactions_to_bills(family: Family) -> None:
        """Link transactions to bills using billing period windows.

        Uses billing_period_start/end from email extraction when available,
        falls back to deriving windows from consecutive statement dates.
        """
        from datetime import timedelta

        cards = CreditCard.objects.filter(family=family)
        for card in cards:
            bills = list(
                CreditCardBill.objects.filter(card=card).order_by("statement_date")
            )
            if not bills:
                continue

            # Build billing windows using actual billing_period fields
            windows: list[tuple[date, date, CreditCardBill]] = []
            for i, bill in enumerate(bills):
                if bill.billing_period_start and bill.billing_period_end:
                    windows.append((bill.billing_period_start, bill.billing_period_end, bill))
                else:
                    # Fallback: derive from consecutive statement dates
                    if i == 0:
                        start = bill.statement_date - timedelta(days=30)
                    else:
                        prev_end = bills[i - 1].billing_period_end or bills[i - 1].statement_date
                        start = prev_end + timedelta(days=1)
                    end = bill.statement_date
                    bill.billing_period_start = start
                    bill.billing_period_end = end
                    bill.save(update_fields=["billing_period_start", "billing_period_end"])
                    windows.append((start, end, bill))

            # Link ALL unlinked transactions
            unlinked = list(CreditCardTransaction.objects.filter(
                card=card, bill__isnull=True
            ))
            if not unlinked:
                continue

            earliest_bill = windows[0][2] if windows else None
            latest_bill = windows[-1] if windows else None

            to_update: list[CreditCardTransaction] = []
            for txn in unlinked:
                matched = False
                for window_start, window_end, bill in windows:
                    if window_start <= txn.transaction_date <= window_end:
                        txn.bill = bill
                        to_update.append(txn)
                        matched = True
                        break

                if not matched and earliest_bill:
                    # Transactions before earliest bill → assign to earliest
                    if txn.transaction_date < windows[0][0]:
                        txn.bill = earliest_bill
                        to_update.append(txn)
                    # Transactions after latest bill → leave unbilled (current cycle)

            if to_update:
                CreditCardTransaction.objects.bulk_update(to_update, ["bill"])

    @staticmethod
    def _mark_bill_paid(card: CreditCard, data: dict) -> None:
        """Mark a bill as paid based on payment received email."""
        from datetime import timedelta

        payment_amount = data.get("payment_amount")
        payment_date_str = data.get("payment_date")
        if not payment_amount or not payment_date_str:
            return

        payment_date = CCMaterializer._parse_date(payment_date_str)
        if not payment_date:
            return

        # Find the most recent unpaid bill for this card
        # Match by billing_period_end (statement closing date) before payment date
        bill = (
            CreditCardBill.objects.filter(
                card=card,
                is_paid=False,
                billing_period_end__lte=payment_date,
                billing_period_end__gte=payment_date - timedelta(days=60),
            )
            .order_by("-billing_period_end")
            .first()
        )
        # Fallback: match by total_due amount
        if not bill:
            bill = (
                CreditCardBill.objects.filter(
                    card=card,
                    is_paid=False,
                    total_due=Decimal(str(payment_amount)),
                )
                .order_by("-statement_date")
                .first()
            )

        if bill:
            bill.is_paid = True
            bill.save(update_fields=["is_paid"])
            logger.info(
                f"Marked bill {bill.card} {bill.statement_date} as paid "
                f"(payment: {payment_amount} on {payment_date})"
            )

    @staticmethod
    def _detect_payments_from_transactions(family: Family) -> None:
        """Mark bills as paid by detecting payment transactions (BBPS, payment received, etc.)
        within the statement data itself.

        A BBPS/payment transaction in a bill means the PREVIOUS bill was paid.
        """
        import re
        payment_re = re.compile(
            r"(?:bbps\s+payment|payment\s+received|payment\s+credited|bill\s+payment)",
            re.IGNORECASE,
        )

        cards = CreditCard.objects.filter(family=family)
        for card in cards:
            bills = list(CreditCardBill.objects.filter(card=card).order_by("billing_period_start"))
            if len(bills) < 2:
                continue

            for i, bill in enumerate(bills):
                if bill.is_paid:
                    continue

                # Check if a payment transaction exists in any LATER bill
                payment_txn = CreditCardTransaction.objects.filter(
                    card=card,
                    amount__lt=0,  # credits are negative
                    bill__in=bills[i + 1:] if i + 1 < len(bills) else [],
                ).filter(
                    description__iregex=r"(?i)(bbps|payment received|payment credited)",
                ).first()

                if payment_txn:
                    bill.is_paid = True
                    bill.save(update_fields=["is_paid"])

    def _materialize_bill(
        self, card: CreditCard, record: ExtractedFinancialData, data: dict
    ) -> bool:
        due_date = self._parse_date(data.get("due_date"))
        statement_date = due_date or (
            record.email.received_at.date() if record.email.received_at else None
        )
        if not statement_date:
            return False

        bill, created = CreditCardBill.objects.get_or_create(
            card=card,
            statement_date=statement_date,
            defaults={
                "due_date": due_date,
                "total_due": Decimal(str(data["total_due"])) if data.get("total_due") else None,
                "min_due": Decimal(str(data["min_due"])) if data.get("min_due") else None,
                "billing_period_start": self._parse_date(data.get("billing_period_start")),
                "billing_period_end": self._parse_date(data.get("billing_period_end")),
                "source_email": record.email,
            },
        )
        if not created:
            # Update fields that may have been missing on first materialize
            updated = False
            if data.get("total_due") and not bill.total_due:
                bill.total_due = Decimal(str(data["total_due"]))
                updated = True
            if data.get("min_due") and not bill.min_due:
                bill.min_due = Decimal(str(data["min_due"]))
                updated = True
            if data.get("due_date") and not bill.due_date:
                bill.due_date = due_date
                updated = True
            if data.get("billing_period_start") and not bill.billing_period_start:
                bill.billing_period_start = self._parse_date(data["billing_period_start"])
                updated = True
            if data.get("billing_period_end") and not bill.billing_period_end:
                bill.billing_period_end = self._parse_date(data["billing_period_end"])
                updated = True
            if updated:
                bill.save()
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
        is_statement = source == "statement"

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

        dedup = self._make_dedup_hash(card.card_last4, txn_date, amount)

        # Check for existing transaction with same card/date/amount
        existing = CreditCardTransaction.objects.filter(
            card=card,
            transaction_date=txn_date,
            amount=Decimal(str(amount)),
        ).first()

        if existing:
            # Statement data is higher quality — update if existing was from alert
            if is_statement and existing.source_type == "alert":
                existing.description = description
                existing.merchant_name = merchant
                existing.source_type = "statement"
                existing.dedup_hash = dedup
                existing.save(update_fields=["description", "merchant_name", "source_type", "dedup_hash"])

            # Add source to unified transaction even if CC txn already existed
            if existing.unified_transaction:
                source_type = "cc_statement_pdf" if is_statement else "cc_alert_email"
                from .models import TransactionSource
                TransactionSource.objects.get_or_create(
                    unified_transaction=existing.unified_transaction,
                    source_type=source_type,
                    cc_transaction=existing,
                    defaults={
                        "raw_description": description,
                        "raw_amount": Decimal(str(amount)),
                        "raw_currency": data.get("currency", "INR"),
                        "priority": 100 if is_statement else 50,
                        "email": record.email,
                        "extracted_data": record,
                    },
                )
            return False

        # Forex dedup: statement INR vs alert USD for same charge
        # Match by card + date + merchant name similarity
        if is_statement and merchant:
            # Statement arrived: delete USD alerts on same date with matching merchant
            merchant_lower = merchant.lower().split()[0]  # first word of merchant
            for alert in CreditCardTransaction.objects.filter(
                card=card,
                transaction_date=txn_date,
                source_type="alert",
                currency="USD",
            ):
                alert_merchant = (alert.merchant_name or alert.description).lower()
                if merchant_lower in alert_merchant or alert_merchant.split()[0] in merchant.lower():
                    alert.delete()
        elif data.get("currency") == "USD" and merchant:
            # USD alert arrived: skip if a statement with matching merchant exists
            merchant_lower = merchant.lower().split()[0]
            for stmt in CreditCardTransaction.objects.filter(
                card=card,
                transaction_date=txn_date,
                source_type="statement",
            ):
                stmt_desc = (stmt.merchant_name or stmt.description).lower()
                if merchant_lower in stmt_desc or stmt_desc.split()[0] in merchant.lower():
                    return False

        # Also check dedup hash
        if CreditCardTransaction.objects.filter(dedup_hash=dedup).exists():
            return False

        cc_txn = CreditCardTransaction.objects.create(
            card=card,
            dedup_hash=dedup,
            transaction_date=txn_date,
            transaction_time=txn_time,
            amount=Decimal(str(amount)),
            currency=data.get("currency", "INR"),
            description=description,
            merchant_name=merchant,
            source_type=source if source in ("alert", "statement") else "alert",
        )

        # Create/link unified transaction
        unified_key = make_dedup_key(
            card.family_id, "credit_card", card.card_last4, txn_date, amount
        )
        source_type = "cc_statement_pdf" if is_statement else "cc_alert_email"
        ut, _ = get_or_create_unified(
            family=card.family,
            transaction_date=txn_date,
            amount=Decimal(str(amount)),
            currency=data.get("currency", "INR"),
            merchant_name=merchant,
            description=description,
            instrument_type="credit_card",
            credit_card=card,
            dedup_key=unified_key,
            source_type=source_type,
            source_cc_transaction=cc_txn,
            source_email=record.email,
            source_extracted_data=record,
        )
        cc_txn.unified_transaction = ut
        cc_txn.save(update_fields=["unified_transaction"])

        return True

    @staticmethod
    def _parse_date(val: str | None) -> date | None:
        if not val or val == "None":
            return None
        try:
            return date.fromisoformat(val)
        except ValueError:
            return None

    @staticmethod
    def _make_dedup_hash(card_last4: str, txn_date: date, amount: float) -> str:
        key = f"{card_last4}|{txn_date}|{amount:.2f}"
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
