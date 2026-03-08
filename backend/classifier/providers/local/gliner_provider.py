import re

from ..base import ExtractedEntities
from .model_loader import get_gliner_model

_LABELS = ["merchant_name", "bank_name", "recipient_name"]
_THRESHOLD = 0.3
_CLEAN_RE = re.compile(r"[/\-]")


def _preprocess(desc: str) -> str:
    return _CLEAN_RE.sub(" ", desc)


class GLiNERExtractor:
    def extract(self, description: str) -> ExtractedEntities:
        return self.extract_batch([description])[0]

    def extract_batch(self, descriptions: list[str]) -> list[ExtractedEntities]:
        model = get_gliner_model()
        cleaned = [_preprocess(d) for d in descriptions]
        batch_entities = model.inference(
            cleaned, _LABELS, threshold=_THRESHOLD
        )

        results = []
        for entities in batch_entities:
            result = ExtractedEntities()
            for ent in entities:
                label = ent["label"]
                text = ent["text"].strip()
                if label == "merchant_name" and not result.merchant_name:
                    result.merchant_name = text
                elif label == "bank_name" and not result.bank_name:
                    result.bank_name = text
                elif label == "recipient_name" and not result.recipient_name:
                    result.recipient_name = text
            results.append(result)
        return results
