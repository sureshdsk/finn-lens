"""Materialization service for bank account e-statement data from Gmail.

Takes ExtractedFinancialData records with data_type='bank_statement'
and creates BankAccount + Transaction + UnifiedTransaction records,
reusing the same import logic as manual statement uploads.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db import transaction as db_transaction

from .models import BankAccount, Family, Transaction
from .services import _classify_bank_description, _link_cc_bill_payments, _make_reference
from .unified import get_or_create_unified, make_dedup_key
from gmail.models import ExtractedFinancialData, GmailAccount

logger = logging.getLogger(__name__)


@dataclass
class BankMaterializeResult:
    accounts: int = 0
    transactions: int = 0

    def to_dict(self) -> dict[str, int]:
        return {"accounts": self.accounts, "transactions": self.transactions}


class BankStatementMaterializer:
    """Creates BankAccount + Transaction records from extracted email bank statement data."""

    def materialize(self, user_id: int) -> dict[str, int]:
        gmail_accounts = list(GmailAccount.objects.filter(user_id=user_id))
        if not gmail_accounts:
            return BankMaterializeResult().to_dict()

        try:
            family = Family.objects.get(owner_id=user_id)
        except Family.DoesNotExist:
            return BankMaterializeResult().to_dict()

        account_ids = [a.pk for a in gmail_accounts]
        extracted = ExtractedFinancialData.objects.filter(
            email__gmail_account_id__in=account_ids,
            data_type="bank_statement",
            is_materialized=False,
        ).select_related("email")

        result = BankMaterializeResult()

        for record in extracted:
            data = record.data_json
            bank_code = data.get("bank_code", "OTHER")
            account_number = data.get("account_number", "")
            holder_name = data.get("account_holder_name", "")
            txn_dicts = data.get("transactions", [])

            if not txn_dicts:
                continue

            # Get or create bank account
            account = self._get_or_create_account(
                family, bank_code, account_number, holder_name
            )
            if account._created:
                result.accounts += 1

            # Import transactions
            count = self._import_transactions(account, txn_dicts)
            result.transactions += count

            # Mark as materialized
            record.is_materialized = True
            record.save(update_fields=["is_materialized"])

        # Link CC bill payments across all accounts
        if result.transactions > 0:
            for account in BankAccount.objects.filter(family=family):
                _link_cc_bill_payments(account)

        return result.to_dict()

    def _get_or_create_account(
        self,
        family: Family,
        bank_code: str,
        account_number: str,
        holder_name: str,
    ) -> BankAccount:
        # Try to find existing account by bank + account number suffix
        suffix = account_number[-4:] if len(account_number) >= 4 else ""
        existing = BankAccount.objects.filter(
            family=family, bank_name=bank_code
        )
        if suffix:
            # Match by last 4 digits of account number
            for acct in existing:
                if acct.account_number and acct.account_number.endswith(suffix):
                    acct._created = False
                    return acct

        # Create new account
        acct, created = BankAccount.objects.get_or_create(
            family=family,
            bank_name=bank_code,
            defaults={
                "account_number": account_number,
                "account_holder_name": holder_name,
            },
        )
        if created and holder_name and not acct.account_holder_name:
            acct.account_holder_name = holder_name
            acct.save(update_fields=["account_holder_name"])

        acct._created = created
        return acct

    def _import_transactions(
        self, account: BankAccount, txn_dicts: list[dict]
    ) -> int:
        """Import transactions from parsed data, deduplicating by raw_reference hash."""
        count = 0

        with db_transaction.atomic():
            for rec in txn_dicts:
                txn_date = date.fromisoformat(rec["transaction_date"])
                value_date = date.fromisoformat(rec.get("value_date", rec["transaction_date"]))
                description = rec.get("description", "")
                debit = Decimal(str(rec["debit"])) if rec.get("debit") else None
                credit = Decimal(str(rec["credit"])) if rec.get("credit") else None
                balance = Decimal(str(rec.get("balance", 0)))

                raw_ref = _make_reference({
                    "transaction_date": txn_date,
                    "value_date": value_date,
                    "description": description,
                    "debit": debit,
                    "credit": credit,
                    "balance": balance,
                })

                pre_category = _classify_bank_description(
                    description, is_debit=bool(debit)
                )

                obj, created = Transaction.objects.get_or_create(
                    account=account,
                    raw_reference=raw_ref,
                    defaults={
                        "transaction_date": txn_date,
                        "value_date": value_date,
                        "description": description,
                        "cheque_number": rec.get("cheque_number"),
                        "debit": debit,
                        "credit": credit,
                        "balance": balance,
                        "category": pre_category,
                    },
                )
                if created:
                    count += 1
                    # Create unified transaction
                    amount = debit or credit
                    if amount:
                        inst_type = "bank_debit" if debit else "bank_credit"
                        unified_key = make_dedup_key(
                            account.family_id, inst_type, account.pk,
                            txn_date, amount,
                        )
                        ut, _ = get_or_create_unified(
                            family=account.family,
                            transaction_date=txn_date,
                            amount=amount,
                            currency=account.currency,
                            description=description,
                            category=pre_category,
                            instrument_type=inst_type,
                            bank_account=account,
                            dedup_key=unified_key,
                            source_type="bank_statement",
                            source_bank_transaction=obj,
                        )
                        obj.unified_transaction = ut
                        obj.save(update_fields=["unified_transaction"])

        return count
