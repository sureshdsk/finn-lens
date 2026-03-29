from __future__ import annotations

import fnmatch
from typing import TYPE_CHECKING, Callable

from .base import BaseEmailParser, ExtractionResult, SourceType

if TYPE_CHECKING:
    from gmail.models import EmailSenderRule

_PARSERS: list[BaseEmailParser] = []
_cc_statement_parser: CreditCardStatementParser | None = None
_bank_statement_parser: BankStatementParser | None = None


def register(parser: BaseEmailParser):
    _PARSERS.append(parser)


def classify_sender(
    sender: str,
    rules: list[EmailSenderRule],
    subject: str = "",
    has_attachment: bool = False,
) -> SourceType:
    """Match a sender email against sender rules to determine source type.

    Rules are sorted by priority (descending), then specificity (fewer wildcards first).
    Subject pattern and attachment requirement are checked if set on the rule.
    """
    sender_lower = sender.lower()
    subject_lower = subject.lower()
    sorted_rules = sorted(
        (r for r in rules if r.is_enabled),
        key=lambda r: (-r.priority, r.sender_pattern.count("*")),
    )
    for rule in sorted_rules:
        if not fnmatch.fnmatch(sender_lower, rule.sender_pattern.lower()):
            continue
        if rule.subject_pattern and not fnmatch.fnmatch(subject_lower, rule.subject_pattern.lower()):
            continue
        if rule.require_attachment and not has_attachment:
            continue
        return SourceType(rule.source_type)
    return SourceType.UNKNOWN


def set_cc_password_fn(fn: Callable[[str], str | None]) -> None:
    """Set the password callback for CC statement PDF parsing."""
    if _cc_statement_parser:
        _cc_statement_parser._password_fn = fn


def set_bank_statement_password_fn(fn: Callable[[str], str | None]) -> None:
    """Set the password callback for bank e-statement PDF parsing."""
    if _bank_statement_parser:
        _bank_statement_parser._password_fn = fn


def parse_email(
    sender: str, subject: str, body: str, attachments: list[bytes] | None = None
) -> list[ExtractionResult]:
    """Run all registered parsers on an email, return results from first match."""
    for parser in _PARSERS:
        if parser.can_parse(sender, subject):
            results = parser.parse(sender, subject, body, attachments)
            if results:
                return results
    return []


# Register parsers — order matters:
# 1. Bank statement (before CC, since same domain can send both)
# 2. CC statement (before alerts)
# 3. CC payment
# 4. CC alerts
# 5. Others
from .bank_statement import BankStatementParser
from .cc_statement import CreditCardStatementParser
from .cc_payment import CreditCardPaymentParser
from .credit_card import CreditCardParser
from .investment import GrowwInvestmentParser
from .subscription import SubscriptionParser
from .bill import BillParser

_bank_statement_parser = BankStatementParser()
register(_bank_statement_parser)

_cc_statement_parser = CreditCardStatementParser()
register(_cc_statement_parser)
register(CreditCardPaymentParser())
register(CreditCardParser())
register(GrowwInvestmentParser())
register(SubscriptionParser())
register(BillParser())
