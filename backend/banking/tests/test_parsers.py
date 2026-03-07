"""
Parser tests for ICICI and IDFC bank statement parsers.

Synthetic XLSX fixtures are built in-memory with polars (no extra test deps).

Real-file integration tests (skipped unless files are present):
  Place actual statements in banking/tests/fixtures/ — they are gitignored.
  Expected filenames:  icici_sample.xls[x]  |  idfc_sample.xlsx
"""
import io
from datetime import date
from decimal import Decimal
from pathlib import Path

import polars as pl
import pytest

from banking.parsers.icici import ICICIParser
from banking.parsers.idfc import IDFCParser

FIXTURES_DIR = Path(__file__).parent / "fixtures"

# ── Synthetic fixture builders ────────────────────────────────────────────────

_ICICI_COLS = [
    "S No.", "Value Date", "Transaction Date", "Cheque Number",
    "Transaction Remarks", "Withdrawal Amount(INR)", "Deposit Amount(INR)", "Balance(INR)",
]
_IDFC_COLS = [
    "Transaction Date", "Value Date", "Particulars",
    "Cheque No.", "Debit", "Credit", "Balance",
]


def _write_flat(rows: list[list], n_cols: int) -> bytes:
    cols = [f"c{i}" for i in range(n_cols)]
    buf = io.BytesIO()
    pl.DataFrame(rows, schema=cols, orient="row").write_excel(buf, include_header=False, autofilter=False)
    return buf.getvalue()


def icici_xlsx(txn_rows: list[dict]) -> bytes:
    """Build ICICI-format XLSX: 11 metadata rows, row 11 = header, rows 12+ = data."""
    meta = [["Statement"] + [""] * 7] * 11
    data = [[row.get(c, "") for c in _ICICI_COLS] for row in txn_rows]
    return _write_flat(meta + [_ICICI_COLS] + data, 8)


def idfc_xlsx(txn_rows: list[dict], account_number: str = "123456", holder: str = "Test User") -> bytes:
    """Build IDFC-format XLSX: 14 metadata rows, row 14 = header, rows 15+ = data."""
    meta = [[""] * 7] * 14
    meta[2] = ["Customer Name", holder, "", "", "", "", ""]
    meta[3] = ["Account Number", account_number, "", "", "", "", ""]
    data = [[row.get(c, "") for c in _IDFC_COLS] for row in txn_rows]
    return _write_flat(meta + [_IDFC_COLS] + data, 7)


def _find_fixture(*names: str) -> Path | None:
    for name in names:
        p = FIXTURES_DIR / name
        if p.exists():
            return p
    return None


# ── ICICI: date parsing ───────────────────────────────────────────────────────

class TestICICIParseDate:
    p = ICICIParser()

    @pytest.mark.parametrize("val,expected", [
        ("15/03/2025", date(2025, 3, 15)),
        ("01/01/2024", date(2024, 1, 1)),
    ])
    def test_valid(self, val, expected):
        assert self.p._parse_date(val) == expected

    @pytest.mark.parametrize("val", [None, "", "not-a-date", "15-Mar-2025"])
    def test_invalid_returns_none(self, val):
        assert self.p._parse_date(val) is None


# ── ICICI: decimal parsing ────────────────────────────────────────────────────

class TestICICIParseDecimal:
    p = ICICIParser()

    @pytest.mark.parametrize("val,expected", [
        ("1234.56", Decimal("1234.56")),
        ("1,23,456.78", Decimal("123456.78")),
    ])
    def test_valid(self, val, expected):
        assert self.p._parse_decimal(val) == expected

    @pytest.mark.parametrize("val", [None, "", "0", "0.0", "nan", "-500"])
    def test_falsy_returns_none(self, val):
        assert self.p._parse_decimal(val) is None


# ── IDFC: date parsing ────────────────────────────────────────────────────────

class TestIDFCParseDate:
    p = IDFCParser()

    @pytest.mark.parametrize("val,expected", [
        ("16-Jan-2025", date(2025, 1, 16)),
        ("31-Dec-2024", date(2024, 12, 31)),
        ("05-MAR-2025", date(2025, 3, 5)),   # uppercase month
        ("16/01/2025",  date(2025, 1, 16)),  # slash fallback
    ])
    def test_valid(self, val, expected):
        assert self.p._parse_date(val) == expected

    @pytest.mark.parametrize("val", [None, "nan", "not-a-date"])
    def test_invalid_returns_none(self, val):
        assert self.p._parse_date(val) is None


# ── ICICI: end-to-end parse() ─────────────────────────────────────────────────

class TestICICIParse:
    p = ICICIParser()

    def test_debit_row(self):
        _, txns = self.p.parse(icici_xlsx([{
            "S No.": "1", "Value Date": "15/03/2025", "Transaction Date": "15/03/2025",
            "Transaction Remarks": "Swiggy order",
            "Withdrawal Amount(INR)": "450.00", "Balance(INR)": "10000.00",
        }]))
        t = list(txns)[0]
        assert t["transaction_date"] == date(2025, 3, 15)
        assert t["debit"] == Decimal("450.00")
        assert t["credit"] is None
        assert t["balance"] == Decimal("10000.00")
        assert t["description"] == "Swiggy order"

    def test_credit_row(self):
        _, txns = self.p.parse(icici_xlsx([{
            "S No.": "1", "Value Date": "01/04/2025", "Transaction Date": "01/04/2025",
            "Transaction Remarks": "Salary",
            "Deposit Amount(INR)": "50000.00", "Balance(INR)": "60000.00",
        }]))
        t = list(txns)[0]
        assert t["credit"] == Decimal("50000.00")
        assert t["debit"] is None

    def test_blank_rows_skipped(self):
        _, txns = self.p.parse(icici_xlsx([
            {"S No.": "1", "Transaction Date": "10/03/2025", "Value Date": "10/03/2025",
             "Transaction Remarks": "Valid", "Withdrawal Amount(INR)": "100", "Balance(INR)": "900"},
            {},  # blank row — no Transaction Date, must be skipped
        ]))
        assert len(list(txns)) == 1

    def test_value_date_falls_back_to_txn_date(self):
        _, txns = self.p.parse(icici_xlsx([{
            "S No.": "1", "Transaction Date": "10/06/2025",
            "Transaction Remarks": "ATM", "Withdrawal Amount(INR)": "2000", "Balance(INR)": "8000",
        }]))
        t = list(txns)[0]
        assert t["value_date"] == t["transaction_date"]

    def test_cheque_number_preserved(self):
        _, txns = self.p.parse(icici_xlsx([{
            "S No.": "1", "Value Date": "05/05/2025", "Transaction Date": "05/05/2025",
            "Cheque Number": "CHQ123", "Transaction Remarks": "Cheque",
            "Withdrawal Amount(INR)": "5000", "Balance(INR)": "20000",
        }]))
        assert list(txns)[0]["cheque_number"] == "CHQ123"


# ── IDFC: end-to-end parse() ──────────────────────────────────────────────────

class TestIDFCParse:
    p = IDFCParser()

    def test_debit_row(self):
        _, txns = self.p.parse(idfc_xlsx([{
            "Transaction Date": "16-Jan-2025", "Value Date": "16-Jan-2025",
            "Particulars": "UPI-Zomato", "Debit": "350.00", "Balance": "15000.00",
        }]))
        t = list(txns)[0]
        assert t["transaction_date"] == date(2025, 1, 16)
        assert t["debit"] == Decimal("350.00")
        assert t["credit"] is None

    def test_credit_row(self):
        _, txns = self.p.parse(idfc_xlsx([{
            "Transaction Date": "01-Mar-2025", "Value Date": "01-Mar-2025",
            "Particulars": "NEFT-Salary", "Credit": "75000.00", "Balance": "90000.00",
        }]))
        t = list(txns)[0]
        assert t["credit"] == Decimal("75000.00")
        assert t["debit"] is None

    def test_blank_rows_skipped(self):
        _, txns = self.p.parse(idfc_xlsx([
            {"Transaction Date": "10-Feb-2025", "Value Date": "10-Feb-2025",
             "Particulars": "Valid", "Debit": "100", "Balance": "5000"},
            {},  # blank row — must be skipped
        ]))
        assert len(list(txns)) == 1

    def test_meta_extraction(self):
        meta, _ = self.p.parse(idfc_xlsx(
            [{"Transaction Date": "01-Jan-2025", "Value Date": "01-Jan-2025",
              "Particulars": "Test", "Debit": "100", "Balance": "900"}],
            account_number="987654321", holder="Rahul Sharma",
        ))
        assert meta["account_number"] == "987654321"
        assert meta["account_holder_name"] == "Rahul Sharma"

    def test_amount_with_commas(self):
        _, txns = self.p.parse(idfc_xlsx([{
            "Transaction Date": "15-Jun-2025", "Value Date": "15-Jun-2025",
            "Particulars": "Rent", "Debit": "25,000.00", "Balance": "1,00,000.00",
        }]))
        t = list(txns)[0]
        assert t["debit"] == Decimal("25000.00")
        assert t["balance"] == Decimal("100000.00")

    def test_value_date_falls_back_to_txn_date(self):
        _, txns = self.p.parse(idfc_xlsx([{
            "Transaction Date": "20-Apr-2025",
            "Particulars": "ATM", "Debit": "3000", "Balance": "12000",
        }]))
        t = list(txns)[0]
        assert t["value_date"] == t["transaction_date"]


# ── Real-file integration (skipped unless fixture files present) ───────────────

@pytest.fixture
def icici_file():
    path = _find_fixture("icici_sample.xls", "icici_sample.xlsx")
    if path is None:
        pytest.skip("Place icici_sample.xls[x] in banking/tests/fixtures/ to run")
    return path.read_bytes()


@pytest.fixture
def idfc_file():
    path = _find_fixture("idfc_sample.xlsx")
    if path is None:
        pytest.skip("Place idfc_sample.xlsx in banking/tests/fixtures/ to run")
    return path.read_bytes()


class TestICICIRealFile:
    p = ICICIParser()

    def test_parses_transactions(self, icici_file):
        _, txns = self.p.parse(icici_file)
        result = list(txns)
        assert len(result) > 0

    def test_all_dates_valid(self, icici_file):
        _, txns = self.p.parse(icici_file)
        for t in txns:
            assert isinstance(t["transaction_date"], date)
            assert isinstance(t["value_date"], date)

    def test_each_row_has_debit_or_credit(self, icici_file):
        _, txns = self.p.parse(icici_file)
        for t in txns:
            assert t["debit"] is not None or t["credit"] is not None

    def test_balance_non_negative(self, icici_file):
        _, txns = self.p.parse(icici_file)
        for t in txns:
            assert t["balance"] >= Decimal("0")


class TestIDFCRealFile:
    p = IDFCParser()

    def test_parses_transactions(self, idfc_file):
        _, txns = self.p.parse(idfc_file)
        assert len(list(txns)) > 0

    def test_all_dates_valid(self, idfc_file):
        _, txns = self.p.parse(idfc_file)
        for t in txns:
            assert isinstance(t["transaction_date"], date)
            assert isinstance(t["value_date"], date)

    def test_each_row_has_debit_or_credit(self, idfc_file):
        _, txns = self.p.parse(idfc_file)
        for t in txns:
            assert t["debit"] is not None or t["credit"] is not None

    def test_meta_extracted(self, idfc_file):
        meta, _ = self.p.parse(idfc_file)
        assert meta["account_number"] != ""
