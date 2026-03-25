"""Bootstrap email sender rules from sender_rules.yaml for all Gmail accounts.

Usage:
    uv run python manage.py bootstrap_sender_rules           # add missing rules
    uv run python manage.py bootstrap_sender_rules --reset   # delete all, reimport
"""

from pathlib import Path

import yaml
from django.core.management.base import BaseCommand

from gmail.models import EmailSenderRule, GmailAccount

YAML_PATH = Path(__file__).resolve().parent.parent.parent / "sender_rules.yaml"


def load_rules() -> list[dict]:
    """Load rules from the YAML config file."""
    with open(YAML_PATH) as f:
        return yaml.safe_load(f)


def sync_rules_for_account(account: GmailAccount, rules: list[dict], reset: bool) -> tuple[int, int]:
    """Sync rules for a single account. Returns (created, skipped)."""
    if reset:
        account.sender_rules.all().delete()

    created = 0
    skipped = 0
    for rule in rules:
        _, was_created = EmailSenderRule.objects.get_or_create(
            gmail_account=account,
            sender_pattern=rule["pattern"],
            defaults={
                "source_type": rule["source_type"],
                "is_enabled": True,
            },
        )
        if was_created:
            created += 1
        else:
            skipped += 1

    return created, skipped


class Command(BaseCommand):
    help = "Bootstrap email sender rules from sender_rules.yaml for all Gmail accounts"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing rules and reimport from YAML",
        )

    def handle(self, *args, **options):
        reset = options["reset"]

        if not YAML_PATH.exists():
            self.stderr.write(self.style.ERROR(f"Config not found: {YAML_PATH}"))
            return

        rules = load_rules()
        self.stdout.write(f"Loaded {len(rules)} rules from {YAML_PATH.name}")

        accounts = list(GmailAccount.objects.filter(is_active=True))
        if not accounts:
            self.stdout.write(self.style.WARNING("No active Gmail accounts found"))
            return

        for account in accounts:
            created, skipped = sync_rules_for_account(account, rules, reset)
            action = "Reset &" if reset else ""
            self.stdout.write(
                f"  {account.email}: {action} created {created}, skipped {skipped} existing"
            )

        self.stdout.write(self.style.SUCCESS("Done"))
