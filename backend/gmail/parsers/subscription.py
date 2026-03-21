"""Parser for subscription renewal/billing emails."""

from __future__ import annotations

import re
from datetime import date, datetime

from .base import DataType, ExtractionResult

# Known subscription email senders
_SUBSCRIPTION_SENDERS = [
    "netflix.com",
    "spotify.com",
    "google.com",  # YouTube Premium, Google One
    "apple.com",   # iCloud, Apple Music, Apple TV+
    "amazon.",      # Prime
    "hotstar.com",
    "disneyplus.com",
    "openai.com",
    "anthropic.com",
    "linkedin.com",
    "notion.so",
    "github.com",
    "dropbox.com",
    "adobe.com",
    "zerodha.com",
    "audible.com",
    "cultfit.com",
    "curefit.com",
    "swiggy.com",
    "zomato.com",
]

_SUBSCRIPTION_KEYWORDS = [
    "renewal",
    "subscription",
    "recurring",
    "billing",
    "membership",
    "renewed",
    "auto-renewal",
    "payment confirmation",
    "your plan",
    "monthly charge",
    "annual charge",
]

# Amount patterns
_AMOUNT_RE = re.compile(
    r"(?:₹|rs\.?\s*|inr\s*|usd\s*|\$)\s*([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)

# Date patterns
_DATE_PATTERNS = [
    (re.compile(r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})"), "%d/%m/%Y"),
    (re.compile(r"(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})"), "%Y/%m/%d"),
    (re.compile(r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})", re.IGNORECASE), "%d %b %Y"),
    (re.compile(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})", re.IGNORECASE), "%b %d %Y"),
]

# Service name extraction from subject
_SERVICE_PATTERNS = [
    re.compile(r"(?:your\s+)?(\w[\w\s]+?)\s+(?:subscription|membership|plan|renewal)", re.IGNORECASE),
    re.compile(r"(?:subscription|membership|plan)\s+(?:for|to|from)\s+(\w[\w\s]+?)(?:\s|$)", re.IGNORECASE),
]


class SubscriptionParser:
    """Parses subscription renewal and billing emails."""

    def can_parse(self, sender: str, subject: str) -> bool:
        sender_lower = sender.lower()
        subject_lower = subject.lower()

        # Check sender domain
        sender_match = any(domain in sender_lower for domain in _SUBSCRIPTION_SENDERS)

        # Check subject keywords
        keyword_match = any(kw in subject_lower for kw in _SUBSCRIPTION_KEYWORDS)

        return sender_match and keyword_match

    def parse(
        self,
        sender: str,
        subject: str,
        body: str,
        attachments: list[bytes] | None = None,
    ) -> list[ExtractionResult]:
        text = f"{subject}\n{body}"

        # Extract amount
        amount: float | None = None
        currency = "INR"
        amount_match = _AMOUNT_RE.search(text)
        if amount_match:
            raw = amount_match.group(1).replace(",", "")
            try:
                amount = float(raw)
            except ValueError:
                pass
            # Detect currency
            prefix = text[max(0, amount_match.start() - 5) : amount_match.start()].lower()
            if "$" in prefix or "usd" in prefix:
                currency = "USD"

        # Extract service name
        service_name = ""
        for pattern in _SERVICE_PATTERNS:
            m = pattern.search(subject)
            if m:
                service_name = m.group(1).strip()
                break
        if not service_name:
            # Fallback: use sender domain
            domain_match = re.search(r"@([\w.-]+)", sender)
            if domain_match:
                service_name = domain_match.group(1).split(".")[0].title()

        # Extract renewal/billing date
        renewal_date: date | None = None
        # Look for "next billing date", "renewal date", "renews on" etc.
        date_context_re = re.compile(
            r"(?:next\s+(?:billing|renewal|payment)\s+date|renews?\s+on|billing\s+date|valid\s+(?:until|till))\s*:?\s*(.{10,30})",
            re.IGNORECASE,
        )
        date_ctx = date_context_re.search(text)
        date_search_text = date_ctx.group(1) if date_ctx else text

        for pattern, fmt in _DATE_PATTERNS:
            m = pattern.search(date_search_text)
            if m:
                try:
                    raw_date = m.group(0)
                    # Normalize separators for parsing
                    normalized = raw_date.replace("-", "/")
                    parsed = datetime.strptime(normalized, fmt.replace("-", "/"))
                    renewal_date = parsed.date()
                    break
                except ValueError:
                    continue

        # Extract plan name
        plan = ""
        plan_re = re.compile(r"(?:plan|tier)\s*:?\s*(\w[\w\s]+?)(?:\n|\.|\s{2,}|$)", re.IGNORECASE)
        plan_match = plan_re.search(text)
        if plan_match:
            plan = plan_match.group(1).strip()[:50]

        confidence = 0.5
        if amount:
            confidence += 0.2
        if service_name:
            confidence += 0.15
        if renewal_date:
            confidence += 0.15

        return [
            ExtractionResult(
                data_type=DataType.SUBSCRIPTION_RENEWAL,
                confidence=min(confidence, 1.0),
                amount=amount,
                currency=currency,
                transaction_date=renewal_date,
                merchant_or_provider=service_name,
                description=subject,
                extra={
                    "service_name": service_name,
                    "plan": plan,
                    "next_renewal_date": str(renewal_date) if renewal_date else None,
                },
            )
        ]
