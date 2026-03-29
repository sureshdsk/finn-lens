from gmail.parsers.bill import BillParser
from gmail.parsers.base import DataType


def test_bill_parser_extracts_due_date_amount_and_biller():
    parser = BillParser()

    results = parser.parse(
        sender="alerts@tatapower.com",
        subject="Tata Power bill for March 2026",
        body="Your bill amount is Rs 2,340.00. Due date: 18/03/2026. Please pay on time.",
    )

    assert len(results) == 1
    result = results[0]
    assert result.data_type == DataType.BILL_NOTICE
    assert result.amount == 2340.0
    assert result.currency == "INR"
    assert str(result.transaction_date) == "2026-03-18"
    assert result.merchant_or_provider == "Tata Power"
    assert result.extra["due_date"] == "2026-03-18"
