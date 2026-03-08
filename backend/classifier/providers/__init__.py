from django.conf import settings

from .base import EntityExtractor, CategoryClassifier


def get_extractor() -> EntityExtractor:
    provider = getattr(settings, "CLASSIFIER_PROVIDER", "local")
    if provider == "local":
        from .local.gliner_provider import GLiNERExtractor
        return GLiNERExtractor()
    raise ValueError(f"Unknown classifier provider: {provider}")


def get_classifier() -> CategoryClassifier:
    provider = getattr(settings, "CLASSIFIER_PROVIDER", "local")
    if provider == "local":
        from .local.gliclass_provider import GLiClassClassifier
        return GLiClassClassifier()
    raise ValueError(f"Unknown classifier provider: {provider}")
