from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class ExtractedEntities:
    merchant_name: str = ""
    payment_channel: str = ""
    bank_name: str = ""
    recipient_name: str = ""
    upi_handle: str = ""


@dataclass
class ClassificationResult:
    category: str = "uncategorized"
    confidence: float = 0.0


class EntityExtractor(Protocol):
    def extract(self, description: str) -> ExtractedEntities: ...
    def extract_batch(self, descriptions: list[str]) -> list[ExtractedEntities]: ...


class CategoryClassifier(Protocol):
    def classify(self, description: str, merchant: str) -> ClassificationResult: ...
    def classify_batch(self, items: list[tuple[str, str]]) -> list[ClassificationResult]: ...
