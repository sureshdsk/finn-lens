# Transaction Classification Guide

## How It Works

Every transaction goes through a 4-stage pipeline. Each stage is a fast-exit — if an earlier stage classifies with high confidence, later stages are skipped.

```
Raw Description
     │
     ▼
┌─────────────┐
│ 1. Regex    │  Extracts: payment_channel (UPI/NEFT/IMPS/...), upi_handle
│             │  Does NOT classify — just extracts structured fields
└──────┬──────┘
       ▼
┌─────────────┐
│ 2. Merchant │  Substring match against ~50 known Indian merchants
│    Lookup   │  "zomato" in description → Food (0.99 confidence)
│             │  Instant, no ML needed
└──────┬──────┘
       ▼ (only if no merchant match)
┌─────────────┐
│ 3. User     │  Checks if you've previously corrected a similar transaction
│  Overrides  │  Matches on first 30 chars of description
│             │  If found → uses your category (0.95 confidence)
└──────┬──────┘
       ▼ (only if no override match)
┌─────────────┐
│ 4. ML       │  GLiNER extracts: merchant_name, recipient_name, bank_name
│  Pipeline   │  GLiClass classifies into one of 12 categories
│             │  Confidence varies (typically 0.3–0.99)
└─────────────┘
```

### Categories

| Slug | What it covers |
|------|---------------|
| food | Restaurants, food delivery (Swiggy, Zomato, dining out) |
| groceries | Grocery stores, supermarkets (BigBasket, Blinkit, DMart) |
| clothing | Apparel, fashion (Myntra, AJIO) |
| entertainment | Streaming, movies, events (Netflix, BookMyShow) |
| ecommerce | Online shopping (Amazon, Flipkart, Nykaa) |
| travel_transport | Cabs, trains, flights (Uber, IRCTC, MakeMyTrip) |
| bills_utilities | Phone, electricity, insurance, EMIs (Airtel, CRED) |
| healthcare | Medical, pharmacy (Apollo, PharmEasy) |
| education | Courses, edtech (Udemy, Coursera) |
| investment_finance | Mutual funds, stocks, trading (Groww, Zerodha) |
| services_misc | Home services, repairs (Urban Company) |
| transfers_payments | Person-to-person transfers, wallet loads |

## When Classification Goes Wrong

### Problem 1: Known merchant missing from lookup

**Symptom**: A well-known merchant like "Dunzo Daily" gets classified by ML instead of instant lookup, often landing in the wrong category.

**Fix**: Add it to `backend/classifier/merchants/indian_merchants.py`:

```python
KNOWN_MERCHANTS = {
    # ... existing entries ...
    "dunzo daily": ("groceries", "Dunzo Daily"),
}
```

The key is a lowercase substring that appears in the transaction description. Re-run classification:

```bash
# Reset affected transactions first
cd backend && uv run python manage.py shell -c "
from banking.models import Transaction
Transaction.objects.filter(
    description__icontains='dunzo daily',
    is_user_categorized=False,
).update(category='uncategorized', category_confidence=0.0, merchant_name='')
"

# Re-classify
cd backend && uv run python manage.py shell -c "
from banking.models import BankAccount
from classifier.services import classify_account_transactions
for acc in BankAccount.objects.all():
    classify_account_transactions(acc.pk)
"
```

### Problem 2: ML puts transactions in the wrong category

**Symptom**: A gym membership payment gets classified as "entertainment" instead of "healthcare".

**Option A — One-off fix via UI**: Click the category badge on the transaction → select the correct category. This creates a `UserCategoryOverride` record. Future transactions with the same description prefix (first 30 chars) will use your correction automatically.

**Option B — Bulk fix via shell**:

```bash
cd backend && uv run python manage.py shell -c "
from banking.models import Transaction
from classifier.services import override_transaction_category

# Find and fix all gym-related transactions
for txn in Transaction.objects.filter(description__icontains='cult.fit'):
    override_transaction_category(txn.pk, 'healthcare')
    print(f'Fixed: {txn.description[:60]}')
"
```

### Problem 3: Merchant name extracted incorrectly

**Symptom**: GLiNER extracts "HDFC BANK" as the merchant instead of "Swiggy" from a UPI transaction.

This happens because bank names appear prominently in UPI descriptions. The merchant lookup (stage 2) handles known merchants correctly, but for unknown merchants GLiNER may pick the wrong entity.

**Fix**: Add the merchant to the known merchants dict (see Problem 1). The merchant lookup runs before GLiNER and takes priority.

### Problem 4: UPI handle not extracted

**Symptom**: `upi_handle` is empty even though the description contains one.

The regex expects the pattern: `something/handle@bank/something` with `/` or `-` delimiters around the handle.

**Fix**: Check the actual description format and update the regex in `backend/classifier/extractors/regex_extractor.py`:

```python
# Current pattern
_UPI_HANDLE_RE = re.compile(r"[/\-]([a-zA-Z0-9._]+@[a-zA-Z]+)[/\-\s]")

# If your bank uses a different delimiter, adjust accordingly
```

## Optimising Classification Quality

### 1. Grow the merchant dictionary

The merchant lookup is the most reliable stage — 0.99 confidence, zero ML overhead. Every merchant you add there is one fewer transaction that needs ML.

Look at your uncategorized or low-confidence transactions:

```bash
cd backend && uv run python manage.py shell -c "
from banking.models import Transaction
from collections import Counter

# Find common descriptions that aren't well-classified
low = Transaction.objects.filter(category_confidence__lt=0.5)
words = []
for t in low[:500]:
    # Extract likely merchant keywords from description
    for part in t.description.split('/'):
        part = part.strip().lower()
        if len(part) > 3 and not part.isdigit():
            words.append(part)

for word, count in Counter(words).most_common(20):
    print(f'{count:4d}  {word}')
"
```

Then add the frequent ones to `indian_merchants.py`.

### 2. Use user overrides strategically

When you correct a category in the UI, the system remembers it by matching the first 30 characters of the description. So correcting one "UPI/123/SomeShop" transaction will auto-apply to all transactions starting with "UPI/123/SomeShop".

Prioritise correcting transactions from merchants you use frequently.

### 3. Check classification stats

```bash
cd backend && uv run python manage.py shell -c "
from banking.models import Transaction
from django.db.models import Count, Avg

stats = Transaction.objects.values('category').annotate(
    count=Count('id'),
    avg_confidence=Avg('category_confidence'),
).order_by('-count')

print(f'{\"Category\":<25} {\"Count\":>6} {\"Avg Conf\":>8}')
print('-' * 42)
for s in stats:
    print(f'{s[\"category\"]:<25} {s[\"count\"]:>6} {s[\"avg_confidence\"]:>8.2f}')

user_set = Transaction.objects.filter(is_user_categorized=True).count()
print(f'\nUser-corrected: {user_set}')
"
```

Categories with low average confidence are where you should focus your merchant dictionary additions.

### 4. Re-classify after improvements

After adding merchants or correcting categories:

```bash
cd backend && uv run python manage.py shell -c "
from banking.models import Transaction, BankAccount
from classifier.services import classify_account_transactions

# Reset non-user-categorized transactions to re-run pipeline
Transaction.objects.filter(is_user_categorized=False).update(
    category='uncategorized',
    category_confidence=0.0,
    merchant_name='',
)

for acc in BankAccount.objects.all():
    n = classify_account_transactions(acc.pk)
    print(f'{acc}: {n} classified')
"
```

User-corrected transactions (`is_user_categorized=True`) are never touched during re-classification.
