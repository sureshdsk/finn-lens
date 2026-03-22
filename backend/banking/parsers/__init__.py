"""CC statement PDF parsers — one per bank issuer.

Usage:
    from banking.parsers.cc_base import get_cc_parser

    parser = get_cc_parser("ICICI")
    for record in parser.parse(pdf_bytes, password="..."):
        print(record.transaction_date, record.amount, record.description)

To add a new bank:
    1. Create <bank>_cc.py with a class that has `issuer = "BANK_CODE"`
       and a `parse(pdf_bytes, password) -> Iterator[CCTransactionRecord]` method
    2. Import and register it below
"""
from .cc_base import register_cc_parser
from .icici_cc import ICICICCStatementParser
from .axis_cc import AxisCCStatementParser
from .generic_cc import GenericCCStatementParser

register_cc_parser(ICICICCStatementParser())
register_cc_parser(AxisCCStatementParser())
register_cc_parser(GenericCCStatementParser())  # fallback for unknown issuers
