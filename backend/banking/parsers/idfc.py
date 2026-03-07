"""IDFC First Bank XLSX statement parser.

Expected format:
- Rows 0–13: metadata (customer name, account number, period, etc.)
- Row 14 (0-indexed): column headers
- Rows 15+: transaction data

Columns: Transaction Date, Value Date, Particulars, Cheque No., Debit, Credit, Balance
Date format: DD-Mon-YYYY (e.g. 16-Jan-2025)
"""
import io
from decimal import Decimal, InvalidOperation
from datetime import date, datetime
from typing import Iterator

import polars as pl

from banking.protocols import AccountMeta, TransactionRecord

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


class IDFCParser:
    bank_name = "IDFC"

    def parse(self, file_bytes: bytes) -> tuple[AccountMeta, Iterator[TransactionRecord]]:
        buf = io.BytesIO(file_bytes)

        # Read full sheet without skipping to extract metadata from rows 0-13
        raw = pl.read_excel(buf, sheet_id=1, has_header=False)

        meta = self._extract_meta(raw)

        # Re-read with row 14 (0-indexed) as the header
        buf.seek(0)
        df = pl.read_excel(buf, sheet_id=1, read_options={"header_row": 14})
        col_map = {c: c.strip() for c in df.columns}
        df = df.rename(col_map)

        return meta, self._iter_rows(df)

    def _extract_meta(self, raw: pl.DataFrame) -> AccountMeta:
        meta: AccountMeta = {"account_holder_name": "", "account_number": ""}
        for row in raw.head(14).iter_rows():
            row_vals = [str(v).strip() for v in row if v is not None and str(v).strip()]
            for i, val in enumerate(row_vals):
                low = val.lower()
                if "account number" in low or "a/c no" in low:
                    # next non-empty cell
                    if i + 1 < len(row_vals):
                        meta["account_number"] = row_vals[i + 1]
                if "name" in low and "customer" in low:
                    if i + 1 < len(row_vals):
                        meta["account_holder_name"] = row_vals[i + 1]
        return meta

    def _parse_date(self, val) -> date | None:
        if not val:
            return None
        s = str(val).strip()
        if not s or s.lower() in ("none", "nan"):
            return None
        # Try DD-Mon-YYYY
        parts = s.split("-")
        if len(parts) == 3:
            try:
                day = int(parts[0])
                month = MONTH_MAP.get(parts[1].lower()[:3])
                year = int(parts[2])
                if month:
                    return date(year, month, day)
            except (ValueError, KeyError):
                pass
        # Fallback: try polars / datetime parse
        try:
            return datetime.strptime(s, "%d/%m/%Y").date()
        except ValueError:
            pass
        return None

    def _parse_decimal(self, val) -> Decimal | None:
        if val is None:
            return None
        s = str(val).replace(",", "").strip()
        if s in ("", "nan", "None"):
            return None
        try:
            d = Decimal(s)
            return d if d > 0 else None
        except InvalidOperation:
            return None

    def _iter_rows(self, df: pl.DataFrame) -> Iterator[TransactionRecord]:
        cols = {c.lower(): c for c in df.columns}

        def find(key: str) -> str | None:
            for k, v in cols.items():
                if key in k:
                    return v
            return None

        col_txn_date = find("transaction date")
        col_val_date = find("value date")
        col_desc = find("particular") or find("description")
        col_cheque = find("cheque")
        col_debit = find("debit")
        col_credit = find("credit")
        col_balance = find("balance")

        for row in df.iter_rows(named=True):
            txn_date = self._parse_date(row.get(col_txn_date) if col_txn_date else None)
            if txn_date is None:
                continue

            val_date = self._parse_date(row.get(col_val_date) if col_val_date else None)

            yield TransactionRecord(
                transaction_date=txn_date,
                value_date=val_date or txn_date,
                description=str(row.get(col_desc) or "").strip(),
                cheque_number=str(row.get(col_cheque) or "").strip() or None,
                debit=self._parse_decimal(row.get(col_debit) if col_debit else None),
                credit=self._parse_decimal(row.get(col_credit) if col_credit else None),
                balance=self._parse_decimal(row.get(col_balance) if col_balance else None) or Decimal("0"),
            )
