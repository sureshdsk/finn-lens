from __future__ import annotations

import re
from datetime import date, datetime

from .base import BaseEmailParser, DataType, ExtractionResult

# Known CC alert sender domains
CC_DOMAINS = [
    "hdfcbank.net", "icicibank.com", "axisbank.com", "sbicard.com",
    "kotak.com", "indusind.com", "sc.com", "rblbank.com", "yesbank.in",
    "citibank.com", "amex.com", "hsbc.co.in",
]

# Amount patterns: ₹1,234.56 or Rs 1,234.56 or Rs.1234.56 or INR 1,234.56
AMOUNT_RE = re.compile(
    r"(?:₹|Rs\.?\s*|INR\s*)([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE
)

# Card last 4 digits patterns
CARD_RE = re.compile(
    r"(?:card\s*(?:ending|no\.?|number)?[\s:]*(?:xx|XX|[*xX]+)?(\d{4}))|"
    r"(?:xx(\d{4}))|(?:XX(\d{4}))|(?:\*+(\d{4}))",
    re.IGNORECASE,
)

# Merchant patterns — "at MERCHANT" or "to MERCHANT" or "towards MERCHANT"
MERCHANT_RE = re.compile(
    r"(?:at|to|towards|@)\s+([A-Za-z0-9][\w\s&'.,-]{1,50}?)(?:\s+on|\s+for|\s+of|\.|,|\s+has|\s+was|\s+is|\s+w)",
    re.IGNORECASE,
)

# Date patterns in alerts
DATE_PATTERNS = [
    (re.compile(r"on\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})"), ["%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"]),
    (re.compile(r"on\s+(\d{1,2}\s+\w{3}\s+\d{2,4})"), ["%d %b %Y", "%d %b %y"]),
    (re.compile(r"dated?\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})"), ["%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"]),
]

# Subject keywords indicating CC transaction
CC_SUBJECT_KEYWORDS = [
    "transaction", "spent", "payment", "credit card", "debit card",
    "card transaction", "purchase", "charge", "debited",
]


class CreditCardParser:
    def can_parse(self, sender: str, subject: str) -> bool:
        sender_lower = sender.lower()
        subject_lower = subject.lower()

        # Check if sender is from a known CC domain
        domain_match = any(domain in sender_lower for domain in CC_DOMAINS)
        # Check if subject has CC-related keywords
        keyword_match = any(kw in subject_lower for kw in CC_SUBJECT_KEYWORDS)

        return domain_match and keyword_match

    def parse(self, sender: str, subject: str, body: str) -> list[ExtractionResult]:
        # Combine subject + body for searching
        text = f"{subject}\n{body}"

        # Strip HTML tags for plain text extraction
        clean_text = re.sub(r"<[^>]+>", " ", text)
        clean_text = re.sub(r"\s+", " ", clean_text)

        # Extract amount
        amount_match = AMOUNT_RE.search(clean_text)
        if not amount_match:
            return []

        amount_str = amount_match.group(1).replace(",", "")
        try:
            amount = float(amount_str)
        except ValueError:
            return []

        # Extract card last 4
        card_last4 = ""
        card_match = CARD_RE.search(clean_text)
        if card_match:
            card_last4 = next((g for g in card_match.groups() if g), "")

        # Extract merchant
        merchant = ""
        merchant_match = MERCHANT_RE.search(clean_text)
        if merchant_match:
            merchant = merchant_match.group(1).strip()

        # Extract date
        txn_date: date | None = None
        for pattern, formats in DATE_PATTERNS:
            date_match = pattern.search(clean_text)
            if date_match:
                date_str = date_match.group(1)
                for fmt in formats:
                    try:
                        txn_date = datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        continue
                if txn_date:
                    break

        confidence = 0.5
        if amount:
            confidence += 0.2
        if card_last4:
            confidence += 0.15
        if merchant:
            confidence += 0.1
        if txn_date:
            confidence += 0.05
        confidence = min(confidence, 1.0)

        return [
            ExtractionResult(
                data_type=DataType.CC_TRANSACTION,
                confidence=confidence,
                amount=amount,
                currency="INR",
                transaction_date=txn_date,
                merchant_or_provider=merchant,
                description=subject,
                extra={
                    "card_last4": card_last4,
                },
            )
        ]
