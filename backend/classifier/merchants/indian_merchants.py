KNOWN_MERCHANTS: dict[str, tuple[str, str]] = {
    # key: substring to match (lowercased)
    # value: (category, merchant_display_name)
    "swiggy": ("food", "Swiggy"),
    "zomato": ("food", "Zomato"),
    "zomatofd": ("food", "Zomato"),
    "dunzo": ("food", "Dunzo"),
    "blinkit": ("groceries", "Blinkit"),
    "bigbasket": ("groceries", "BigBasket"),
    "zepto": ("groceries", "Zepto"),
    "instamart": ("groceries", "Swiggy Instamart"),
    "jiomart": ("groceries", "JioMart"),
    "dmart": ("groceries", "DMart"),
    "amazon": ("ecommerce", "Amazon"),
    "flipkart": ("ecommerce", "Flipkart"),
    "myntra": ("clothing", "Myntra"),
    "ajio": ("clothing", "AJIO"),
    "nykaa": ("ecommerce", "Nykaa"),
    "meesho": ("ecommerce", "Meesho"),
    "uber": ("travel_transport", "Uber"),
    "ola": ("travel_transport", "Ola"),
    "rapido": ("travel_transport", "Rapido"),
    "irctc": ("travel_transport", "IRCTC"),
    "makemytrip": ("travel_transport", "MakeMyTrip"),
    "redbus": ("travel_transport", "RedBus"),
    "netflix": ("entertainment", "Netflix"),
    "hotstar": ("entertainment", "Hotstar"),
    "spotify": ("entertainment", "Spotify"),
    "primevideo": ("entertainment", "Prime Video"),
    "bookmyshow": ("entertainment", "BookMyShow"),
    "youtube": ("entertainment", "YouTube"),
    "groww": ("investment_finance", "Groww"),
    "zerodha": ("investment_finance", "Zerodha"),
    "kuvera": ("investment_finance", "Kuvera"),
    "paytm": ("transfers_payments", "Paytm"),
    "phonepe": ("transfers_payments", "PhonePe"),
    "gpay": ("transfers_payments", "Google Pay"),
    "cred": ("bills_utilities", "CRED"),
    "bajajfinserv": ("bills_utilities", "Bajaj Finserv"),
    "lic": ("bills_utilities", "LIC"),
    "tatapower": ("bills_utilities", "Tata Power"),
    "bescom": ("bills_utilities", "BESCOM"),
    "airtel": ("bills_utilities", "Airtel"),
    "jio": ("bills_utilities", "Jio"),
    "practo": ("healthcare", "Practo"),
    "pharmeasy": ("healthcare", "PharmEasy"),
    "1mg": ("healthcare", "1mg"),
    "apollo": ("healthcare", "Apollo"),
    "byju": ("education", "Byju's"),
    "unacademy": ("education", "Unacademy"),
    "udemy": ("education", "Udemy"),
    "coursera": ("education", "Coursera"),
    "urbancompany": ("services_misc", "Urban Company"),
}


def lookup_merchant(description: str) -> tuple[str, str, float] | None:
    desc_lower = description.lower()
    for key, (category, name) in KNOWN_MERCHANTS.items():
        if key in desc_lower:
            return category, name, 0.99
    return None
