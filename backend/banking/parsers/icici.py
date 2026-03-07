"""ICICI Bank XLS statement parser.

Expected format:
- Rows 0–10: metadata / headers
- Row 11 (0-indexed): column headers
- Rows 12+: transaction data

Columns: S No., Value Date, Transaction Date, Cheque Number,
         Transaction Remarks, Withdrawal Amount(INR), Deposit Amount(INR), Balance(INR)
Date format: DD/MM/YYYY
"""
import io
from decimal import Decimal, InvalidOperation
from datetime import date
from typing import Iterator

import polars as pl

from banking.protocols import AccountMeta, TransactionRecord


class ICICIParser:
    bank_name = "ICICI"

    def parse(self, file_bytes: bytes) -> tuple[AccountMeta, Iterator[TransactionRecord]]:
        # Read XLS using fastexcel via polars — skip first 11 rows, treat row 11 as header
        buf = io.BytesIO(file_bytes)
        df = pl.read_excel(buf, sheet_id=1, read_options={"header_row": 12})

        # Normalize column names
        col_map = {c: c.strip() for c in df.columns}
        df = df.rename(col_map)

        meta: AccountMeta = {
            "account_holder_name": "",
            "account_number": "",
        }

        return meta, self._iter_rows(df)

    def _parse_date(self, val: str | None) -> date | None:
        if not val:
            return None
        val = str(val).strip()
        try:
            d, m, y = val.split("/")
            return date(int(y), int(m), int(d))
        except Exception:
            return None

    def _parse_decimal(self, val) -> Decimal | None:
        if val is None:
            return None
        s = str(val).replace(",", "").strip()
        if s in ("", "nan", "None", "0.0", "0"):
            return None
        try:
            d = Decimal(s)
            return d if d > 0 else None
        except InvalidOperation:
            return None

    def _iter_rows(self, df: pl.DataFrame) -> Iterator[TransactionRecord]:
        # Find actual column names (fuzzy match)
        cols = {c.lower(): c for c in df.columns}

        def find(key: str) -> str | None:
            for k, v in cols.items():
                if key in k:
                    return v
            return None

        col_value_date = find("value date")
        col_txn_date = find("transaction date")
        col_cheque = find("cheque")
        col_desc = find("remarks") or find("description")
        col_withdrawal = find("withdrawal")
        col_deposit = find("deposit")
        col_balance = find("balance")

        for row in df.iter_rows(named=True):
            txn_date = self._parse_date(row.get(col_txn_date) if col_txn_date else None)
            val_date = self._parse_date(row.get(col_value_date) if col_value_date else None)

            if txn_date is None:
                continue  # skip blank / summary rows

            yield TransactionRecord(
                transaction_date=txn_date,
                value_date=val_date or txn_date,
                description=str(row.get(col_desc) or "").strip(),
                cheque_number=str(row.get(col_cheque) or "").strip() or None,
                debit=self._parse_decimal(row.get(col_withdrawal) if col_withdrawal else None),
                credit=self._parse_decimal(row.get(col_deposit) if col_deposit else None),
                balance=self._parse_decimal(row.get(col_balance) if col_balance else None) or Decimal("0"),
            )
