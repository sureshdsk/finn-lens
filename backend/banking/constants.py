"""Shared constants for banking and gmail apps."""

# Domain → issuer code mapping (single source of truth)
DOMAIN_TO_ISSUER: dict[str, str] = {
    "hdfcbank.net": "HDFC",
    "icicibank.com": "ICICI",
    "axisbank.com": "AXIS",
    "axis.bank.in": "AXIS",
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


# Known recurring services and billers: normalized merchant pattern → metadata
KNOWN_SUBSCRIPTIONS: dict[str, dict[str, str]] = {
    "netflix": {"name": "Netflix", "category": "streaming", "icon": "🎬", "color": "hsl(0 70% 50%)"},
    "spotify": {"name": "Spotify", "category": "music", "icon": "🎵", "color": "hsl(145 100% 50%)"},
    "youtube premium": {"name": "YouTube Premium", "category": "entertainment", "icon": "📺", "color": "hsl(0 85% 55%)"},
    "amazon prime": {"name": "Amazon Prime", "category": "shopping", "icon": "📦", "color": "hsl(40 100% 55%)"},
    "hotstar": {"name": "Hotstar", "category": "streaming", "icon": "⭐", "color": "hsl(220 70% 55%)"},
    "disney plus": {"name": "Disney+ Hotstar", "category": "streaming", "icon": "⭐", "color": "hsl(220 70% 55%)"},
    "icloud": {"name": "iCloud+", "category": "cloud", "icon": "☁️", "color": "hsl(210 80% 60%)"},
    "google one": {"name": "Google One", "category": "cloud", "icon": "☁️", "color": "hsl(210 70% 55%)"},
    "google storage": {"name": "Google One", "category": "cloud", "icon": "☁️", "color": "hsl(210 70% 55%)"},
    "chatgpt": {"name": "ChatGPT Plus", "category": "productivity", "icon": "🤖", "color": "hsl(175 100% 50%)"},
    "openai": {"name": "ChatGPT Plus", "category": "productivity", "icon": "🤖", "color": "hsl(175 100% 50%)"},
    "claude": {"name": "Claude Pro", "category": "productivity", "icon": "🤖", "color": "hsl(30 80% 55%)"},
    "anthropic": {"name": "Claude Pro", "category": "productivity", "icon": "🤖", "color": "hsl(30 80% 55%)"},
    "zerodha": {"name": "Zerodha", "category": "finance", "icon": "📈", "color": "hsl(270 80% 65%)"},
    "linkedin premium": {"name": "LinkedIn Premium", "category": "other", "icon": "💼", "color": "hsl(210 90% 45%)"},
    "linkedin": {"name": "LinkedIn Premium", "category": "other", "icon": "💼", "color": "hsl(210 90% 45%)"},
    "jio": {"name": "Jio", "category": "utilities", "icon": "📱", "color": "hsl(210 90% 55%)"},
    "airtel": {"name": "Airtel", "category": "utilities", "icon": "📱", "color": "hsl(0 80% 50%)"},
    "notion": {"name": "Notion", "category": "productivity", "icon": "📝", "color": "hsl(0 0% 40%)"},
    "github": {"name": "GitHub", "category": "productivity", "icon": "💻", "color": "hsl(0 0% 30%)"},
    "dropbox": {"name": "Dropbox", "category": "cloud", "icon": "📦", "color": "hsl(210 80% 55%)"},
    "adobe": {"name": "Adobe Creative Cloud", "category": "productivity", "icon": "🎨", "color": "hsl(0 85% 50%)"},
    "apple music": {"name": "Apple Music", "category": "music", "icon": "🎵", "color": "hsl(340 80% 55%)"},
    "apple tv": {"name": "Apple TV+", "category": "streaming", "icon": "📺", "color": "hsl(0 0% 30%)"},
    "xbox": {"name": "Xbox Game Pass", "category": "gaming", "icon": "🎮", "color": "hsl(120 80% 45%)"},
    "playstation": {"name": "PlayStation Plus", "category": "gaming", "icon": "🎮", "color": "hsl(210 90% 50%)"},
    "audible": {"name": "Audible", "category": "entertainment", "icon": "🎧", "color": "hsl(35 90% 50%)"},
    "kindle unlimited": {"name": "Kindle Unlimited", "category": "entertainment", "icon": "📚", "color": "hsl(35 90% 50%)"},
    "swiggy one": {"name": "Swiggy One", "category": "other", "icon": "🍔", "color": "hsl(25 100% 55%)"},
    "zomato pro": {"name": "Zomato Pro", "category": "other", "icon": "🍔", "color": "hsl(0 80% 50%)"},
    "cult.fit": {"name": "cult.fit", "category": "fitness", "icon": "💪", "color": "hsl(350 80% 50%)"},
    "curefit": {"name": "cult.fit", "category": "fitness", "icon": "💪", "color": "hsl(350 80% 50%)"},
    "tata power": {"name": "Tata Power", "category": "utilities", "icon": "⚡", "color": "hsl(35 95% 50%)"},
    "bescom": {"name": "BESCOM", "category": "utilities", "icon": "⚡", "color": "hsl(45 95% 48%)"},
    "adani electricity": {"name": "Adani Electricity", "category": "utilities", "icon": "⚡", "color": "hsl(20 90% 50%)"},
    "broadband": {"name": "Broadband", "category": "utilities", "icon": "📶", "color": "hsl(205 85% 55%)"},
    "fiber": {"name": "Fiber", "category": "utilities", "icon": "📶", "color": "hsl(205 85% 55%)"},
    "electricity": {"name": "Electricity Bill", "category": "utilities", "icon": "⚡", "color": "hsl(45 95% 48%)"},
    "insurance premium": {"name": "Insurance Premium", "category": "insurance", "icon": "🛡️", "color": "hsl(190 75% 45%)"},
    "hdfc life": {"name": "HDFC Life", "category": "insurance", "icon": "🛡️", "color": "hsl(190 75% 45%)"},
    "lic": {"name": "LIC", "category": "insurance", "icon": "🛡️", "color": "hsl(200 70% 45%)"},
    "policybazaar": {"name": "Policybazaar", "category": "insurance", "icon": "🛡️", "color": "hsl(210 85% 50%)"},
}
