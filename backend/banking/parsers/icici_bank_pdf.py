"""ICICI Bank account e-statement PDF parser.

Parses monthly PDF statements sent by estatement@icicibank.com.

PDF layout (from pdfplumber word-position analysis):
    Column          x-range     Content
    DATE            < 75        DD-MM-YYYY
    MODE            75-120      (merged into particulars)
    PARTICULARS     120-370     Multi-line UPI/ACH/NEFT descriptions
    DEPOSITS        370-430     Credit amounts (Indian format)
    WITHDRAWALS     430-518     Debit amounts (Indian format)
    BALANCE         >= 515      Running balance

Transaction rows span multiple PDF lines:
    - Description lines (x ~144, no date/amounts) appear BEFORE the date+amount line
    - The date+amount line carries the date, any remaining description, and all amounts
    - Tail lines after the date+amount line are UPI reference suffixes (discarded)
    - B/F row = opening balance, skipped

Password: account-holder-specific, handled externally via password callback.
"""

from __future__ import annotations

import re
from typing import Iterator

from banking.protocols import AccountMeta, TransactionRecord

from .bank_pdf_base import (
    BankPdfStatementParser,
    StatementPeriod,
    group_words_into_rows,
    open_pdf,
    parse_date_dmy,
    parse_indian_amount,
    parse_period_text,
)

# Prefixes that indicate a new transaction description (not a ref-number tail)
_DESC_START_RE = re.compile(
    r"^(UPI/|ACH/|NEFT/|RTGS/|BIL/|CMS|MMT/|VPS/|IPS/|INF/|TOP/|EBA/|ISEC)"
)

# Column x-boundaries derived from header word positions
_COL_DATE_MAX = 75
_COL_PART_MAX = 370
_COL_DEP_MAX = 430
_COL_WDR_MAX = 518
_COL_BAL_MIN = 515

_DATE_RE = re.compile(r"\d{2}-\d{2}-\d{4}")


def _classify_word(x0: float) -> str | None:
    if x0 < _COL_DATE_MAX:
        return "date"
    if x0 < _COL_PART_MAX:
        return "particulars"
    if x0 < _COL_DEP_MAX:
        return "deposit"
    if x0 < _COL_WDR_MAX:
        return "withdrawal"
    if x0 >= _COL_BAL_MIN:
        return "balance"
    return None


def _classify_row(row_words: list[dict]) -> dict[str, str]:
    result: dict[str, str] = {
        "date": "",
        "particulars": "",
        "deposit": "",
        "withdrawal": "",
        "balance": "",
    }
    for w in sorted(row_words, key=lambda w: w["x0"]):
        text = w["text"].strip()
        if not text:
            continue
        col = _classify_word(w["x0"])
        if col:
            result[col] = (result[col] + " " + text).strip()
    return result


class ICICIBankPdfParser:
    """Parse ICICI bank account e-statement PDFs."""

    bank_name = "ICICI"

    def parse(
        self, pdf_bytes: bytes, password: str | None = None
    ) -> tuple[AccountMeta, list[TransactionRecord], StatementPeriod]:
        pdf = open_pdf(pdf_bytes, password)
        try:
            meta = self._extract_meta(pdf)
            period = self._extract_period(pdf)
            transactions = self._extract_transactions(pdf)
        finally:
            pdf.close()

        return meta, transactions, period

    def _extract_meta(self, pdf) -> AccountMeta:
        text = pdf.pages[0].extract_text() or ""

        holder = ""
        m = re.search(r"ACCOUNT HOLDERS\s*:\s*(.+)", text)
        if m:
            holder = m.group(1).strip()

        account = ""
        m = re.search(r"(?:Savings|Current) (?:Account|A/c)\s+(X+\d+)", text)
        if m:
            account = m.group(1)

        return AccountMeta(account_holder_name=holder, account_number=account)

    def _extract_period(self, pdf) -> StatementPeriod:
        text = pdf.pages[0].extract_text() or ""
        return parse_period_text(text)

    def _extract_transactions(self, pdf) -> list[TransactionRecord]:
        # All pages except last (footer/legends)
        pages = pdf.pages[:-1] if len(pdf.pages) > 1 else pdf.pages

        classified_rows: list[dict[str, str]] = []
        for page in pages:
            words = page.extract_words(
                keep_blank_chars=True, x_tolerance=2, y_tolerance=2
            )
            if not words:
                continue

            rows = group_words_into_rows(words)
            in_txn = False
            for row in rows:
                c = _classify_row(row)
                if "PARTICULARS" in c["particulars"]:
                    in_txn = True
                    continue
                if "Total:" in c["particulars"]:
                    continue
                if in_txn:
                    classified_rows.append(c)

        return self._build_transactions(classified_rows)

    def _build_transactions(
        self, rows: list[dict[str, str]]
    ) -> list[TransactionRecord]:
        """Group classified rows into transaction records.

        Description lines (no date/balance) precede their date+amount line.
        After a date+amount line, any text-only lines are UPI ref tails
        until a new description starts (detected by _DESC_START_RE).
        """
        transactions: list[TransactionRecord] = []
        desc_buffer: list[str] = []

        for row in rows:
            has_date = bool(_DATE_RE.match(row["date"]))
            has_balance = bool(row["balance"])

            if has_date and has_balance:
                if row["particulars"].strip() == "B/F":
                    desc_buffer = []
                    continue

                desc_parts = desc_buffer + (
                    [row["particulars"]] if row["particulars"] else []
                )
                full_desc = " ".join(desc_parts)

                txn_date = parse_date_dmy(row["date"])
                if not txn_date:
                    desc_buffer = []
                    continue

                deposit = parse_indian_amount(row["deposit"])
                withdrawal = parse_indian_amount(row["withdrawal"])
                balance = parse_indian_amount(row["balance"])

                transactions.append(
                    TransactionRecord(
                        transaction_date=txn_date,
                        value_date=txn_date,  # e-statements don't have separate value date
                        description=full_desc.strip(),
                        cheque_number=None,
                        debit=withdrawal,
                        credit=deposit,
                        balance=balance or __import__("decimal").Decimal("0"),
                    )
                )
                desc_buffer = []
            elif row["particulars"]:
                text = row["particulars"]
                if _DESC_START_RE.match(text):
                    # New transaction description
                    desc_buffer.append(text)
                elif desc_buffer:
                    # Continuation of current description
                    desc_buffer[-1] = desc_buffer[-1] + " " + text
                # else: tail of previous txn's ref number — discard

        return transactions
