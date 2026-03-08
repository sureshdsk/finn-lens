from ..base import ClassificationResult
from .model_loader import get_gliclass_model

CATEGORY_LABELS = [
    "food",
    "groceries",
    "clothing",
    "entertainment",
    "ecommerce",
    "travel and transport",
    "bills and utilities",
    "healthcare",
    "education",
    "investment and finance",
    "services and miscellaneous",
    "transfers and payments",
]

_LABEL_TO_SLUG = {
    "food": "food",
    "groceries": "groceries",
    "clothing": "clothing",
    "entertainment": "entertainment",
    "ecommerce": "ecommerce",
    "travel and transport": "travel_transport",
    "bills and utilities": "bills_utilities",
    "healthcare": "healthcare",
    "education": "education",
    "investment and finance": "investment_finance",
    "services and miscellaneous": "services_misc",
    "transfers and payments": "transfers_payments",
}


class GLiClassClassifier:
    def classify(self, description: str, merchant: str) -> ClassificationResult:
        return self.classify_batch([(description, merchant)])[0]

    def classify_batch(self, items: list[tuple[str, str]]) -> list[ClassificationResult]:
        pipeline = get_gliclass_model()
        results = []
        for description, merchant in items:
            text = f"{merchant} {description}" if merchant else description
            output = pipeline(text, CATEGORY_LABELS)
            # output is list[list[dict]] — outer list per input, inner sorted by score
            preds = output[0] if output else []
            if preds and preds[0]["score"] > 0.1:
                label = preds[0]["label"]
                slug = _LABEL_TO_SLUG.get(label, "uncategorized")
                results.append(ClassificationResult(category=slug, confidence=preds[0]["score"]))
            else:
                results.append(ClassificationResult())
        return results
