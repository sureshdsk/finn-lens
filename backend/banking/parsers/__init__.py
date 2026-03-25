"""Statement PDF parsers — CC statements and bank account e-statements.

CC statement parsers (one per card issuer):
    from banking.parsers.cc_base import get_cc_parser
    parser = get_cc_parser("ICICI")

Bank account e-statement parsers (one per bank):
    from banking.parsers.bank_pdf_base import get_bank_pdf_parser
    parser = get_bank_pdf_parser("ICICI")

To add a new bank:
    CC:   Create <bank>_cc.py, register below
    Bank: Create <bank>_bank_pdf.py, register below
"""
# ── CC statement parsers ─────────────────────────────────────────────────
from .cc_base import register_cc_parser
from .icici_cc import ICICICCStatementParser
from .axis_cc import AxisCCStatementParser
from .generic_cc import GenericCCStatementParser

register_cc_parser(ICICICCStatementParser())
register_cc_parser(AxisCCStatementParser())
register_cc_parser(GenericCCStatementParser())  # fallback for unknown issuers

# ── Bank account e-statement PDF parsers ─────────────────────────────────
from .bank_pdf_base import register_bank_pdf_parser
from .icici_bank_pdf import ICICIBankPdfParser

register_bank_pdf_parser(ICICIBankPdfParser())
