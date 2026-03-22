"""email_extractor — standalone module to extract structured financial data from email text.

Extracts credit card statement details (total due, min due, due date, billing period,
card number, PDF password) from email subject + body HTML. No Django or ORM dependencies.

Usage:
    from banking.email_extractor import extract_cc_statement

    result = extract_cc_statement(subject="...", body_html="...")
    print(result.total_due, result.billing_period_start)
"""

from .cc_statement import CCStatementExtract, extract_cc_statement
from .cc_payment import CCPaymentExtract, extract_cc_payment

__all__ = [
    "CCStatementExtract", "extract_cc_statement",
    "CCPaymentExtract", "extract_cc_payment",
]
