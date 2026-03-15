from __future__ import annotations

import re
from datetime import date, datetime

from banking.constants import CC_DOMAINS

from .base import DataType, ExtractionResult

# Amount patterns: ₹1,234.56 or Rs 1,234.56 or Rs.1234.56 or INR 1,234.56 or USD 1,234.56
AMOUNT_RE = re.compile(
    r"(?:₹|Rs\.?\s*|INR\s*|USD\s*)([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE
)

# Contextual amount: "transaction of INR/USD 123.45" — this is the actual txn amount
_TXN_AMOUNT_RE = re.compile(
    r"transaction\s+of\s+(?:₹|Rs\.?\s*|INR\s*|USD\s*)([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)

# Currency detection
_CURRENCY_RE = re.compile(
    r"transaction\s+of\s+(USD|INR|₹|Rs\.?)\s*[\d,]",
    re.IGNORECASE,
)

# Card last 4 digits patterns
CARD_RE = re.compile(
    r"(?:card\s*(?:ending|no\.?|number)?[\s:]*(?:xx|XX|[*xX]+)?(\d{4}))|"
    r"(?:xx(\d{4}))|(?:XX(\d{4}))|(?:\*+(\d{4}))",
    re.IGNORECASE,
)

# Merchant patterns — ordered by specificity (first match wins)
MERCHANT_PATTERNS = [
    # ICICI format: "Info: MERCHANT_NAME." — allow dots within name (e.g. CLAUDE.AI)
    re.compile(r"Info[:\s]+([A-Za-z0-9][\w\s&'.,-]{0,60}?)(?:\.\s+The\s|$)", re.IGNORECASE),
    # "at MERCHANT on <date>" / "at MERCHANT." etc
    re.compile(
        r"(?:at|to|towards|@)\s+([A-Za-z0-9][\w\s&'.,-]{1,50}?)(?:\s+on\s+\d|\s+for|\s+of|\.|,|\s+has|\s+was|\s+is|\s+w)",
        re.IGNORECASE,
    ),
]

# Junk merchant values to reject
_MERCHANT_BLACKLIST = {
    "the primary card holder", "the supplementary card holder",
    "the card holder", "primary card holder",
    "more opportunities to be", "more opportunities",
}

# Subject keywords that indicate non-transaction emails (should not extract merchant)
_NON_TXN_SUBJECTS = ["payment received", "payment successful", "emi conversion"]

# Date patterns in alerts
DATE_PATTERNS = [
    (re.compile(r"on\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})"), ["%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"]),
    (re.compile(r"on\s+(\d{1,2}\s+\w{3}\s+\d{2,4})"), ["%d %b %Y", "%d %b %y"]),
    (re.compile(r"on\s+(\w{3}\s+\d{1,2},?\s*\d{4})"), ["%b %d, %Y", "%b %d,%Y", "%b %d %Y"]),
    (re.compile(r"dated?\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})"), ["%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"]),
]

# Time patterns: "at HH:MM:SS" or "HH:MM:SS IST" after date
TIME_PATTERNS = [
    re.compile(r"at\s+(\d{1,2}:\d{2}(?::\d{2})?)(?:\s|\.|$)", re.IGNORECASE),
    re.compile(r"\d{4}\s+(\d{1,2}:\d{2}(?::\d{2})?)\s", re.IGNORECASE),
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

    def parse(self, sender: str, subject: str, body: str, attachments: list[bytes] | None = None) -> list[ExtractionResult]:
        # Combine subject + body for searching
        text = f"{subject}\n{body}"

        # Strip HTML tags for plain text extraction
        clean_text = re.sub(r"<[^>]+>", " ", text)
        clean_text = re.sub(r"\s+", " ", clean_text)

        # Extract amount — prefer "transaction of <amount>" (contextual) over generic match
        amount_match = _TXN_AMOUNT_RE.search(clean_text)
        if not amount_match:
            amount_match = AMOUNT_RE.search(clean_text)
        if not amount_match:
            return []

        amount_str = amount_match.group(1).replace(",", "")
        try:
            amount = float(amount_str)
        except ValueError:
            return []

        # Detect currency
        currency = "INR"
        curr_match = _CURRENCY_RE.search(clean_text)
        if curr_match and curr_match.group(1).upper().startswith("USD"):
            currency = "USD"

        # Extract card last 4
        card_last4 = ""
        card_match = CARD_RE.search(clean_text)
        if card_match:
            card_last4 = next((g for g in card_match.groups() if g), "")

        # Extract merchant (try each pattern in order)
        merchant = ""
        for pattern in MERCHANT_PATTERNS:
            merchant_match = pattern.search(clean_text)
            if merchant_match:
                candidate = merchant_match.group(1).strip()
                if candidate.lower() not in _MERCHANT_BLACKLIST:
                    merchant = candidate
                    break

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

        # Extract time
        txn_time = ""
        for tp in TIME_PATTERNS:
            time_match = tp.search(clean_text)
            if time_match:
                txn_time = time_match.group(1)
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
                currency=currency,
                transaction_date=txn_date,
                merchant_or_provider=merchant,
                description=subject,
                extra={
                    "card_last4": card_last4,
                    "transaction_time": txn_time,
                },
            )
        ]
