# Classification Rules Guide

## Overview

FinnLens uses a **unified configuration file** for all transaction categorization rules:

**Location**: `src/config/classification-rules.json`

This single file contains:
- Category definitions with keywords and patterns
- Exact merchant matches
- Exclusion rules
- Fuzzy keyword mappings

## File Structure

```json
{
  "version": "2.0",
  "categories": { ... },
  "exclusions": { ... },
  "fuzzyKeywords": { ... }
}
```

## Categories

Each category has three classification methods:

### 1. Keywords (Layer 4 - Priority 4)
Array of keywords to match in transaction descriptions (case-insensitive substring matching).

```json
"Travel & Transport": {
  "keywords": [
    "uber",
    "ola",
    "fuel",
    "petrol"
  ]
}
```

### 2. Patterns (Layer 5 - Priority 5)
Regex patterns for advanced matching.

```json
"patterns": [
  "^uber.*",
  ".*fuel.*station"
]
```

### 3. Exact Matches (Layer 2 - Priority 2)
Exact merchant name matches (highest priority, case-insensitive).

```json
"exactMatches": {
  "SHOBA FUELS": true,
  "ANGEL ONE LTD PROPRIETARY AC": true
}
```

## Exclusions (Layer 1 - Priority 1)

Transactions matching exclusion rules are categorized as "Transfers & Payments" and **skip all other layers**.

### Payment Gateways
```json
"payment_gateways": [
  "cashfree",
  "razorpay",
  "paytm gateway"
]
```

### Bank ISOs (Regex patterns)
```json
"bank_isos": [
  "^(?!ANGEL).*NSE$",  // Exclude NSE but allow ANGEL NSE
  ".*BANK LIMITED$"
]
```

### Personal Name Indicators
```json
"personal_indicators": [
  "^MR ",
  "^MS ",
  "^MRS "
]
```

### Technical Terms
```json
"technical_terms": [
  "CLOUDIFY TECHNOLOGIES"
]
```

## Fuzzy Keywords (Layer 3 - Priority 3)

Handles common misspellings and variations.

```json
"fuzzyKeywords": {
  "biryani": ["biriyani", "briyani", "biryani"],
  "parotta": ["parota", "paratha", "parotta"]
}
```

## Classification Priority

The classifier processes transactions in this order:

1. **Layer 1 - Exclusions** (Priority 1)
   - If matched → "Transfers & Payments"
   - Skip all other layers

2. **Layer 2 - Exact Matches** (Priority 2)
   - If matched → Return category
   - Confidence: 1.0

3. **Layer 3 - Fuzzy Keywords** (Priority 3)
   - If matched → Return category
   - Confidence: 0.95

4. **Layer 4 - Standard Keywords** (Priority 4)
   - If matched → Return category
   - Confidence: 0.9

5. **Layer 5 - Pattern Matching** (Priority 5)
   - If matched → Return category
   - Confidence: 0.85

6. **Layer 6 - Heuristics** (Priority 6)
   - Context-based rules (amount, company suffixes, etc.)
   - Confidence: 0.7

7. **No Match**
   - Return "Uncategorized"
   - Confidence: 0

## How to Add New Rules

### Adding a Keyword

Edit `src/config/classification-rules.json`:

```json
"Travel & Transport": {
  "keywords": [
    "uber",
    "fuel",
    "rapido"  // ← Add new keyword here
  ]
}
```

### Adding an Exact Match

```json
"Investment & Finance": {
  "exactMatches": {
    "ANGEL ONE": true,
    "UPSTOX LTD": true  // ← Add new exact match
  }
}
```

### Adding an Exclusion

```json
"exclusions": {
  "payment_gateways": [
    "razorpay",
    "stripe"  // ← Add new gateway
  ]
}
```

### Adding a Fuzzy Keyword

```json
"fuzzyKeywords": {
  "biryani": ["biriyani", "briyani", "biryani"],
  "restaurant": ["resturant", "restraunt"]  // ← Add variations
}
```

## Example: Adding Fuel Station

**Scenario**: You want to categorize "Shoba Fuels" as Travel & Transport.

**Solution 1 - Exact Match** (Recommended for specific merchants):
```json
"Travel & Transport": {
  "exactMatches": {
    "SHOBA FUELS": true
  }
}
```

**Solution 2 - Keyword** (For general matching):
```json
"Travel & Transport": {
  "keywords": [
    "fuel",
    "petrol",
    "shoba"
  ]
}
```

**Best Practice**: Use exact matches for specific merchants, keywords for general categories.

## Available Categories

- `Food`
- `Groceries`
- `Clothing`
- `Entertainment`
- `E-commerce`
- `Travel & Transport`
- `Bills & Utilities`
- `Healthcare`
- `Education`
- `Investment & Finance`
- `Services & Miscellaneous`
- `Transfers & Payments` (auto-assigned by exclusions)

## Testing Your Changes

1. Edit `src/config/classification-rules.json`
2. Save the file (Vite will auto-reload)
3. Upload your Google Takeout file
4. Check the categorization in the Data Table view

## Migration from Old Files

**Before** (2 files):
- `src/categories.json` - Keywords only
- `src/config/classifier-config.json` - Exact matches & exclusions

**After** (1 file):
- `src/config/classification-rules.json` - Everything unified

The old files have been deleted. All rules are now in the unified file.

## Debugging Tips

If a transaction is miscategorized:

1. **Check exclusions first** - They override everything
2. **Check exact matches** - Highest priority for matching
3. **Check keywords** - Case-insensitive substring matching
4. **Check patterns** - Regex matching
5. **Enable debug logs** - See `src/utils/multi-layer-classifier.ts`

Example debug output:
```
Transaction: "ANGEL LTD NSE"
→ Layer 1 (Exclusions): Not excluded
→ Layer 2 (Exact Match): Matched "ANGEL LTD NSE" → "Investment & Finance"
→ Result: Investment & Finance (confidence: 1.0)
```

## Common Patterns

### Excluding Stock Exchanges but Allowing Brokers
```json
"bank_isos": [
  "^(?!ANGEL).*NSE$"  // Negative lookahead: exclude NSE except ANGEL
]
```

### Matching Company Suffixes
```json
"patterns": [
  ".*PRIVATE LIMITED$",
  ".*PVT LTD$"
]
```

### Small Personal Transfers
The heuristic layer auto-detects small transfers (< ₹500) to all-caps names as "Transfers & Payments".

## Best Practices

1. **Use exact matches for well-known brands** (Zerodha, Swiggy, etc.)
2. **Use keywords for general categories** (fuel, food, grocery)
3. **Use patterns sparingly** (complex regex can slow down classification)
4. **Test thoroughly** with your actual transaction data
5. **Add new merchants as you discover them** in your data

## Version History

- **v2.0** (Current) - Unified configuration file with 6-layer classification
- **v1.0** (Legacy) - Separate categories.json and classifier-config.json

---

Need help? Check the implementation in `src/utils/multi-layer-classifier.ts`
