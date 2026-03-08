ENTITY_EXTRACTION_PROMPT = """Extract the following entities from this bank transaction description:
- merchant_name: The business or merchant name
- recipient_name: The person or entity receiving money
- bank_name: Any bank name mentioned

Transaction: {description}

Return JSON with keys: merchant_name, recipient_name, bank_name. Use empty string if not found."""

CATEGORY_CLASSIFICATION_PROMPT = """Classify this bank transaction into exactly one category.

Categories: food, groceries, clothing, entertainment, ecommerce, travel_transport, bills_utilities, healthcare, education, investment_finance, services_misc, transfers_payments

Transaction: {description}
Merchant: {merchant}

Return JSON with keys: category, confidence (0-1 float)."""
