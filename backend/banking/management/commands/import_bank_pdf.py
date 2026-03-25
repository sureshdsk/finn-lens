"""Management command to test bank statement PDF import end-to-end.

Usage:
    uv run python manage.py import_bank_pdf ~/Downloads/Statement.pdf --bank ICICI [--password xxx]

This bypasses Gmail and directly:
1. Parses the PDF using the bank PDF parser
2. Creates/finds a BankAccount
3. Imports transactions (with dedup)
4. Creates UnifiedTransactions
5. Links CC bill payments
"""

from django.core.management.base import BaseCommand, CommandError

from banking.models import BankAccount, Family, Transaction
from banking.parsers.bank_pdf_base import get_bank_pdf_parser, get_supported_banks
from banking.services import import_statement


class Command(BaseCommand):
    help = "Import a bank account e-statement PDF directly (bypasses Gmail sync)"

    def add_arguments(self, parser):
        parser.add_argument("pdf_path", help="Path to the PDF file")
        parser.add_argument(
            "--bank",
            default="ICICI",
            help=f"Bank code. Supported: {', '.join(get_supported_banks())}",
        )
        parser.add_argument("--password", default=None, help="PDF password (optional)")
        parser.add_argument(
            "--user-id", type=int, default=None, help="User ID (owner of Family)"
        )
        parser.add_argument("--dry-run", action="store_true", help="Parse only, don't save")

    def handle(self, *args, **options):
        pdf_path = options["pdf_path"]
        bank_code = options["bank"]
        password = options["password"]
        user_id = options["user_id"]
        dry_run = options["dry_run"]

        # 1. Get parser
        parser = get_bank_pdf_parser(bank_code)
        if not parser:
            raise CommandError(
                f"No PDF parser for '{bank_code}'. Supported: {', '.join(get_supported_banks())}"
            )

        # 2. Read PDF
        try:
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
        except FileNotFoundError:
            raise CommandError(f"File not found: {pdf_path}")

        self.stdout.write(f"Parsing {pdf_path} with {bank_code} parser...")

        # 3. Parse
        try:
            meta, transactions, period = parser.parse(pdf_bytes, password)
        except Exception as e:
            raise CommandError(f"Parse failed: {e}")

        self.stdout.write(self.style.SUCCESS(f"Parsed {len(transactions)} transactions"))
        self.stdout.write(f"  Account holder: {meta.get('account_holder_name', '?')}")
        self.stdout.write(f"  Account number: {meta.get('account_number', '?')}")
        if period.start:
            self.stdout.write(f"  Period: {period.start} to {period.end}")

        # Show first/last few transactions
        self.stdout.write("")
        self.stdout.write("  First 3 transactions:")
        for t in transactions[:3]:
            d = t.get("credit") or ""
            w = t.get("debit") or ""
            self.stdout.write(
                f"    {t['transaction_date']}  D={str(d):>10}  W={str(w):>10}  "
                f"B={t['balance']:>12}  {t['description'][:60]}"
            )
        if len(transactions) > 6:
            self.stdout.write(f"    ... ({len(transactions) - 6} more)")
        self.stdout.write("  Last 3 transactions:")
        for t in transactions[-3:]:
            d = t.get("credit") or ""
            w = t.get("debit") or ""
            self.stdout.write(
                f"    {t['transaction_date']}  D={str(d):>10}  W={str(w):>10}  "
                f"B={t['balance']:>12}  {t['description'][:60]}"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("\n--dry-run: not saving to database"))
            return

        # 4. Find or create Family + BankAccount
        if user_id:
            try:
                family = Family.objects.get(owner_id=user_id)
            except Family.DoesNotExist:
                raise CommandError(f"No Family found for user_id={user_id}")
        else:
            family = Family.objects.first()
            if not family:
                raise CommandError("No Family exists. Create one first or pass --user-id")
            self.stdout.write(f"\n  Using family: {family} (owner_id={family.owner_id})")

        # Try password from family if not provided
        if not password and family.cardholder_name and family.cardholder_dob:
            password = family.get_bank_statement_password(bank_code)
            if password:
                self.stdout.write(f"  Auto-generated password from family profile")

        # Get or create account
        account_number = meta.get("account_number", "")
        suffix = account_number[-4:] if len(account_number) >= 4 else ""

        account = None
        if suffix:
            for a in BankAccount.objects.filter(family=family, bank_name=bank_code):
                if a.account_number and a.account_number.endswith(suffix):
                    account = a
                    break

        if not account:
            account, created = BankAccount.objects.get_or_create(
                family=family,
                bank_name=bank_code,
                defaults={
                    "account_number": account_number,
                    "account_holder_name": meta.get("account_holder_name", ""),
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created BankAccount: {account}"))
            else:
                self.stdout.write(f"  Using existing BankAccount: {account}")
        else:
            self.stdout.write(f"  Matched existing BankAccount: {account}")

        # 5. Import using existing import_statement (wraps the XLS parser interface)
        #    We need to adapt — import_statement expects a StatementParser + file_bytes,
        #    but we already have parsed records. Use the materializer approach instead.
        from banking.bank_statement_services import BankStatementMaterializer

        # Serialize to the format BankStatementMaterializer expects
        txn_dicts = []
        for t in transactions:
            txn_dicts.append({
                "transaction_date": str(t["transaction_date"]),
                "value_date": str(t["value_date"]),
                "description": t["description"],
                "cheque_number": t.get("cheque_number"),
                "debit": float(t["debit"]) if t.get("debit") else None,
                "credit": float(t["credit"]) if t.get("credit") else None,
                "balance": float(t["balance"]),
            })

        materializer = BankStatementMaterializer()
        count = materializer._import_transactions(account, txn_dicts)

        # Stats
        total_txns = Transaction.objects.filter(account=account).count()
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"  Imported {count} new transactions (skipped {len(transactions) - count} duplicates)"))
        self.stdout.write(f"  Total transactions in account: {total_txns}")
