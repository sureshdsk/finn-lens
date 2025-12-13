# FinnLens - Implementation Plan

## Overview
Build a 100% offline, privacy-first Google Pay Wrapped web application using React and pure JavaScript. The app processes Google Takeout zip files in the browser, calculates 8-10 personalized financial insights in a story-mode format (like Spotify Wrapped), and generates shareable 1080x1080 social media images.

## Tech Stack (Confirmed)
- **Framework**: React with Vite + TypeScript
- **State Management**: Zustand (lightweight, simple, TypeScript support)
- **Data Parsing**: JSZip + PapaParse (TypeScript compatible)
- **Image Generation**: html2canvas (TypeScript types available)
- **Routing**: React Router (TypeScript support)
- **Storage**: sessionStorage (native browser API)
- **Future Enhancement**: AI SDK JS (TypeScript-first SDKs for Gen AI-powered insights)

## Data Structure
Google Pay export contains:
1. **Google Transactions CSV** - Domain purchases, app fees (2015-2023)
2. **Group Expenses JSON** - Split bills with states (ONGOING, COMPLETED, CLOSED)
3. **Cashback Rewards CSV** - Reward history (2017-2023)
4. **Voucher Rewards JSON** - 56 vouchers with expiry dates
5. **Money Remittances CSV** - Empty in current dataset

## Key Features
- **Year Filter**: "2025" (default) and "All Time" only
- **8-10 Insights**: Short & sweet format, quick 1-2 minute experience
- **Story Mode**: Sequential reveal with swipe navigation
- **Offline First**: All processing in browser, zero server communication
- **Image Export**: Multiple formats for social media (Instagram Square 1080x1080, Instagram Story 1080x1920, Twitter 1200x675)

## Project Structure

```
finnlens/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   ├── index.ts                  # Main type exports
│   │   ├── data.types.ts             # Data structure types
│   │   ├── insight.types.ts          # Insight types
│   │   ├── storage.types.ts          # Storage types
│   │   └── export.types.ts           # Image export types
│   ├── stores/
│   │   └── dataStore.ts              # Zustand store (global state)
│   ├── pages/
│   │   ├── Landing.tsx               # Upload page
│   │   ├── Processing.tsx            # Loading/progress page
│   │   ├── Story.tsx                 # Main story mode container
│   │   └── Error.tsx                 # Error handling
│   ├── components/
│   │   ├── upload/
│   │   │   ├── DropZone.tsx          # Drag-drop zip upload
│   │   │   └── FileValidator.tsx     # Validate zip structure
│   │   ├── story/
│   │   │   ├── InsightCard.tsx       # Individual insight display
│   │   │   ├── Navigation.tsx        # Next/Previous buttons
│   │   │   ├── Progress.tsx          # Progress indicator (1/10)
│   │   │   └── YearFilter.tsx        # Toggle: 2025 / All Time
│   │   ├── insights/
│   │   │   ├── DomainCollector.tsx
│   │   │   ├── GroupChampion.tsx
│   │   │   ├── VoucherHoarder.tsx
│   │   │   ├── SpendingTimeline.tsx
│   │   │   ├── SplitPartner.tsx
│   │   │   ├── RewardHunter.tsx
│   │   │   ├── ExpensiveDay.tsx
│   │   │   ├── ResponsibleOne.tsx
│   │   │   └── MoneyNetwork.tsx
│   │   └── export/
│   │       ├── ImageGenerator.tsx    # Canvas-based image export
│   │       ├── FormatSelector.tsx    # Format chooser UI
│   │       ├── ShareButton.tsx       # Download button
│   │       └── templates/
│   │           ├── SquareTemplate.tsx   # 1080x1080
│   │           ├── StoryTemplate.tsx    # 1080x1920
│   │           └── TwitterTemplate.tsx  # 1200x675
│   ├── utils/
│   │   ├── zipParser.ts              # JSZip wrapper
│   │   ├── csvParser.ts              # PapaParse wrapper
│   │   ├── jsonParser.ts             # JSON parsing utilities
│   │   ├── dataValidator.ts          # Schema validation
│   │   ├── currencyUtils.ts          # INR/USD conversion
│   │   ├── dateUtils.ts              # Date filtering
│   │   └── exportUtils.ts            # Image export helpers
│   ├── engines/
│   │   ├── insightEngine.ts          # Main calculation orchestrator
│   │   └── calculators/
│   │       ├── domainCalculator.ts
│   │       ├── groupCalculator.ts
│   │       ├── voucherCalculator.ts
│   │       ├── timelineCalculator.ts
│   │       ├── partnerCalculator.ts
│   │       ├── rewardCalculator.ts
│   │       ├── expensiveDayCalculator.ts
│   │       └── networkCalculator.ts
│   ├── constants/
│   │   ├── insights.ts               # Insight metadata
│   │   └── gradients.ts              # Gradient backgrounds
│   └── styles/
│       ├── global.css
│       └── variables.css
├── tsconfig.json                     # TypeScript configuration
├── tsconfig.node.json                # TypeScript config for Node
└── vite.config.ts                    # Vite config (TypeScript)
```

## TypeScript Type Definitions

### Core Data Types (`types/data.types.ts`)
```typescript
export interface Transaction {
  time: Date;
  id: string;
  description: string;
  product: string;
  method: string;
  status: string;
  amount: Currency;
}

export interface Currency {
  value: number;
  currency: 'INR' | 'USD';
}

export interface GroupExpense {
  creationTime: Date;
  creator: string;
  groupName: string;
  totalAmount: Currency;
  state: 'ONGOING' | 'COMPLETED' | 'CLOSED';
  title: string;
  items: GroupExpenseItem[];
}

export interface GroupExpenseItem {
  amount: Currency;
  state: 'PAID_RECEIVED' | 'UNPAID';
  payer: string;
}

export interface CashbackReward {
  date: Date;
  currency: 'INR' | 'USD';
  amount: number;
  description: string;
}

export interface Voucher {
  code: string;
  details: string;
  summary: string;
  expiryDate: Date;
}

export interface ParsedData {
  transactions: Transaction[];
  groupExpenses: GroupExpense[];
  cashbackRewards: CashbackReward[];
  voucherRewards: Voucher[];
}
```

### Insight Types (`types/insight.types.ts`)
```typescript
export type InsightType =
  | 'domain_collector'
  | 'group_champion'
  | 'voucher_hoarder'
  | 'spending_timeline'
  | 'split_partner'
  | 'reward_hunter'
  | 'expensive_day'
  | 'responsible_one'
  | 'money_network';

export type InsightTone = 'funny' | 'hard-hitting' | 'thoughtful' | 'social' | 'wholesome';

export interface Insight<T = any> {
  type: InsightType;
  title: string;
  data: T;
  message: string;
  tone?: InsightTone;
  aiMessage?: string | null;
  aiEnabled?: boolean;
}

export interface DomainInsightData {
  totalDomains: number;
  totalRenewals: number;
  totalSpent: number;
  mostRenewed: string | null;
  renewalCount: number;
}

export interface GroupChampionData {
  reliabilityScore: number;
  totalSplits: number;
  paidCount: number;
  totalCount: number;
}

// ... more insight data interfaces
```

### Store Types (`types/storage.types.ts`)
```typescript
export interface DataStore {
  // State
  rawData: RawExtractedData | null;
  parsedData: ParsedData | null;
  insights: Insight[];
  selectedYear: '2025' | 'all';

  // Actions
  setRawData: (data: RawExtractedData) => void;
  setParsedData: (data: ParsedData) => void;
  setInsights: (insights: Insight[]) => void;
  setSelectedYear: (year: '2025' | 'all') => void;
  recalculateInsights: (year: '2025' | 'all') => void;
}

export interface RawExtractedData {
  transactions?: string;
  groupExpenses?: string;
  cashbackRewards?: string;
  voucherRewards?: string;
}
```

## 8-10 Insights to Implement

### 1. Domain Collector (Funny)
- **Data**: Google transactions (domain renewals)
- **Calculation**: Count unique domains, total renewals, total spent
- **Message**: "You've renewed {X} domains, spending ₹{amount}!"

### 2. Group Expense Champion (Hard-hitting)
- **Data**: Group expenses (payment states)
- **Calculation**: Paid items / Total items = reliability %
- **Message**: "You paid {X} out of {Y} bills. {Z}% reliability!"

### 3. Voucher Hoarder (Funny)
- **Data**: Voucher rewards (expiry dates)
- **Calculation**: Expired vouchers vs active vouchers
- **Message**: "You let {X} out of {Y} vouchers expire!"

### 4. Your Spending Timeline (Thought-provoking)
- **Data**: All transactions (first to last date)
- **Calculation**: Date range, years/days since first transaction
- **Message**: "From {date} to {date}. {X} years of payments!"

### 5. Friend Who Always Splits (Social)
- **Data**: Group expenses (participant names)
- **Calculation**: Most frequent split partner (excluding self)
- **Message**: "{Name} is your split buddy. {X} expenses together!"

### 6. Reward Hunter Score (Gamified)
- **Data**: Cashback rewards
- **Calculation**: Sum of all rewards
- **Message**: "You earned ₹{X} in cashback rewards!"

### 7. Your Most Expensive Day (Hard-hitting)
- **Data**: Transactions grouped by date
- **Calculation**: Find day with highest total spending
- **Message**: "On {date}, you spent ₹{X}. Remember this day?"

### 8. The Responsible One (Wholesome)
- **Data**: Group expenses (creator field)
- **Calculation**: Count expenses where you're the creator
- **Message**: "You organized {X} group expenses. You're the planner!"

### 9. Your Money Network (Social)
- **Data**: Group expenses (unique participants)
- **Calculation**: Count unique people and groups
- **Message**: "You share expenses with {X} people across {Y} groups!"

### 10. Recurring Rituals (Pattern recognition)
- **Data**: Transactions with same description
- **Calculation**: Find recurring patterns (e.g., annual domain renewals)
- **Message**: "Every August 22 at 00:57, your domain renews. Like clockwork!"

## Implementation Phases

### Phase 1: Foundation & Data Pipeline (Week 1)

**Goal**: Upload zip → Extract files → Parse data → Store in memory

#### Day 1-2: Project Setup & Landing Page
1. Create Vite React + TypeScript app: `npm create vite@latest finnlens -- --template react-ts`
2. Install dependencies: `npm install zustand jszip papaparse html2canvas react-router-dom react-swipeable`
3. Install TypeScript types: `npm install -D @types/papaparse @types/node`
4. Setup folder structure (all directories above)
5. Create TypeScript types directory and base types:
   - `types/data.types.ts` - Transaction, GroupExpense, Reward, Voucher types
   - `types/insight.types.ts` - Insight interface, InsightType enum
6. Create Landing.tsx with drag-drop zone
7. Create DropZone component (file input + drag-drop)
8. Add file validation (must be .zip, show error otherwise)

**Critical Files**:
- `src/types/data.types.ts`
- `src/types/insight.types.ts`
- `src/pages/Landing.tsx`
- `src/components/upload/DropZone.tsx`

#### Day 3: Zip Extraction
1. Implement `utils/zipParser.ts` using JSZip with TypeScript
2. Define return types for extracted data
3. Extract all 5 files from Google Pay export:
   - Google transactions CSV (wildcard filename)
   - Group expenses JSON
   - Cashback rewards CSV
   - Voucher rewards JSON (remove )]}' prefix)
   - Money remittances CSV
4. Handle missing files gracefully (don't fail if optional files missing)
5. Return typed extracted data

**Critical Files**:
- `src/utils/zipParser.ts`

#### Day 4: Data Parsing
1. Implement `utils/csvParser.ts` using PapaParse with TypeScript generics
   - Parse transactions CSV → Array of Transaction objects
   - Parse cashback CSV → Array of CashbackReward objects
   - Use PapaParse types (@types/papaparse)
2. Implement `utils/jsonParser.ts` with strong typing
   - Parse group expenses JSON → Array of GroupExpense objects
   - Parse voucher JSON → Array of Voucher objects
   - Runtime validation to ensure data matches types
3. Implement `utils/currencyUtils.ts` with Currency types
   - Parse "INR 1,014.80" and "USD 25.00" formats
   - Convert to {value: number, currency: 'INR' | 'USD'}
   - Provide INR conversion function with type safety
4. Test with real Google Takeout data

**Critical Files**:
- `src/types/data.types.ts` - Core data types
- `src/utils/csvParser.ts`
- `src/utils/jsonParser.ts`
- `src/utils/currencyUtils.ts`

#### Day 5: State Management & Storage
1. Implement `stores/dataStore.ts` using Zustand with TypeScript
   - Define store interface with proper types
   - Store raw extracted data (typed)
   - Store parsed data objects (Transaction[], GroupExpense[], etc.)
   - Store calculated insights array (Insight[])
   - Store selected year ('2025' | 'all' as union type)
   - Actions: setRawData, setParsedData, setInsights, setSelectedYear, recalculateInsights
   - Use Zustand TypeScript patterns for type inference
2. Implement sessionStorage wrapper (optional, with type safety)
3. Create Processing.tsx page with loading state
4. Wire up data flow: Upload → Extract → Parse → Store

**Critical Files**:
- `src/types/storage.types.ts` - Store types
- `src/stores/dataStore.ts`
- `src/pages/Processing.tsx`

**Deliverable**: Upload zip → See parsed data logged in console

---

### Phase 2: Insight Calculation Engine (Week 2)

**Goal**: Parsed data → 8-10 calculated insights

#### Day 1: Engine Structure
1. Create `engines/insightEngine.js` - main orchestrator
2. Create all calculator files (9 files in calculators/)
3. Define insight object schema:
   ```js
   {
     type: 'domain_collector',
     title: 'Domain Collector',
     data: { /* calculator-specific data */ },
     message: 'Human-readable summary'
   }
   ```
4. Implement year filtering in `utils/dateUtils.js`
   - filterByYear(data, '2025' | 'all')
   - getYearRange(data) → {min, max}

**Critical Files**:
- `src/engines/insightEngine.js`
- `src/utils/dateUtils.js`

#### Day 2-3: Implement Calculators (Part 1)
1. **domainCalculator.js**
   - Extract domains from transaction descriptions
   - Count renewals per domain
   - Calculate total spent on domains
2. **groupCalculator.js**
   - Count paid vs unpaid items
   - Calculate reliability percentage
3. **voucherCalculator.js**
   - Compare expiry dates against current date
   - Count expired vs active vouchers
4. **timelineCalculator.js**
   - Find earliest and latest transaction dates
   - Calculate days/years between
5. **partnerCalculator.js**
   - Count unique participants in group expenses
   - Find most frequent partner (excluding self)

**Critical Files**:
- `src/engines/calculators/domainCalculator.js`
- `src/engines/calculators/groupCalculator.js`
- `src/engines/calculators/voucherCalculator.js`
- `src/engines/calculators/timelineCalculator.js`
- `src/engines/calculators/partnerCalculator.js`

#### Day 4: Implement Calculators (Part 2)
1. **rewardCalculator.js**
   - Sum all cashback rewards
   - Calculate average reward
2. **expensiveDayCalculator.js**
   - Group transactions by date
   - Find day with highest total spending
3. **responsibleCalculator.js**
   - Find expenses where user is creator
   - Count and sum amounts
4. **networkCalculator.js**
   - Extract unique participants
   - Count unique groups

**Critical Files**:
- `src/engines/calculators/rewardCalculator.js`
- `src/engines/calculators/expensiveDayCalculator.js`
- `src/engines/calculators/networkCalculator.js`

#### Day 5: Integration & Testing
1. Wire calculators into insightEngine.js
2. Call calculateAllInsights(parsedData, selectedYear)
3. Test with real data for both 2025 and All Time
4. Handle edge cases:
   - Empty datasets (return null, don't show insight)
   - Missing fields (graceful degradation)
   - Invalid dates (skip)
5. Ensure insights array has max 10 items

**Deliverable**: Upload zip → See 8-10 calculated insights in console

---

### Phase 3: Story Mode UI (Week 3)

**Goal**: Display insights in swipeable story format

#### Day 1: Story Page Layout
1. Create `pages/Story.jsx` with:
   - Swipe handlers (react-swipeable)
   - Current index state
   - Navigation buttons
   - Progress indicator
2. Create `components/story/Navigation.jsx`
   - Previous/Next buttons
   - Disabled states at edges
3. Create `components/story/Progress.jsx`
   - Dots indicator (1 of 10)
   - Current insight number

**Critical Files**:
- `src/pages/Story.jsx`
- `src/components/story/Navigation.jsx`
- `src/components/story/Progress.jsx`

#### Day 2: Insight Card System
1. Create `components/story/InsightCard.jsx`
   - Dynamic component loader based on insight.type
   - Map insight types to components
2. Create base insight component structure
3. Add fade-in animation when switching insights

**Critical Files**:
- `src/components/story/InsightCard.jsx`

#### Day 3-4: Individual Insight Components
1. Create 9 insight display components:
   - DomainCollector.jsx - Show domain count, total spent, most renewed
   - GroupChampion.jsx - Show reliability %, paid/total ratio
   - VoucherHoarder.jsx - Show expired vs active, waste %
   - SpendingTimeline.jsx - Show date range, years since first transaction
   - SplitPartner.jsx - Show partner name, split count
   - RewardHunter.jsx - Show total cashback, number of rewards
   - ExpensiveDay.jsx - Show date and amount
   - ResponsibleOne.jsx - Show created expense count
   - MoneyNetwork.jsx - Show people count, group count
2. Design unique layouts for each type (big number, chart, text)
3. Style with vibrant colors and gradients

**Critical Files**:
- `src/components/insights/DomainCollector.jsx`
- `src/components/insights/GroupChampion.jsx`
- `src/components/insights/VoucherHoarder.jsx`
- `src/components/insights/SpendingTimeline.jsx`
- `src/components/insights/SplitPartner.jsx`
- `src/components/insights/RewardHunter.jsx`
- `src/components/insights/ExpensiveDay.jsx`
- `src/components/insights/ResponsibleOne.jsx`
- `src/components/insights/MoneyNetwork.jsx`

#### Day 5: Year Filter
1. Create `components/story/YearFilter.jsx`
   - Two buttons: "2025" and "All Time"
   - Active state styling
2. Wire to Zustand store
3. On change: recalculate insights, reset to first insight
4. Test switching between years (verify calculations update)

**Critical Files**:
- `src/components/story/YearFilter.jsx`

**Deliverable**: Full interactive story mode experience

---

### Phase 4: Image Generation (Week 4)

**Goal**: Export shareable 1080x1080 PNG images

#### Day 1: Image Generator Component
1. Create `components/export/ImageGenerator.jsx`
   - Modal overlay
   - Preview area (1080x1080)
   - Download button
2. Integrate html2canvas library
3. Implement canvas → blob → download flow
4. Add loading state during generation

**Critical Files**:
- `src/components/export/ImageGenerator.jsx`

#### Day 2: Multi-Format Template System
1. Create `types/export.types.ts`:
   - ImageFormat type: 'square' | 'story' | 'twitter'
   - ImageDimensions interface
   - Export configurations
2. Create `constants/gradients.ts`
   - Define unique gradient for each insight type
   - 9 vibrant gradient combinations
3. Create `components/export/templates/`:
   - `SquareTemplate.tsx` (1080x1080 - Instagram Post)
   - `StoryTemplate.tsx` (1080x1920 - Instagram Story)
   - `TwitterTemplate.tsx` (1200x675 - Twitter Card)

**Critical Files**:
- `src/types/export.types.ts`
- `src/constants/gradients.ts`
- `src/components/export/templates/SquareTemplate.tsx`
- `src/components/export/templates/StoryTemplate.tsx`
- `src/components/export/templates/TwitterTemplate.tsx`

#### Day 3: Format-Specific Layouts
1. Square format (1080x1080):
   - Large numbers (120px+), centered content
   - Optimal for Instagram feed
2. Story format (1080x1920):
   - Vertical layout, larger text
   - Top/bottom safe zones
3. Twitter format (1200x675):
   - Horizontal layout, compact
   - Twitter-optimized contrast
4. All formats include FinnLens branding

**Critical Files**:
- Update insight components with format-aware rendering

#### Day 4: Download & Export Logic
1. Implement format-specific export:
   - High-resolution (scale: 2)
   - Format-aware canvas sizing
   - Filename: `finnlens-{insight-type}-{format}.png`
2. Add format preview switcher
3. Test on browsers (Chrome, Firefox, Safari)
4. Handle edge cases per format

**Critical Files**:
- `src/utils/exportUtils.ts`

#### Day 5: UI Integration & Polish
1. Add "Share 📸" button to Story page
2. ImageGenerator modal with format selector
3. User flow:
   - Select format (Square/Story/Twitter)
   - Real-time preview
   - Download selected format
4. Add "Download All Formats" option
5. Loading states during generation

**Critical Files**:
- `src/components/export/FormatSelector.tsx`
- Update ImageGenerator.tsx with multi-format support

**Deliverable**: Generate and download PNG images in 3 social media formats

---

### Phase 5: Polish & Production (Week 5)

**Goal**: Production-ready, bug-free application

#### Day 1: Error Handling
1. Create `pages/Error.jsx` with retry button
2. Add error boundary component
3. Handle errors:
   - Invalid zip file (show error, allow retry)
   - Corrupted data files (skip file, show warning)
   - Empty dataset (show message "No data found")
   - Parsing failures (graceful fallback)
4. Add user-friendly error messages

**Critical Files**:
- `src/pages/Error.jsx`

#### Day 2: Loading States
1. Add spinner to Processing.jsx
2. Add progress bar (Extracting → Parsing → Calculating)
3. Add skeleton screens for insight cards
4. Optimize perceived performance

#### Day 3: Responsive Design
1. Test on mobile devices (iPhone, Android)
2. Ensure swipe gestures work on touch screens
3. Adjust layouts for small screens (< 768px)
4. Test image generation on mobile browsers
5. Add viewport meta tag

#### Day 4: Performance Optimization
1. Lazy load insight components (React.lazy)
2. Memoize expensive calculations (React.memo)
3. Test with large datasets:
   - 1000+ transactions
   - 100+ group expenses
4. Optimize bundle size (check with `npm run build`)
5. Add compression (gzip) in production

#### Day 5: Final Testing & Deployment
1. Cross-browser testing (Chrome, Firefox, Safari, Edge)
2. Test complete flow end-to-end multiple times
3. Test edge cases:
   - Zip with missing files
   - Empty CSV files
   - Malformed JSON
4. Deploy to Netlify/Vercel:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add redirects for SPA routing

**Deliverable**: Production-ready app deployed to web

---

## Future Phase: AI-Generated Insights (Phase 6+)

**Goal**: Enhance insights with Gen AI-powered personalized narratives

### Overview
After the core app is working, integrate AI SDK JS to generate dynamic, personalized insight messages and narratives based on user's actual spending patterns.

### AI SDK Integration Options
- **Vercel AI SDK** (https://sdk.vercel.ai/)
- **LangChain.js**
- **OpenAI JavaScript SDK**

### Architecture Approach
1. **Hybrid Mode**: Keep existing rule-based insights as fallback
2. **Optional AI Enhancement**: User can toggle AI-powered narratives on/off
3. **Privacy Consideration**:
   - Option 1: Client-side only with local models (e.g., via WebLLM)
   - Option 2: Optional API calls with explicit user consent
   - Option 3: Edge function deployment for privacy-preserving inference

### Potential AI-Enhanced Features
1. **Personalized Narratives**: Generate witty, contextual messages based on spending patterns
2. **Spending Personality Analysis**: AI-generated personality type (e.g., "The Spontaneous Spender", "The Budget Optimizer")
3. **Custom Comparisons**: "You spent more on domains than the average developer" (with user permission)
4. **Funny Observations**: AI discovers unusual patterns in data and creates humorous commentary
5. **Financial Advice**: Gentle, personalized suggestions based on spending habits

### Implementation Strategy
```javascript
// Future file: src/utils/aiInsights.js
import { generateText } from 'ai';

export async function enhanceInsightWithAI(insight, userData) {
  const prompt = `Generate a witty, Spotify Wrapped-style message for: ${insight.type}
  Data: ${JSON.stringify(insight.data)}
  Make it ${insight.tone} (funny/hard-hitting/thoughtful)`;

  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt,
  });

  return result.text;
}
```

### Data Structure Extension
```javascript
// Add AI fields to insight schema
{
  type: 'domain_collector',
  title: 'Domain Collector',
  data: { /* existing data */ },
  message: 'Default rule-based message',
  aiMessage: null, // Populated by AI if enabled
  aiEnabled: false,
  tone: 'funny' // Hint for AI generation
}
```

### User Flow with AI
1. User uploads data (same as current)
2. See initial insights with default messages
3. Optional: "Enhance with AI" button appears
4. User consents to AI processing
5. AI generates personalized narratives
6. User can toggle between AI/default messages

### Privacy & Performance
- **Lazy Load AI SDK**: Only load when user opts in
- **Batch Processing**: Generate all AI insights in one API call
- **Caching**: Store AI responses in sessionStorage
- **Timeout Fallback**: Use default messages if AI fails/slow
- **Cost Control**: Set rate limits, use cheaper models (e.g., GPT-4o-mini)

### Dependencies (Future)
```json
{
  "dependencies": {
    "ai": "^3.0.0",  // Vercel AI SDK
    "@ai-sdk/openai": "^0.0.20",  // OpenAI provider
    // OR for local models:
    "@mlc-ai/web-llm": "^0.2.0"  // Local LLM in browser
  }
}
```

### Implementation Timeline (Future)
- **Week 6**: AI SDK integration, prompt engineering
- **Week 7**: UI for AI toggle, consent flow
- **Week 8**: Testing, prompt refinement, edge cases
- **Week 9**: Local model experimentation (optional)
- **Week 10**: Polish, performance optimization

### Files to Add (Future)
- `src/utils/aiInsights.js` - AI generation logic
- `src/config/aiConfig.js` - API keys, model settings
- `src/components/insights/AIToggle.jsx` - Enable/disable AI
- `src/components/insights/AIConsent.jsx` - Privacy consent modal

### Success Metrics (AI Phase)
- ✅ AI narratives feel personal and engaging
- ✅ 90%+ AI generation success rate
- ✅ <3s generation time for all insights
- ✅ Clear privacy controls
- ✅ Graceful fallback to default messages
- ✅ Cost per user <$0.05 (if using API)

**Note**: This phase is optional and can be implemented after the core app is fully functional and user-tested.

---

## Critical Files Priority

### Must Implement First (Core Pipeline)
1. `src/utils/zipParser.js` - Foundation
2. `src/utils/csvParser.js` - Data parsing
3. `src/utils/jsonParser.js` - Data parsing
4. `src/stores/dataStore.js` - State management
5. `src/engines/insightEngine.js` - Business logic

### Must Implement Second (Calculations)
6. All 9 calculator files in `src/engines/calculators/`

### Must Implement Third (UI)
7. `src/pages/Landing.jsx`
8. `src/pages/Processing.jsx`
9. `src/pages/Story.jsx`
10. `src/components/export/ImageGenerator.jsx`

### Supporting Files
11. All insight display components (9 files)
12. Navigation, Progress, YearFilter components
13. Utility files (currencyUtils, dateUtils, dataValidator)

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
    "jszip": "^3.10.1",
    "papaparse": "^5.4.1",
    "html2canvas": "^1.4.1",
    "react-swipeable": "^7.0.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@types/papaparse": "^5.3.14",
    "@types/node": "^20.10.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.0"
  }
}
```

## Quick Start Commands

```bash
# Create project with TypeScript
npm create vite@latest finnlens -- --template react-ts
cd finnlens

# Install dependencies
npm install zustand jszip papaparse html2canvas react-router-dom react-swipeable

# Install TypeScript types
npm install -D @types/papaparse @types/node

# Start development
npm run dev

# TypeScript type checking
npm run tsc --noEmit

# Build for production
npm run build

# Deploy to Netlify
npm run build && netlify deploy --prod --dir=dist
```

## Success Metrics

- ✅ Upload any Google Pay Takeout zip file
- ✅ Extract and parse all 5 file types
- ✅ Calculate 8-10 unique insights
- ✅ Switch between "2025" and "All Time" filters
- ✅ Navigate through insights with swipe/click
- ✅ Export any insight as 1080x1080 PNG
- ✅ Works 100% offline (no network calls)
- ✅ Handles missing/empty data gracefully
- ✅ Responsive on mobile and desktop
- ✅ Fast performance (<2s processing time)

## Privacy Guarantees

- ✅ No data sent to any server
- ✅ All processing in browser (client-side only)
- ✅ Data stored temporarily in sessionStorage
- ✅ Data cleared when browser tab closed
- ✅ No tracking, analytics, or cookies
- ✅ Open source (can be audited)
