from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from banking.models import BankAccount, CreditCard, CreditCardTransaction, Family, Transaction
from banking.sub_services import materialize_subscriptions


User = get_user_model()


def _create_family() -> Family:
    user = User.objects.create_user(username="sub-user", email="sub@example.com", password="testpass123")
    return Family.objects.create(name="Test Family", owner=user)


def _create_bank_txn(account: BankAccount, txn_date: date, merchant: str, amount: str, ref: str) -> Transaction:
    return Transaction.objects.create(
        account=account,
        transaction_date=txn_date,
        value_date=txn_date,
        description=merchant,
        debit=Decimal(amount),
        credit=None,
        balance=Decimal("100000.00"),
        raw_reference=ref,
        merchant_name=merchant,
    )


def _create_cc_txn(
    card: CreditCard,
    txn_date: date,
    merchant: str,
    amount: str,
    dedup_hash: str,
    currency: str | None = None,
) -> CreditCardTransaction:
    return CreditCardTransaction.objects.create(
        card=card,
        transaction_date=txn_date,
        amount=Decimal(amount),
        currency=currency or card.currency,
        description=merchant,
        merchant_name=merchant,
        dedup_hash=dedup_hash,
    )


@pytest.mark.django_db
def test_materialize_subscriptions_uses_bank_transactions_for_tracking():
    family = _create_family()
    account = BankAccount.objects.create(
        family=family,
        bank_name="ICICI",
        account_number="123456789012",
        currency="INR",
    )

    _create_bank_txn(account, date(2026, 1, 5), "Spotify", "119.00", "bank-1")
    _create_bank_txn(account, date(2026, 2, 5), "Spotify", "119.00", "bank-2")
    _create_bank_txn(account, date(2026, 3, 5), "Spotify", "119.00", "bank-3")

    result = materialize_subscriptions(family)

    subscription = family.subscriptions.get()
    assert result["detected"] == 1
    assert subscription.payment_method == "ICICI ••9012"
    assert subscription.source == "bank_txn"
    assert subscription.payments.count() == 3
    assert subscription.payments.filter(bank_transaction__isnull=False).count() == 3


@pytest.mark.django_db
def test_materialize_subscriptions_uses_credit_card_transactions_for_tracking():
    family = _create_family()
    card = CreditCard.objects.create(
        family=family,
        issuer="HDFC",
        card_last4="6677",
        currency="INR",
    )

    _create_cc_txn(card, date(2026, 1, 12), "NETFLIX SUBSCRIPTION", "649.00", "cc-1")
    _create_cc_txn(card, date(2026, 2, 12), "NETFLIX SUBSCRIPTION", "649.00", "cc-2")
    _create_cc_txn(card, date(2026, 3, 12), "NETFLIX SUBSCRIPTION", "649.00", "cc-3")

    result = materialize_subscriptions(family)

    subscription = family.subscriptions.get()
    assert result["detected"] == 1
    assert subscription.payment_method == "HDFC ••6677"
    assert subscription.source == "cc_txn"
    assert subscription.payments.count() == 3
    assert subscription.payments.filter(cc_transaction__isnull=False).count() == 3


@pytest.mark.django_db
def test_materialize_subscriptions_keeps_mixed_bank_and_card_payment_history():
    family = _create_family()
    account = BankAccount.objects.create(
        family=family,
        bank_name="ICICI",
        account_number="123456789012",
        currency="INR",
    )
    card = CreditCard.objects.create(
        family=family,
        issuer="HDFC",
        card_last4="6677",
        currency="INR",
    )

    _create_bank_txn(account, date(2026, 1, 20), "CHATGPT PLUS", "1650.00", "mix-bank-1")
    _create_cc_txn(card, date(2026, 2, 19), "CHATGPT PLUS", "1650.00", "mix-cc-1")
    _create_bank_txn(account, date(2026, 3, 21), "CHATGPT PLUS", "1650.00", "mix-bank-2")

    result = materialize_subscriptions(family)

    subscription = family.subscriptions.get()
    assert result["detected"] == 1
    assert subscription.payment_method == "ICICI ••9012, HDFC ••6677"
    assert subscription.source == "bank_txn"
    assert subscription.payments.count() == 3
    assert subscription.payments.filter(bank_transaction__isnull=False).count() == 2
    assert subscription.payments.filter(cc_transaction__isnull=False).count() == 1


@pytest.mark.django_db
def test_materialize_subscriptions_detects_single_known_credit_card_subscription_charge():
    family = _create_family()
    card = CreditCard.objects.create(
        family=family,
        issuer="HDFC",
        card_last4="6677",
        currency="USD",
    )

    _create_cc_txn(card, date(2026, 3, 22), "CLAUDE.AI SUBSCRIPTION", "118.00", "claude-1")

    result = materialize_subscriptions(family)

    subscription = family.subscriptions.get()
    assert result["detected"] == 1
    assert subscription.name == "Claude Pro"
    assert subscription.category == "productivity"
    assert subscription.cost == Decimal("118.00")
    assert subscription.currency == "USD"
    assert subscription.cycle == "monthly"
    assert subscription.payment_method == "HDFC ••6677"
    assert subscription.source == "cc_txn"
    assert subscription.payments.count() == 1


@pytest.mark.django_db
def test_materialize_subscriptions_detects_variable_recurring_utility_bills():
    family = _create_family()
    account = BankAccount.objects.create(
        family=family,
        bank_name="ICICI",
        account_number="123456789012",
        currency="INR",
    )

    _create_bank_txn(account, date(2026, 1, 9), "TATA POWER BILL PAYMENT", "2100.00", "power-1")
    _create_bank_txn(account, date(2026, 2, 10), "TATA POWER BILL PAYMENT", "2460.00", "power-2")
    _create_bank_txn(account, date(2026, 3, 11), "TATA POWER BILL PAYMENT", "2290.00", "power-3")

    result = materialize_subscriptions(family)

    subscription = family.subscriptions.get()
    assert result["detected"] == 1
    assert subscription.name == "Tata Power"
    assert subscription.category == "utilities"
    assert subscription.cycle == "monthly"
    assert subscription.payments.count() == 3


@pytest.mark.django_db
def test_materialize_subscriptions_excludes_habitual_grocery_spend():
    family = _create_family()
    account = BankAccount.objects.create(
        family=family,
        bank_name="ICICI",
        account_number="123456789012",
        currency="INR",
    )

    txn1 = _create_bank_txn(account, date(2026, 1, 7), "BIGBASKET ORDER", "3200.00", "gro-1")
    txn2 = _create_bank_txn(account, date(2026, 2, 8), "BIGBASKET ORDER", "3150.00", "gro-2")
    txn3 = _create_bank_txn(account, date(2026, 3, 8), "BIGBASKET ORDER", "3310.00", "gro-3")
    Transaction.objects.filter(pk__in=[txn1.pk, txn2.pk, txn3.pk]).update(category="groceries")

    result = materialize_subscriptions(family)

    assert result["detected"] == 0
    assert family.subscriptions.count() == 0
