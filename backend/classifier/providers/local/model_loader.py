import threading
from pathlib import Path

from django.conf import settings


_gliner_model = None
_gliclass_model = None
_gliner_lock = threading.Lock()
_gliclass_lock = threading.Lock()

GLINER_MODEL_ID = "urchade/gliner_small-v2.1"
GLICLASS_MODEL_ID = "knowledgator/gliclass-small-v1.0"


def _cache_dir() -> str:
    return getattr(settings, "CLASSIFIER_MODEL_CACHE_DIR", str(Path.home() / ".cache" / "finnlens" / "models"))


def get_gliner_model():
    global _gliner_model
    if _gliner_model is None:
        with _gliner_lock:
            if _gliner_model is None:
                from gliner import GLiNER
                _gliner_model = GLiNER.from_pretrained(
                    GLINER_MODEL_ID,
                    cache_dir=_cache_dir(),
                )
    return _gliner_model


def get_gliclass_model():
    global _gliclass_model
    if _gliclass_model is None:
        with _gliclass_lock:
            if _gliclass_model is None:
                from gliclass import GLiClassModel, ZeroShotClassificationPipeline
                from transformers import AutoTokenizer
                model = GLiClassModel.from_pretrained(
                    GLICLASS_MODEL_ID,
                    cache_dir=_cache_dir(),
                )
                tokenizer = AutoTokenizer.from_pretrained(
                    GLICLASS_MODEL_ID,
                    cache_dir=_cache_dir(),
                )
                _gliclass_model = ZeroShotClassificationPipeline(model, tokenizer)
    return _gliclass_model
