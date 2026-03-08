# Transaction Classification System — GLiNER + GLiClass

## Context

Bank statement transactions have raw descriptions like `UPI/409880816679/UPIIntent/zomatofd.payu@h/HDFC BANK LTD/...` that need to be parsed into structured entities and classified into spending categories. The app runs locally on user machines (CPU, no GPU), so we need lightweight models. GLiNER handles entity extraction, GLiClass handles zero-shot category classification.

## Architecture: Provider-Based Pipeline

```
Upload → Parse → Store → Classify → Display
                          ↓
         1. Regex pre-extract (payment_channel, upi_handle)
         2. Known merchant lookup (Swiggy, Zomato, etc → instant category)
         3. User override lookup (historical corrections)
         4. Entity extraction via provider (GLiNER / Cloud LLM)
         5. Category classification via provider (GLiClass / Cloud LLM)
         6. bulk_update() all enriched fields
```

### Provider Abstraction

Steps 4 & 5 go through a **provider interface** so the backend can be swapped:

```
providers/
  base.py              # Abstract base: EntityExtractor, CategoryClassifier protocols
  local/
    gliner_provider.py   # GLiNER ONNX (default, offline)
    gliclass_provider.py # GLiClass ONNX (default, offline)
  cloud/
    gemini_provider.py   # Google Gemini API (future)
    openai_provider.py   # GPT API (future)
```

**Base protocols** (`providers/base.py`):
```python
from typing import Protocol

class EntityExtractor(Protocol):
    def extract(self, description: str) -> ExtractedEntities: ...
    def extract_batch(self, descriptions: list[str]) -> list[ExtractedEntities]: ...

class CategoryClassifier(Protocol):
    def classify(self, description: str, merchant: str) -> ClassificationResult: ...
    def classify_batch(self, items: list[tuple[str, str]]) -> list[ClassificationResult]: ...
```

**Configuration** via Django settings:
```python
CLASSIFIER_PROVIDER = "local"  # or "gemini", "openai"
CLASSIFIER_API_KEY = ""        # only needed for cloud providers
```

The pipeline orchestrator (`services.py`) gets the active provider from settings and calls the protocol methods. Cloud providers are not implemented now — just the interface is defined so adding them later is a one-file addition.

## Implementation Steps

### Step 1: Add fields to Transaction model
**File:** `backend/banking/models.py`

Add to `Transaction`:
- `category` — CharField(max_length=30, default="uncategorized", db_index=True)
- `category_confidence` — FloatField(default=0.0)
- `merchant_name` — CharField(max_length=255, blank=True, default="")
- `payment_channel` — CharField(max_length=20, blank=True, default="") — UPI/NEFT/IMPS/CMS/RTGS
- `recipient_name` — CharField(max_length=255, blank=True, default="")
- `upi_handle` — CharField(max_length=255, blank=True, default="")
- `is_user_categorized` — BooleanField(default=False)

Categories (13): food, groceries, clothing, entertainment, ecommerce, travel_transport, bills_utilities, healthcare, education, investment_finance, services_misc, transfers_payments, uncategorized

### Step 2: Create `classifier` Django app
**New directory:** `backend/classifier/`

```
classifier/
  __init__.py
  apps.py
  models.py              # UserCategoryOverride audit trail
  services.py             # Pipeline orchestrator (uses active provider)
  api.py                  # BoltAPI routes
  views.py                # ViewSets
  serializers.py          # msgspec Structs
  extractors/
    __init__.py
    regex_extractor.py    # Regex for payment_channel, upi_handle
  merchants/
    __init__.py
    indian_merchants.py   # Known merchant → category lookup dict
  providers/
    __init__.py           # get_extractor() / get_classifier() factory
    base.py               # EntityExtractor + CategoryClassifier protocols
    local/
      __init__.py
      model_loader.py     # Thread-safe singleton for ONNX models
      gliner_provider.py  # GLiNER ONNX entity extraction
      gliclass_provider.py # GLiClass ONNX classification
    cloud/
      __init__.py
      base_llm.py         # Shared prompt templates for LLM providers
      # gemini_provider.py  — future
      # openai_provider.py  — future
  tests/
    __init__.py
    test_regex_extractor.py
    test_entity_extractor.py
    test_category_classifier.py
    test_pipeline.py
```

### Step 3: Provider abstraction + local model loader
- `providers/base.py` — `EntityExtractor` and `CategoryClassifier` Protocol classes
- `providers/__init__.py` — factory: `get_extractor()` / `get_classifier()` reads `settings.CLASSIFIER_PROVIDER` and returns the right implementation
- `providers/local/model_loader.py` — thread-safe singleton, ONNX runtime
- Models: `urchade/gliner_small-v2.1` and `knowledgator/gliclass-small-v1.0`
- Cache to `~/.cache/finnlens/models/`
- `providers/cloud/base_llm.py` — shared prompt templates (implement provider later, just define the interface now)

### Step 4: `extractors/regex_extractor.py` — Fast structured extraction
- Regex for payment_channel: `^(UPI|NEFT|IMPS|CMS|RTGS|ACH)`
- Regex for upi_handle: `UPI/\d+/.+?/(.+?@\w+)/`
- Runs before GLiNER (reliable for structured fields)

### Step 5: `providers/local/gliner_provider.py` — GLiNER NER (implements EntityExtractor)
- Labels: merchant_name, payment_channel, bank_name, recipient_name, upi_handle
- Pre-process: replace `/` and `-` with spaces for better tokenization
- Threshold: 0.3

### Step 6: `merchants/indian_merchants.py` — Known merchant lookup
- Dict of ~30+ Indian merchants: swiggy→food, zomato→food, groww→investment_finance, etc.
- Substring match on description, returns (category, merchant_name, 0.99 confidence)
- Runs before ML — fast path for known brands

### Step 7: `providers/local/gliclass_provider.py` — GLiClass zero-shot (implements CategoryClassifier)
- 12 category labels
- Input: description + extracted merchant_name for context
- Returns (category_slug, confidence)

### Step 8: `services.py` — Pipeline orchestrator
- `classify_account_transactions(account_id)` — classifies all uncategorized txns
- Pipeline per transaction: regex → merchant lookup → user override check → provider.extract → provider.classify
- `bulk_update()` at end for DB efficiency

### Step 9: `models.py` — UserCategoryOverride
- FK to Transaction, stores original_category, new_category, created_at
- Used as training signal: before classification, check if user previously categorized same merchant

### Step 10: API endpoints
- `POST /api/classifier/accounts/{id}/classify/` — trigger classification
- `PUT /api/classifier/transactions/{id}/category/` — user override
- `GET /api/classifier/categories/` — list categories

### Step 11: Integrate with upload flow (auto-classify after upload)
**File:** `backend/banking/views.py`

After `import_statement` succeeds, automatically call `classify_account_transactions(account.pk)` and return classified count in the upload response. No manual trigger needed.

### Step 12: Update serializers
**File:** `backend/banking/serializers.py`

Add category, merchant_name, payment_channel, confidence to TransactionSchema.

### Step 13: Dependencies
```bash
cd backend
uv add gliner gliclass transformers onnxruntime
# No PyTorch needed — using ONNX runtime for inference
```

Add `"classifier"` to `INSTALLED_APPS` in settings.py.

### Step 14: Migration
```bash
cd backend && uv run python manage.py makemigrations banking classifier
cd backend && uv run python manage.py migrate
```

## Verification

1. Run migration successfully
2. Upload IDFC sample statement → check transactions get category fields populated
3. Verify known merchants (zomato, swiggy) get instant classification without ML
4. Verify unknown merchants go through GLiNER → GLiClass pipeline
5. Test user override endpoint — verify is_user_categorized=True and audit trail created
6. Re-classify same account — verify user-categorized txns are skipped
7. Run `uv run python manage.py test classifier` for unit tests
