from __future__ import annotations

import fnmatch
from typing import TYPE_CHECKING, Callable

from .base import BaseEmailParser, ExtractionResult, SourceType

if TYPE_CHECKING:
    from gmail.models import EmailSenderRule

_PARSERS: list[BaseEmailParser] = []
_cc_statement_parser: CreditCardStatementParser | None = None


def register(parser: BaseEmailParser):
    _PARSERS.append(parser)


def classify_sender(sender: str, rules: list[EmailSenderRule]) -> SourceType:
    """Match a sender email against sender rules to determine source type."""
    sender_lower = sender.lower()
    for rule in rules:
        if not rule.is_enabled:
            continue
        pattern = rule.sender_pattern.lower()
        if fnmatch.fnmatch(sender_lower, pattern):
            return SourceType(rule.source_type)
    return SourceType.UNKNOWN


def set_cc_password_fn(fn: Callable[[str], str | None]) -> None:
    """Set the password callback for CC statement PDF parsing."""
    if _cc_statement_parser:
        _cc_statement_parser._password_fn = fn


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


# Register parsers — order matters (statement before alerts)
from .cc_statement import CreditCardStatementParser
from .credit_card import CreditCardParser
from .investment import GrowwInvestmentParser

_cc_statement_parser = CreditCardStatementParser()
register(_cc_statement_parser)
register(CreditCardParser())
register(GrowwInvestmentParser())
