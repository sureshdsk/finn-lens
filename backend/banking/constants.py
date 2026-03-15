"""Shared constants for banking and gmail apps."""

# Domain → issuer code mapping (single source of truth)
DOMAIN_TO_ISSUER: dict[str, str] = {
    "hdfcbank.net": "HDFC",
    "icicibank.com": "ICICI",
    "axisbank.com": "AXIS",
    "sbicard.com": "SBI",
    "kotak.com": "KOTAK",
    "indusind.com": "INDUSIND",
    "sc.com": "SC",
    "rblbank.com": "RBL",
    "yesbank.in": "YES",
    "citibank.com": "CITI",
    "amex.com": "AMEX",
    "hsbc.co.in": "HSBC",
}

CC_DOMAINS: list[str] = list(DOMAIN_TO_ISSUER.keys())


def infer_issuer(sender: str) -> str:
    """Infer card issuer code from an email sender address."""
    sender_lower = sender.lower()
    for domain, issuer in DOMAIN_TO_ISSUER.items():
        if domain in sender_lower:
            return issuer
    return "OTHER"
