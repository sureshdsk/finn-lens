"""Subscription detection and materialization from transaction history."""

from __future__ import annotations

import re
import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction as db_transaction

from .constants import KNOWN_SUBSCRIPTIONS
from .models import (
    CreditCardTransaction,
    Family,
    Subscription,
    SubscriptionPayment,
    Transaction,
)


@dataclass
class DetectedPayment:
    amount: Decimal
    date: date
    source: str  # "bank_txn" or "cc_txn"
    txn_id: int
    currency: str = "INR"


@dataclass
class DetectedSubscription:
    merchant_pattern: str
    name: str
    category: str
    icon: str
    color: str
    cycle: str  # "monthly" or "yearly"
    cost: Decimal
    confidence: float
    currency: str = "INR"
    payments: list[DetectedPayment] = field(default_factory=list)
    last_billed_date: date | None = None
    next_renewal_date: date | None = None
    start_date: date | None = None
    source: str = "bank_txn"


def normalize_merchant(raw: str) -> str:
    """Normalize merchant name for grouping."""
    s = raw.lower().strip()
    # Strip common prefixes
    for prefix in ("upi/", "upi-", "neft/", "imps/", "bil/", "ach d- "):
        if s.startswith(prefix):
            s = s[len(prefix):]
    # Remove trailing reference numbers, dates, ids
    s = re.sub(r"[/\-]\d{6,}$", "", s)
    s = re.sub(r"\s*\*+\s*", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _match_known(pattern: str) -> dict[str, str] | None:
    """Match a normalized pattern against KNOWN_SUBSCRIPTIONS."""
    for key, meta in KNOWN_SUBSCRIPTIONS.items():
        if key in pattern:
            return meta
    return None


def detect_subscriptions(family: Family) -> list[DetectedSubscription]:
    """Detect recurring payments from bank + CC transactions."""
    # Gather all debit transactions, keyed by (merchant, currency)
    payments_by_key: dict[tuple[str, str], list[DetectedPayment]] = defaultdict(list)

    # Bank transactions (debits only)
    bank_txns = Transaction.objects.filter(
        account__family=family,
        debit__isnull=False,
    ).select_related("account").order_by("transaction_date")

    for txn in bank_txns:
        merchant = normalize_merchant(txn.merchant_name or txn.description)
        if len(merchant) < 3:
            continue
        currency = txn.account.currency or "INR"
        payments_by_key[(merchant, currency)].append(
            DetectedPayment(
                amount=txn.debit,
                date=txn.transaction_date,
                source="bank_txn",
                txn_id=txn.pk,
                currency=currency,
            )
        )

    # CC transactions
    cc_txns = CreditCardTransaction.objects.filter(
        card__family=family,
    ).order_by("transaction_date")

    for txn in cc_txns:
        merchant = normalize_merchant(txn.merchant_name or txn.description)
        if len(merchant) < 3:
            continue
        currency = txn.currency or "INR"
        payments_by_key[(merchant, currency)].append(
            DetectedPayment(
                amount=txn.amount,
                date=txn.transaction_date,
                source="cc_txn",
                txn_id=txn.pk,
                currency=currency,
            )
        )

    detected: list[DetectedSubscription] = []

    for (merchant, currency), payments in payments_by_key.items():
        if len(payments) < 2:
            continue

        # Sort by date
        payments.sort(key=lambda p: p.date)

        # Compute intervals between consecutive payments (in days)
        intervals = [
            (payments[i + 1].date - payments[i].date).days
            for i in range(len(payments) - 1)
        ]
        if not intervals:
            continue

        median_interval = statistics.median(intervals)

        # Determine cycle
        if 25 <= median_interval <= 35:
            cycle = "monthly"
        elif 350 <= median_interval <= 380:
            cycle = "yearly"
        else:
            continue

        # Check amount consistency (within 10% of median)
        amounts = [float(p.amount) for p in payments]
        median_amount = statistics.median(amounts)
        if median_amount <= 0:
            continue
        consistent = sum(1 for a in amounts if abs(a - median_amount) / median_amount <= 0.10)
        if consistent < len(amounts) * 0.6:
            continue

        # Confidence scoring
        confidence = 0.4
        confidence += min(len(payments) * 0.1, 0.3)  # More payments = higher confidence
        # Amount consistency bonus
        amount_consistency = consistent / len(amounts)
        confidence += amount_consistency * 0.2
        # Interval regularity bonus
        if intervals:
            interval_std = statistics.stdev(intervals) if len(intervals) > 1 else 0
            if interval_std < 3:
                confidence += 0.1
        confidence = min(confidence, 1.0)

        # Enrich with known subscription metadata
        meta = _match_known(merchant)
        name = meta["name"] if meta else merchant.title()
        category = meta["category"] if meta else "other"
        icon = meta["icon"] if meta else "💳"
        color = meta["color"] if meta else "hsl(175 100% 50%)"

        last_payment = payments[-1]
        cycle_days = 30 if cycle == "monthly" else 365
        next_renewal = last_payment.date + timedelta(days=cycle_days)

        detected.append(
            DetectedSubscription(
                merchant_pattern=merchant,
                name=name,
                category=category,
                icon=icon,
                color=color,
                cycle=cycle,
                cost=Decimal(str(round(median_amount, 2))),
                confidence=round(confidence, 2),
                currency=currency,
                payments=payments,
                last_billed_date=last_payment.date,
                next_renewal_date=next_renewal,
                start_date=payments[0].date,
                source=last_payment.source,
            )
        )

    # Sort by confidence descending
    detected.sort(key=lambda d: d.confidence, reverse=True)
    return detected


@db_transaction.atomic
def materialize_subscriptions(family: Family) -> dict[str, int]:
    """Detect subscriptions and persist them, merging with email-sourced data."""
    detected = detect_subscriptions(family)

    # Also pull email-extracted subscription data
    email_subs: dict[str, dict] = {}
    try:
        from gmail.models import ExtractedFinancialData, GmailAccount
        gmail_accounts = GmailAccount.objects.filter(user=family.owner)
        extractions = ExtractedFinancialData.objects.filter(
            email__gmail_account__in=gmail_accounts,
            data_type="subscription_renewal",
        )
        for ext in extractions:
            data = ext.data_json or {}
            service_name = data.get("service_name", data.get("merchant_or_provider", "")).lower()
            if service_name:
                email_subs[service_name] = data
    except Exception:
        pass  # Gmail app may not be set up

    created_count = 0
    payment_count = 0

    for det in detected:
        # Merge email data if available
        email_data = None
        for key, data in email_subs.items():
            if key in det.merchant_pattern or det.merchant_pattern in key:
                email_data = data
                break

        # Apply email enrichments
        plan = ""
        if email_data:
            plan = email_data.get("plan", "")
            if email_data.get("next_renewal_date"):
                try:
                    det.next_renewal_date = date.fromisoformat(email_data["next_renewal_date"])
                except (ValueError, TypeError):
                    pass

        sub, was_created = Subscription.objects.get_or_create(
            family=family,
            merchant_pattern=det.merchant_pattern,
            cycle=det.cycle,
            defaults={
                "name": det.name,
                "category": det.category,
                "cost": det.cost,
                "currency": det.currency,
                "next_renewal_date": det.next_renewal_date,
                "start_date": det.start_date,
                "last_billed_date": det.last_billed_date,
                "status": "active",
                "auto_renew": True,
                "icon": det.icon,
                "color": det.color,
                "plan": plan,
                "source": det.source,
                "confidence": det.confidence,
            },
        )

        if was_created:
            created_count += 1
        else:
            # Update mutable fields
            sub.cost = det.cost
            sub.currency = det.currency
            sub.last_billed_date = det.last_billed_date
            sub.next_renewal_date = det.next_renewal_date
            sub.confidence = det.confidence
            if plan:
                sub.plan = plan
            sub.save()

        # Link payment records
        for p in det.payments:
            defaults: dict = {"amount": p.amount}
            if p.source == "bank_txn":
                defaults["bank_transaction_id"] = p.txn_id
                # Get unified_transaction from bank txn
                try:
                    bt = Transaction.objects.get(pk=p.txn_id)
                    if bt.unified_transaction_id:
                        defaults["unified_transaction_id"] = bt.unified_transaction_id
                except Transaction.DoesNotExist:
                    pass
            else:
                defaults["cc_transaction_id"] = p.txn_id
                # Get unified_transaction from CC txn
                try:
                    ct = CreditCardTransaction.objects.get(pk=p.txn_id)
                    if ct.unified_transaction_id:
                        defaults["unified_transaction_id"] = ct.unified_transaction_id
                except CreditCardTransaction.DoesNotExist:
                    pass

            _, pay_created = SubscriptionPayment.objects.get_or_create(
                subscription=sub,
                payment_date=p.date,
                defaults=defaults,
            )
            if pay_created:
                payment_count += 1

    return {
        "detected": len(detected),
        "created": created_count,
        "payments_linked": payment_count,
    }
