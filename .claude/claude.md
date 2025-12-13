# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinnLens is a privacy-first web application that analyzes Google Pay transaction history and generates personalized financial insights in a Spotify Wrapped-style story format. All data processing happens entirely in the browser with no server-side processing.

**Critical Privacy Principle**: Never add any network calls or external dependencies that could leak user data. The app must function completely offline after initial load.

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Type check and lint
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test                # Run tests in watch mode
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage report
```

## Tech Stack

- **React 19** with TypeScript (strict mode)
- **Vite** (build tool)
- **Zustand** (state management - see dataStore.ts)
- **React Router** (navigation)
- **JSZip** (ZIP extraction)
- **PapaParse** (CSV parsing)
- **html2canvas** (image generation)
- **Tailwind CSS** (styling)
- **Vitest** (testing)
- **@tanstack/react-table** (data tables)
- **animejs** (animations)

## Architecture Overview

### Data Flow Pipeline

1. **Upload** → User uploads Google Takeout ZIP file (Landing.tsx)
2. **Extraction** → ZIP extracted with JSZip (zipParser.ts)
3. **Parsing** → CSV/JSON/HTML parsed into typed objects (csvParser.ts, jsonParser.ts, htmlParser.ts)
4. **Storage** → Stored in Zustand + sessionStorage (dataStore.ts)
5. **Calculation** → Insight engine calculates 8-12 insights (insightEngine.ts)
6. **Display** → Story mode with swipeable cards (Story.tsx)
7. **Export** → Generate shareable images (html2canvas)

### Google Takeout File Structure

The app looks for these files in the ZIP:
- `Google transactions/transactions_*.csv` - Transaction history
- `Google Pay/Group expenses/Group expenses.json` - Split bills
- `Google Pay/Rewards earned/Cashback rewards.csv` - Cashback
- `Google Pay/Rewards earned/Voucher rewards.json` - Vouchers
- `Google Pay/Money remittances and requests/*.csv` - Transfers
- `My Activity/Google Pay/MyActivity.html` - Activity feed

### Key Data Structures

**Transaction**
```typescript
interface Transaction {
  time: Date;
  id: string;
  description: string;
  product: string;
  method: string;
  status: string;
  amount: Currency;
  category?: TransactionCategory;
}
```

**ActivityRecord** (from My Activity HTML)
```typescript
interface ActivityRecord {
  title: string;
  time: Date;
  transactionType?: 'sent' | 'received' | 'paid' | 'request' | 'other';
  amount?: Currency;
  recipient?: string;
  sender?: string;
  category?: TransactionCategory;
}
```

**GroupExpense**
```typescript
interface GroupExpense {
  creationTime: Date;
  creator: string;
  groupName: string;
  totalAmount: Currency;
  state: 'ONGOING' | 'COMPLETED' | 'CLOSED';
  title: string;
  items: GroupExpenseItem[];
}
```

### Insight Engine Architecture

The insight engine (`src/engines/insightEngine.ts`) orchestrates 18+ individual calculators:

**Calculator Pattern**: Each calculator in `src/engines/calculators/` follows this pattern:
```typescript
export function calculateXInsight(data: ParsedData): Insight | null {
  // Return null if insufficient data
  if (data.transactions.length === 0) return null;

  // Calculate insight-specific metrics
  // Return structured Insight object
}
```

**Insight Categories**:
- **Transaction-based**: Domain purchases, expensive days, timelines
- **Social**: Group expenses, split partners, money network
- **Rewards**: Cashback, vouchers
- **Activity-based**: Money flow, peak activity, spending categories
- **Funny**: Midnight shopper, smallest payment, round number obsession

**Year Filtering**: All data filtering happens in `dateUtils.ts` using `filterXByYear()` functions before passing to calculators.

### State Management

**Zustand Store** (`src/stores/dataStore.ts`):
- Holds `rawData` (string contents from ZIP)
- Holds `parsedData` (typed TypeScript objects)
- Holds `insights` (calculated insights array)
- Manages `selectedYear` filter with automatic insight recalculation
- Persists in sessionStorage (cleared on tab close)

**Key Store Methods**:
- `parseRawData()` - Parse raw strings into typed objects
- `recalculateInsights(year)` - Filter data and run insight engine
- `setSelectedYear(year)` - Change year filter and auto-recalculate

### Google JSON Anti-XSSI Handling

Google JSON files start with `)]}'\n` to prevent XSSI attacks. The `jsonParser.ts` strips this prefix before parsing:
```typescript
if (jsonString.startsWith(")]}'\n")) {
  jsonString = jsonString.substring(5);
}
```

## File Naming Conventions

- **Components**: PascalCase (`DropZone.tsx`)
- **Utilities**: camelCase (`zipParser.ts`)
- **Types**: camelCase with `.types.ts` suffix (`data.types.ts`)
- **Stores**: camelCase with `Store` suffix (`dataStore.ts`)
- **Calculators**: camelCase with `Calculator` suffix (`domainCalculator.ts`)
- **Tests**: Same name as file with `.test.ts` suffix (`csvParser.test.ts`)

## Development Guidelines

### Adding a New Insight

1. Define insight type in `types/insight.types.ts`:
   ```typescript
   export type InsightType = 'existing_types' | 'new_insight_type';

   export interface NewInsightData {
     // Define data structure
   }
   ```

2. Create calculator in `engines/calculators/newInsightCalculator.ts`:
   ```typescript
   export function calculateNewInsight(data: ParsedData): Insight<NewInsightData> | null {
     // Return null if insufficient data
     // Calculate metrics
     // Return Insight object
   }
   ```

3. Add to `engines/insightEngine.ts`:
   ```typescript
   import { calculateNewInsight } from './calculators/newInsightCalculator';

   const newInsight = calculateNewInsight(filteredData);
   if (newInsight) insights.push(newInsight);
   ```

4. Create display component in `components/story/insights/NewInsightCard.tsx`

5. Add to story rotation in `Story.tsx`

### Adding Tests

The project uses Vitest with happy-dom. Tests are colocated with utilities:

```bash
# Run specific test file
npm test csvParser.test.ts

# Run tests in watch mode (default)
npm test

# Run with UI
npm run test:ui
```

Test files exist for:
- `csvParser.test.ts` - CSV parsing
- `currencyUtils.test.ts` - Currency parsing
- `htmlParser.test.ts` - HTML parsing
- `jsonParser.test.ts` - JSON parsing

### Parsing New Data Types

1. Define interface in `types/data.types.ts`
2. Add parser function in `utils/` (handle errors gracefully)
3. Update `zipParser.ts` to extract the file from ZIP
4. Update Zustand `dataStore.ts` to parse and store data
5. Add to `ParsedData` and `RawExtractedData` interfaces
6. Write tests in `utils/yourParser.test.ts`

## Testing Strategy

- Test with real Google Takeout exports
- Handle missing/optional files gracefully
- Test with empty datasets (return null insights)
- Test with large datasets (1000+ transactions)
- Test year filtering edge cases
- Test currency parsing (INR/USD, with ₹/$ symbols)
- Test Google's anti-XSSI prefix stripping

## Debugging Tips

- Check browser console for parsing errors
- Use React DevTools to inspect Zustand store state
- Verify ZIP file structure matches expected paths
- Check CSV headers match expected format (`Time`, `Description`, `Amount`, etc.)
- Ensure JSON files are valid after removing `)]}'\n` prefix
- Use `console.log` statements in calculators to debug insight calculations
- Check Network tab to ensure no external requests (privacy violation)

## Known Limitations

- Only supports Google Pay data format
- Requires manual Google Takeout export
- Limited to browser's memory capacity (~100MB ZIP files)
- No data persistence across sessions (intentional for privacy)
- Currency support: INR and USD only

## Important Implementation Notes

### Currency Parsing
`currencyUtils.ts` handles multiple formats:
- `₹1,234.56` or `Rs 1,234.56` → INR
- `$1,234.56` or `USD 1,234.56` → USD
- Returns `{ value: number, currency: 'INR' | 'USD' }`

### Date Filtering
`dateUtils.ts` provides year filtering functions:
- `filterTransactionsByYear(transactions, '2025')` → only 2025 data
- `filterTransactionsByYear(transactions, 'all')` → all data
- Supports `YearFilter = 'all' | '2024' | '2025' | '2026'`

### Category Classification
`categoryUtils.ts` classifies transactions into categories:
- Shopping, Food & Dining, Bills & Utilities, Entertainment, etc.
- Used for spending category insights
- Pattern matching on transaction descriptions

### Performance Considerations
- Process large datasets efficiently (1000+ transactions typical)
- Use `Array.filter()` and `Array.reduce()` for aggregations
- Calculators should return quickly (<100ms each)
- Lazy load insight display components where possible
- Keep bundle size small (currently ~2MB with dependencies)
