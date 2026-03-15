from __future__ import annotations

import fnmatch
from typing import TYPE_CHECKING

from .base import BaseEmailParser, ExtractionResult, SourceType

if TYPE_CHECKING:
    from gmail.models import EmailSenderRule

_PARSERS: list[BaseEmailParser] = []


def register(parser: BaseEmailParser):
    _PARSERS.append(parser)


def classify_sender(sender: str, rules: list[EmailSenderRule]) -> SourceType:
    """Match a sender email against sender rules to determine source type."""
    sender_lower = sender.lower()
    for rule in rules:
        if not rule.is_enabled:
            continue
        pattern = rule.sender_pattern.lower()
        # Support *@domain.com style patterns
        if fnmatch.fnmatch(sender_lower, pattern):
            return SourceType(rule.source_type)
    return SourceType.UNKNOWN


def parse_email(sender: str, subject: str, body: str) -> list[ExtractionResult]:
    """Run all registered parsers on an email, return results from first match."""
    for parser in _PARSERS:
        if parser.can_parse(sender, subject):
            results = parser.parse(sender, subject, body)
            if results:
                return results
    return []


# Register parsers
from .investment import GrowwInvestmentParser

register(GrowwInvestmentParser())
