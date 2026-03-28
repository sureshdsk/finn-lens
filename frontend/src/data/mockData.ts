// ─── SHARED TYPES ─────────────────────────────────────────────
export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment";
  bank: string;
  number: string;
  balance: number;
  currency: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  label: string;
  category: string;
  amount: number;
  type: "credit" | "debit";
  date: string;
  time: string;
  icon: string;
}

export interface HiddenCharge {
  label: string;
  amount: number;
  date: string;
  type: "fee" | "interest" | "penalty" | "surcharge";
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  number: string;
  expiry: string;
  cvv: string;
  limit: number;
  outstanding: number;
  dueDate: string;
  minDue: number;
  rewardPoints: number;
  color: string;
  gradient: string;
  hiddenCharges: HiddenCharge[];
}

export interface Subscription {
  id: string;
  name: string;
  category: string;
  cost: number;
  cycle: "monthly" | "yearly";
  renewDate: string;
  status: "active" | "cancelled";
  icon: string;
  color: string;
  description?: string;
  startDate?: string;
  paymentMethod?: string;
  plan?: string;
  totalSpent?: number;
  lastBilled?: string;
  sharedWith?: number;
  autoRenew?: boolean;
}

export interface Holding {
  id: string;
  name: string;
  ticker: string;
  type: "stock" | "mf" | "etf" | "gold" | "crypto";
  qty: number;
  avgPrice: number;
  currentPrice: number;
  invested: number;
  current: number;
  dayChange: number;
  color: string;
}

export interface InvestmentSuggestion {
  type: "average_down" | "arbitrage" | "rebalance" | "take_profit";
  title: string;
  description: string;
  ticker: string;
  action: string;
  urgency: "high" | "medium" | "low";
}

export interface Budget {
  id: string;
  category: string;
  budget: number;
  spent: number;
  color: string;
}

export interface LifeEvent {
  id: string;
  title: string;
  emoji: string;
  color: string;
  estimatedCost: number;
  savedSoFar: number;
  targetDate: string;
  monthlyRequired: number;
  locked: boolean;
  riskLevel: "low" | "medium" | "high";
  readiness: number;
  milestones: { label: string; amount: number; done: boolean }[];
  pros: string[];
  cons: string[];
  aiInsight: string;
  frictionQuestion: string;
}

export interface WaitlistItem {
  id: string;
  name: string;
  price: number;
  category: string;
  url: string;
  addedDate: string;
  cooldownDays: number;
  priceHistory: { date: string; price: number }[];
  notes: string;
  status: "waiting" | "approved" | "rejected";
}

export interface Asset {
  id: string;
  name: string;
  type: "land" | "gold" | "property" | "vehicle" | "collectible" | "other";
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  location?: string;
  description: string;
  documents: string[];
  appreciationRate: number;
  color: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export interface WeeklySpending {
  week: string;
  amount: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────
export const CURRENT_DATE = "2026-03-08";
export const CURRENT_MONTH = "MAR 2026";

export const categoryColors: Record<string, string> = {
  Shopping: "hsl(320 100% 60%)",
  Income: "hsl(145 100% 50%)",
  Food: "hsl(40 100% 55%)",
  Utilities: "hsl(200 90% 55%)",
  Entertainment: "hsl(270 80% 65%)",
  Transport: "hsl(175 100% 50%)",
  Housing: "hsl(350 80% 55%)",
  Health: "hsl(145 80% 45%)",
  Insurance: "hsl(220 70% 55%)",
  Transfer: "hsl(175 80% 45%)",
  Education: "hsl(45 90% 55%)",
  Travel: "hsl(190 80% 50%)",
  Gifts: "hsl(340 70% 60%)",
  Other: "hsl(0 0% 50%)",
};

export const accountTypeLabel: Record<string, string> = {
  checking: "CHECKING",
  savings: "SAVINGS",
  credit: "CREDIT",
  investment: "INVEST",
};

// ─── ACCOUNTS ─────────────────────────────────────────────────
export const mockAccounts: Account[] = [
  { id: "acc1", name: "Primary Checking", type: "checking", bank: "HDFC Bank", number: "••••4521", balance: 345200, currency: "INR", color: "hsl(175 100% 50%)" },
  { id: "acc2", name: "High-Yield Savings", type: "savings", bank: "SBI", number: "••••8832", balance: 520000, currency: "INR", color: "hsl(145 100% 50%)" },
  { id: "acc3", name: "Platinum Card", type: "credit", bank: "ICICI Bank", number: "••••6677", balance: -42350, currency: "INR", color: "hsl(320 100% 60%)" },
  { id: "acc4", name: "Regalia Card", type: "credit", bank: "HDFC Bank", number: "••••1198", balance: -18900, currency: "INR", color: "hsl(270 80% 65%)" },
  { id: "acc5", name: "Demat Account", type: "investment", bank: "Zerodha", number: "••••9021", balance: 420000, currency: "INR", color: "hsl(40 100% 55%)" },
  { id: "acc6", name: "PPF Account", type: "savings", bank: "Post Office", number: "••••3344", balance: 680000, currency: "INR", color: "hsl(200 90% 55%)" },
];

// ─── TRANSACTIONS ─────────────────────────────────────────────
export const mockTransactions: Transaction[] = [
  { id: "t1", accountId: "acc1", label: "Amazon Purchase", category: "Shopping", amount: -3499, type: "debit", date: "2026-03-08", time: "14:30", icon: "ShoppingBag" },
  { id: "t2", accountId: "acc1", label: "Salary Credit", category: "Income", amount: 240000, type: "credit", date: "2026-03-01", time: "09:00", icon: "ArrowDownLeft" },
  { id: "t3", accountId: "acc1", label: "Swiggy Order", category: "Food", amount: -856, type: "debit", date: "2026-03-07", time: "20:15", icon: "Utensils" },
  { id: "t4", accountId: "acc1", label: "Electricity Bill", category: "Utilities", amount: -2340, type: "debit", date: "2026-02-28", time: "11:00", icon: "Zap" },
  { id: "t5", accountId: "acc3", label: "Netflix Subscription", category: "Entertainment", amount: -649, type: "debit", date: "2026-02-27", time: "00:00", icon: "Film" },
  { id: "t6", accountId: "acc1", label: "Uber Ride", category: "Transport", amount: -425, type: "debit", date: "2026-02-26", time: "18:45", icon: "Car" },
  { id: "t7", accountId: "acc1", label: "Rent Payment", category: "Housing", amount: -25000, type: "debit", date: "2026-02-25", time: "10:00", icon: "Home" },
  { id: "t8", accountId: "acc2", label: "FD Interest", category: "Income", amount: 4200, type: "credit", date: "2026-02-24", time: "00:00", icon: "ArrowDownLeft" },
  { id: "t9", accountId: "acc3", label: "Flipkart Purchase", category: "Shopping", amount: -7899, type: "debit", date: "2026-02-23", time: "16:20", icon: "ShoppingBag" },
  { id: "t10", accountId: "acc1", label: "Gym Membership", category: "Health", amount: -2500, type: "debit", date: "2026-02-22", time: "08:00", icon: "Dumbbell" },
  { id: "t11", accountId: "acc1", label: "Freelance Payment", category: "Income", amount: 35000, type: "credit", date: "2026-02-20", time: "14:00", icon: "ArrowDownLeft" },
  { id: "t12", accountId: "acc4", label: "Zara Purchase", category: "Shopping", amount: -5400, type: "debit", date: "2026-02-19", time: "13:30", icon: "ShoppingBag" },
  { id: "t13", accountId: "acc1", label: "Mobile Recharge", category: "Utilities", amount: -599, type: "debit", date: "2026-02-18", time: "09:30", icon: "Zap" },
  { id: "t14", accountId: "acc1", label: "Groceries - BigBasket", category: "Food", amount: -3200, type: "debit", date: "2026-02-17", time: "11:15", icon: "Utensils" },
  { id: "t15", accountId: "acc5", label: "Dividend - Reliance", category: "Income", amount: 1800, type: "credit", date: "2026-02-15", time: "00:00", icon: "ArrowDownLeft" },
  { id: "t16", accountId: "acc1", label: "Petrol", category: "Transport", amount: -2800, type: "debit", date: "2026-02-14", time: "17:00", icon: "Car" },
  { id: "t17", accountId: "acc3", label: "Restaurant - Barbecue Nation", category: "Food", amount: -4200, type: "debit", date: "2026-02-13", time: "20:30", icon: "Utensils" },
  { id: "t18", accountId: "acc1", label: "Insurance Premium", category: "Insurance", amount: -12000, type: "debit", date: "2026-02-10", time: "10:00", icon: "Shield" },
  { id: "t19", accountId: "acc2", label: "Savings Transfer", category: "Transfer", amount: 50000, type: "credit", date: "2026-02-08", time: "09:00", icon: "ArrowDownLeft" },
  { id: "t20", accountId: "acc1", label: "Spotify Premium", category: "Entertainment", amount: -119, type: "debit", date: "2026-02-05", time: "00:00", icon: "Film" },
];

// ─── CREDIT CARDS ─────────────────────────────────────────────
export const mockCreditCards: CreditCard[] = [
  {
    id: "acc3", name: "Platinum Card", bank: "ICICI Bank", number: "4532 •••• •••• 6677",
    expiry: "09/28", cvv: "•••", limit: 200000, outstanding: 42350, dueDate: "2026-03-20",
    minDue: 4235, rewardPoints: 12840, color: "hsl(320 100% 60%)",
    gradient: "linear-gradient(135deg, hsl(320 80% 25%), hsl(270 60% 20%), hsl(320 100% 15%))",
    hiddenCharges: [
      { label: "Annual Fee", amount: 1499, date: "2026-02-15", type: "fee" },
      { label: "Late Payment Penalty", amount: 950, date: "2026-02-05", type: "penalty" },
      { label: "Interest on Revolving Balance", amount: 1823, date: "2026-03-01", type: "interest" },
      { label: "Fuel Surcharge", amount: 89, date: "2026-02-20", type: "surcharge" },
      { label: "Foreign Currency Markup (3.5%)", amount: 412, date: "2026-02-12", type: "fee" },
    ],
  },
  {
    id: "acc4", name: "Regalia Card", bank: "HDFC Bank", number: "5241 •••• •••• 1198",
    expiry: "11/27", cvv: "•••", limit: 500000, outstanding: 18900, dueDate: "2026-03-25",
    minDue: 1890, rewardPoints: 34200, color: "hsl(270 80% 65%)",
    gradient: "linear-gradient(135deg, hsl(270 60% 20%), hsl(220 50% 18%), hsl(270 80% 12%))",
    hiddenCharges: [
      { label: "GST on Interest", amount: 328, date: "2026-03-01", type: "fee" },
      { label: "Interest on Cash Advance", amount: 1150, date: "2026-02-18", type: "interest" },
      { label: "Reward Redemption Fee", amount: 99, date: "2026-02-10", type: "fee" },
    ],
  },
];

// ─── SUBSCRIPTIONS ────────────────────────────────────────────
export const mockSubscriptions: Subscription[] = [
  { id: "s1", name: "Netflix", category: "Entertainment", cost: 649, cycle: "monthly", renewDate: "2026-03-27", status: "active", icon: "🎬", color: "hsl(0 70% 50%)", description: "Streaming service for movies, TV shows & documentaries. Premium 4K plan with 4 screens.", plan: "Premium (4K)", startDate: "2022-06-15", paymentMethod: "HDFC Credit Card ••4521", totalSpent: 29205, lastBilled: "2026-02-27", sharedWith: 3, autoRenew: true },
  { id: "s2", name: "Spotify Premium", category: "Music", cost: 119, cycle: "monthly", renewDate: "2026-04-05", status: "active", icon: "🎵", color: "hsl(145 100% 50%)", description: "Music streaming with offline downloads, no ads, and high-quality audio.", plan: "Individual", startDate: "2023-01-10", paymentMethod: "SBI Debit Card ••8832", totalSpent: 3094, lastBilled: "2026-03-05", sharedWith: 0, autoRenew: true },
  { id: "s3", name: "YouTube Premium", category: "Entertainment", cost: 149, cycle: "monthly", renewDate: "2026-03-18", status: "active", icon: "📺", color: "hsl(0 85% 55%)", description: "Ad-free YouTube, background play, YouTube Music included.", plan: "Individual", startDate: "2023-08-20", paymentMethod: "HDFC Credit Card ••4521", totalSpent: 4619, lastBilled: "2026-02-18", sharedWith: 0, autoRenew: true },
  { id: "s4", name: "iCloud+ 200GB", category: "Storage", cost: 219, cycle: "monthly", renewDate: "2026-03-12", status: "active", icon: "☁️", color: "hsl(210 80% 60%)", description: "Apple cloud storage for photos, files, and device backups.", plan: "200GB", startDate: "2021-11-05", paymentMethod: "Apple Pay (SBI Card)", totalSpent: 11388, lastBilled: "2026-02-12", sharedWith: 2, autoRenew: true },
  { id: "s5", name: "ChatGPT Plus", category: "Productivity", cost: 1650, cycle: "monthly", renewDate: "2026-03-22", status: "active", icon: "🤖", color: "hsl(175 100% 50%)", description: "Access to GPT-4o, advanced analysis, image generation, and priority access.", plan: "Plus", startDate: "2024-02-01", paymentMethod: "HDFC Credit Card ••4521", totalSpent: 39600, lastBilled: "2026-02-22", sharedWith: 0, autoRenew: true },
  { id: "s6", name: "Zerodha", category: "Finance", cost: 2400, cycle: "yearly", renewDate: "2026-08-15", status: "active", icon: "📈", color: "hsl(270 80% 65%)", description: "Discount stock brokerage with Kite trading platform and Console analytics.", plan: "Standard", startDate: "2021-08-15", paymentMethod: "ICICI Net Banking", totalSpent: 12000, lastBilled: "2025-08-15", sharedWith: 0, autoRenew: true },
  { id: "s7", name: "Amazon Prime", category: "Shopping", cost: 1499, cycle: "yearly", renewDate: "2026-06-01", status: "active", icon: "📦", color: "hsl(40 100% 55%)", description: "Free delivery, Prime Video, Prime Music, and exclusive deals.", plan: "Annual", startDate: "2020-06-01", paymentMethod: "HDFC Credit Card ••4521", totalSpent: 8994, lastBilled: "2025-06-01", sharedWith: 4, autoRenew: true },
  { id: "s8", name: "Hotstar", category: "Entertainment", cost: 299, cycle: "monthly", renewDate: "2026-03-30", status: "active", icon: "⭐", color: "hsl(220 70% 55%)", description: "Disney+ Hotstar streaming with sports, movies, and Disney content.", plan: "Super", startDate: "2024-09-15", paymentMethod: "SBI Debit Card ••8832", totalSpent: 5382, lastBilled: "2026-02-28", sharedWith: 1, autoRenew: true },
  { id: "s9", name: "LinkedIn Premium", category: "Career", cost: 1555, cycle: "monthly", renewDate: "2026-04-02", status: "cancelled", icon: "💼", color: "hsl(210 90% 45%)", description: "InMail credits, profile viewers, salary insights, and LinkedIn Learning.", plan: "Career", startDate: "2025-04-02", paymentMethod: "HDFC Credit Card ••4521", totalSpent: 17105, lastBilled: "2026-01-02", sharedWith: 0, autoRenew: false },
];

// ─── INVESTMENTS / HOLDINGS ───────────────────────────────────
export const mockHoldings: Holding[] = [
  { id: "h1", name: "Reliance Industries", ticker: "RELIANCE", type: "stock", qty: 20, avgPrice: 2450, currentPrice: 2680, invested: 49000, current: 53600, dayChange: 1.2, color: "hsl(175 100% 50%)" },
  { id: "h2", name: "HDFC Bank", ticker: "HDFCBANK", type: "stock", qty: 30, avgPrice: 1620, currentPrice: 1540, invested: 48600, current: 46200, dayChange: -0.8, color: "hsl(320 100% 60%)" },
  { id: "h3", name: "Infosys", ticker: "INFY", type: "stock", qty: 40, avgPrice: 1480, currentPrice: 1590, invested: 59200, current: 63600, dayChange: 0.5, color: "hsl(270 80% 65%)" },
  { id: "h4", name: "Nifty 50 ETF", ticker: "NIFTYBEES", type: "etf", qty: 200, avgPrice: 245, currentPrice: 262, invested: 49000, current: 52400, dayChange: 0.3, color: "hsl(145 100% 50%)" },
  { id: "h5", name: "Parag Parikh Flexi Cap", ticker: "PPFAS", type: "mf", qty: 800, avgPrice: 72, currentPrice: 81, invested: 57600, current: 64800, dayChange: 0.1, color: "hsl(40 100% 55%)" },
  { id: "h6", name: "Sovereign Gold Bond", ticker: "SGB-2029", type: "gold", qty: 10, avgPrice: 5800, currentPrice: 6450, invested: 58000, current: 64500, dayChange: 0.6, color: "hsl(45 90% 55%)" },
  { id: "h7", name: "TCS", ticker: "TCS", type: "stock", qty: 15, avgPrice: 3800, currentPrice: 3950, invested: 57000, current: 59250, dayChange: -0.3, color: "hsl(200 90% 55%)" },
  { id: "h8", name: "Bitcoin (via ETF)", ticker: "BTC-ETF", type: "crypto", qty: 5, avgPrice: 4200, currentPrice: 5100, invested: 21000, current: 25500, dayChange: 2.4, color: "hsl(30 100% 55%)" },
];

export const mockInvestmentSuggestions: InvestmentSuggestion[] = [
  { type: "average_down", title: "Average Down: HDFC Bank", ticker: "HDFCBANK", description: "HDFCBANK is trading 4.9% below your avg price. Buy 15 more shares at ₹1,540 to bring avg to ₹1,593. Historically recovers within 2-3 months from similar dips.", action: "Buy 15 @ ₹1,540", urgency: "high" },
  { type: "arbitrage", title: "Cash-Futures Arbitrage: RELIANCE", ticker: "RELIANCE", description: "RELIANCE futures trading at ₹2,698 vs spot ₹2,680. Sell futures + buy spot for a risk-free 0.67% return (8% annualized) on ₹53,600 capital over 28 days.", action: "Execute Spread", urgency: "medium" },
  { type: "take_profit", title: "Book Partial Profit: BTC-ETF", ticker: "BTC-ETF", description: "BTC-ETF up 21.4% from your entry. Consider selling 2 units (₹10,200) to lock in ₹1,800 profit while keeping 3 units for further upside.", action: "Sell 2 Units", urgency: "medium" },
  { type: "rebalance", title: "Rebalance: Increase Debt Allocation", ticker: "PORTFOLIO", description: "Your portfolio is 100% equity/gold. For a balanced risk profile, consider allocating 20-30% to debt funds or liquid funds. Suggested: ₹1,00,000 to HDFC Short Term Debt.", action: "View Debt Funds", urgency: "low" },
  { type: "average_down", title: "SIP Top-up: PPFAS Flexi Cap", ticker: "PPFAS", description: "NAV corrected 3% from peak. Increase this month's SIP by ₹5,000 to accumulate ~62 extra units at lower cost. Your XIRR improves from 16.2% to est. 17.1%.", action: "Top-up ₹5,000", urgency: "low" },
  { type: "arbitrage", title: "Exchange Arbitrage: NIFTYBEES", ticker: "NIFTYBEES", description: "NIFTYBEES trading at ₹261.80 on BSE vs ₹262.00 on NSE. Buy on BSE, sell on NSE for ₹0.20/unit × 200 units = ₹40 risk-free (covers brokerage at 100+ units).", action: "Cross-Exchange", urgency: "low" },
];

// ─── BUDGETS ──────────────────────────────────────────────────
export const mockBudgets: Budget[] = [
  { id: "b1", category: "Housing", budget: 30000, spent: 25000, color: "hsl(350 80% 55%)" },
  { id: "b2", category: "Food", budget: 20000, spent: 22000, color: "hsl(40 100% 55%)" },
  { id: "b3", category: "Transport", budget: 12000, spent: 8500, color: "hsl(175 100% 50%)" },
  { id: "b4", category: "Shopping", budget: 18000, spent: 15000, color: "hsl(320 100% 60%)" },
  { id: "b5", category: "Entertainment", budget: 8000, spent: 6500, color: "hsl(270 80% 65%)" },
  { id: "b6", category: "Utilities", budget: 5000, spent: 2939, color: "hsl(200 90% 55%)" },
  { id: "b7", category: "Health", budget: 5000, spent: 2500, color: "hsl(145 80% 45%)" },
  { id: "b8", category: "Insurance", budget: 12000, spent: 12000, color: "hsl(220 70% 55%)" },
];

export const budgetCategoryOptions = [
  "Housing", "Food", "Transport", "Shopping", "Entertainment",
  "Utilities", "Health", "Insurance", "Education", "Travel", "Gifts", "Other",
];

export const colorForCategory = (cat: string): string => {
  return categoryColors[cat] || "hsl(175 100% 50%)";
};

// ─── ANALYTICS / MONTHLY ─────────────────────────────────────
export const mockMonthlyData: MonthlyData[] = [
  { month: "Oct", income: 240000, expense: 168000, savings: 72000 },
  { month: "Nov", income: 245000, expense: 182000, savings: 63000 },
  { month: "Dec", income: 275000, expense: 210000, savings: 65000 },
  { month: "Jan", income: 240000, expense: 175000, savings: 65000 },
  { month: "Feb", income: 279200, expense: 195000, savings: 84200 },
  { month: "Mar", income: 240000, expense: 112000, savings: 128000 },
];

export const mockWeeklySpending: WeeklySpending[] = [
  { week: "W1", amount: 28340 },
  { week: "W2", amount: 42100 },
  { week: "W3", amount: 35600 },
  { week: "W4", amount: 51200 },
];

// ─── LIFE EVENTS ──────────────────────────────────────────────
export const mockLifeEvents: LifeEvent[] = [
  {
    id: "le-house", title: "Buy a House", emoji: "🏠",
    color: "hsl(175 100% 50%)", estimatedCost: 8000000, savedSoFar: 1200000,
    targetDate: "2028-06-01", monthlyRequired: 252000, locked: false,
    riskLevel: "high", readiness: 15,
    milestones: [
      { label: "Emergency fund (6 months)", amount: 500000, done: true },
      { label: "Down payment (20%)", amount: 1600000, done: false },
      { label: "Registration & stamp duty", amount: 480000, done: false },
      { label: "Home furnishing fund", amount: 300000, done: false },
      { label: "Loan pre-approval", amount: 0, done: false },
    ],
    pros: [
      "Build equity instead of paying rent (₹25K/mo saved long-term)",
      "Tax benefits on home loan (Section 24, 80C) up to ₹3.5L/yr",
      "Asset appreciation: avg 8-12% in metro areas",
      "Stability and security for family",
    ],
    cons: [
      "EMI ₹58,000/mo for 20yrs @ 8.5% on ₹64L loan — 24% of income",
      "Liquidity lock: ₹16L+ tied up in down payment",
      "Maintenance, property tax add ₹8-12K/month",
      "Career flexibility reduced — harder to relocate",
      "Market risk: property values can stagnate 5-7 years",
    ],
    aiInsight: "At your current savings rate, you'll hit the down payment target in ~14 months. However, your emergency fund will be depleted. Recommendation: delay by 6 months and build a parallel ₹3L buffer. Your debt-to-income ratio post-purchase will be 24% — within the healthy 28% limit but leaves thin margin.",
    frictionQuestion: "Have you accounted for a potential job change or income disruption in the next 2 years? Locking ₹16L in a down payment means you'll need 8+ months of expenses liquid.",
  },
  {
    id: "le-car", title: "Buy a Car", emoji: "🚗",
    color: "hsl(270 80% 65%)", estimatedCost: 1200000, savedSoFar: 350000,
    targetDate: "2026-12-01", monthlyRequired: 94444, locked: false,
    riskLevel: "medium", readiness: 29,
    milestones: [
      { label: "Research & shortlist models", amount: 0, done: true },
      { label: "Down payment (50%)", amount: 600000, done: false },
      { label: "Insurance (1st year)", amount: 45000, done: false },
      { label: "Accessories & registration", amount: 80000, done: false },
    ],
    pros: [
      "Eliminates ₹8-10K/mo commute costs (Uber/Metro)",
      "Time savings: avg 45min/day on commute",
      "Convenience for family travel and emergencies",
      "Resale value retains 50-60% after 5 years",
    ],
    cons: [
      "Depreciating asset — loses 15-20% value in year 1",
      "EMI ₹12,500/mo for 5yrs @ 9% on ₹6L loan",
      "Fuel + maintenance + insurance: ₹6-8K/month ongoing",
      "Parking costs in metro: ₹2-4K/month",
      "Total cost of ownership over 5 years: ₹18-20L (vs ₹12L purchase)",
    ],
    aiInsight: "Your current commute spend is ₹8.5K/month. A car would cost ₹18.5K/month (EMI + fuel + insurance + parking). Net additional cost: ₹10K/month. Consider if the convenience justifies a 117% increase in transport budget. Alternative: A ₹4L used car saves ₹8K/month.",
    frictionQuestion: "Will you still need this car if you switch to remote work or relocate closer to office? Your current lease ends in 8 months.",
  },
  {
    id: "le-wedding", title: "Get Married", emoji: "💍",
    color: "hsl(320 100% 60%)", estimatedCost: 2500000, savedSoFar: 400000,
    targetDate: "2027-11-01", monthlyRequired: 105000, locked: true,
    riskLevel: "medium", readiness: 16,
    milestones: [
      { label: "Venue booking advance", amount: 200000, done: false },
      { label: "Wedding fund target", amount: 1500000, done: false },
      { label: "Honeymoon fund", amount: 300000, done: false },
      { label: "New home setup fund", amount: 500000, done: false },
    ],
    pros: ["Shared expenses reduce per-person living costs by 30-40%", "Combined income potential doubles household earnings", "Tax benefits for joint home loans and investments", "Insurance and financial planning becomes more efficient"],
    cons: ["One-time cost of ₹25L significantly impacts savings trajectory", "Delays house purchase goal by ~8-10 months", "Lifestyle inflation post-marriage averages 20-30%", "Need to rebuild emergency fund post-wedding"],
    aiInsight: "Wedding costs can be optimized. Average Indian wedding costs have risen 18% YoY. Consider phased spending: ₹15L ceremony + ₹5L reception + ₹3L honeymoon (delayed 3 months). This spreads cash flow better. Your joint savings rate post-marriage could increase to 45% if both incomes are managed well.",
    frictionQuestion: "Have you and your partner aligned on a wedding budget? 67% of couples exceed their planned budget by 30-50%. Set a hard ceiling now.",
  },
  {
    id: "le-baby", title: "Have a Child", emoji: "👶",
    color: "hsl(40 100% 55%)", estimatedCost: 1500000, savedSoFar: 0,
    targetDate: "2029-01-01", monthlyRequired: 44118, locked: true,
    riskLevel: "high", readiness: 0,
    milestones: [
      { label: "Health insurance upgrade", amount: 15000, done: false },
      { label: "Delivery & hospital fund", amount: 300000, done: false },
      { label: "Baby essentials (first year)", amount: 200000, done: false },
      { label: "Childcare/nanny fund (1yr)", amount: 240000, done: false },
      { label: "Education fund kickstart", amount: 500000, done: false },
      { label: "Emergency buffer increase", amount: 200000, done: false },
    ],
    pros: ["Section 80C benefits for child education", "Starting education fund early: ₹5K/mo SIP grows to ₹35L in 18yrs", "Maternity/paternity leave benefits from employer", "Life insurance becomes more tax-efficient"],
    cons: ["Monthly expenses increase by ₹15-25K (avg first 3 years)", "Career impact: potential 6-12 month reduced income period", "Childcare costs in metros: ₹15-20K/month", "Education costs rising 10-12% annually", "Need ₹1.5-2Cr for child's education (birth to graduation)"],
    aiInsight: "Starting a ₹5,000/month SIP now for a child's education fund would grow to approximately ₹35L by age 18 (at 12% returns). Delaying by even 2 years reduces this to ₹27L. However, ensure your own retirement corpus is on track first — don't sacrifice your future for your child's education when education loans exist but retirement loans don't.",
    frictionQuestion: "Is your term insurance coverage at least 10x annual income? Having a child without adequate life cover is the #1 financial risk for young families.",
  },
  {
    id: "le-education", title: "Higher Education", emoji: "🎓",
    color: "hsl(200 90% 55%)", estimatedCost: 3000000, savedSoFar: 180000,
    targetDate: "2027-08-01", monthlyRequired: 164706, locked: true,
    riskLevel: "medium", readiness: 6,
    milestones: [
      { label: "Entrance exam prep & fees", amount: 50000, done: true },
      { label: "Application fees (5-8 colleges)", amount: 80000, done: false },
      { label: "First year tuition", amount: 1200000, done: false },
      { label: "Living expenses fund (2yrs)", amount: 600000, done: false },
      { label: "Opportunity cost buffer", amount: 500000, done: false },
    ],
    pros: ["MBA/MS holders earn 60-150% more within 5 years", "Network and career pivot opportunity", "Education loan interest: Section 80E deduction (no limit)", "ROI typically recovers cost in 3-5 years post-graduation"],
    cons: ["2-year income gap: opportunity cost of ₹48-60L", "Education loan EMI: ₹35-40K/mo for 7 years", "No guarantee of proportional salary increase", "Savings and investment momentum disrupted"],
    aiInsight: "Total cost including opportunity cost: ~₹78L. Expected salary uplift: ₹15-20L/year. Break-even in 4-5 years. Consider part-time/executive programs that let you keep earning (cost: ₹18-22L, no opportunity cost). Your current career trajectory suggests a 12% annual raise — higher education accelerates this to 25-30% but with a 2-year gap.",
    frictionQuestion: "Have you spoken to at least 5 alumni from your target program about actual placement outcomes? Published placement stats are often inflated by 20-30%.",
  },
];

// ─── PURCHASE WAITLIST ────────────────────────────────────────
export const mockWaitlistItems: WaitlistItem[] = [
  {
    id: "pw1", name: "Sony WH-1000XM5 Headphones", price: 24990, category: "Electronics",
    url: "amazon.in", addedDate: "2026-02-20", cooldownDays: 14, notes: "Current earbuds still work fine",
    status: "waiting",
    priceHistory: [
      { date: "2026-01-15", price: 27990 }, { date: "2026-02-01", price: 26490 },
      { date: "2026-02-15", price: 25990 }, { date: "2026-03-01", price: 24990 },
    ],
  },
  {
    id: "pw2", name: "iPad Air M2", price: 59900, category: "Electronics",
    url: "apple.com", addedDate: "2026-03-01", cooldownDays: 30, notes: "Want for note-taking, but laptop works",
    status: "waiting",
    priceHistory: [
      { date: "2026-01-01", price: 59900 }, { date: "2026-02-01", price: 59900 },
      { date: "2026-03-01", price: 59900 },
    ],
  },
  {
    id: "pw3", name: "Nike Air Max 90", price: 11495, category: "Fashion",
    url: "nike.com", addedDate: "2026-02-10", cooldownDays: 7, notes: "Already have 4 sneakers",
    status: "rejected",
    priceHistory: [
      { date: "2026-01-20", price: 12995 }, { date: "2026-02-10", price: 11495 },
      { date: "2026-03-05", price: 10995 },
    ],
  },
  {
    id: "pw4", name: "Kindle Paperwhite", price: 14999, category: "Electronics",
    url: "amazon.in", addedDate: "2026-01-25", cooldownDays: 14, notes: "Read 3+ books/month, phone screen hurts eyes",
    status: "approved",
    priceHistory: [
      { date: "2026-01-10", price: 16999 }, { date: "2026-02-01", price: 15999 },
      { date: "2026-03-01", price: 14999 },
    ],
  },
];

export const waitlistCategoryOptions = ["Electronics", "Fashion", "Home", "Fitness", "Books", "Travel", "Gaming", "Other"];

// ─── ASSETS ───────────────────────────────────────────────────
export const mockAssets: Asset[] = [
  { id: "a1", name: "Farmland - Nashik", type: "land", purchaseDate: "2019-03-15", purchasePrice: 2400000, currentValue: 4200000, location: "Nashik, Maharashtra", description: "2 acres agricultural land near Nashik highway. Irrigated with borewell.", documents: ["Sale Deed", "7/12 Extract", "Tax Receipt"], appreciationRate: 12, color: "hsl(145 100% 50%)" },
  { id: "a2", name: "Gold Jewelry", type: "gold", purchaseDate: "2020-11-01", purchasePrice: 480000, currentValue: 720000, location: "Bank Locker - HDFC", description: "150g gold jewelry (22K). Necklace, bangles, and earrings.", documents: ["Purchase Invoice", "Hallmark Certificate"], appreciationRate: 14, color: "hsl(45 90% 55%)" },
  { id: "a3", name: "2BHK Flat - Pune", type: "property", purchaseDate: "2022-06-20", purchasePrice: 5500000, currentValue: 6800000, location: "Hinjewadi, Pune", description: "2BHK flat, 950 sqft. Currently rented at ₹18,000/month.", documents: ["Sale Deed", "Registration", "Society NOC", "Property Tax"], appreciationRate: 8, color: "hsl(175 100% 50%)" },
  { id: "a4", name: "Gold Coins (24K)", type: "gold", purchaseDate: "2021-04-14", purchasePrice: 200000, currentValue: 310000, location: "Home Safe", description: "40g gold coins (24K), 5 x 8g each. Investment grade.", documents: ["Purchase Invoice"], appreciationRate: 15, color: "hsl(45 90% 55%)" },
  { id: "a5", name: "Royal Enfield Classic 350", type: "vehicle", purchaseDate: "2023-01-10", purchasePrice: 210000, currentValue: 155000, location: "Home", description: "2023 model, 12,000 km driven. Good condition.", documents: ["RC", "Insurance", "Purchase Invoice"], appreciationRate: -12, color: "hsl(270 80% 65%)" },
  { id: "a6", name: "Vintage Watch - Omega", type: "collectible", purchaseDate: "2018-09-01", purchasePrice: 85000, currentValue: 145000, location: "Home Safe", description: "Omega Seamaster 1968, restored. Collector's piece.", documents: ["Certificate of Authenticity", "Service Record"], appreciationRate: 10, color: "hsl(320 100% 60%)" },
];

export const assetTypeConfig: Record<string, { label: string; color: string }> = {
  land: { label: "LAND", color: "hsl(145 100% 50%)" },
  gold: { label: "GOLD", color: "hsl(45 90% 55%)" },
  property: { label: "PROPERTY", color: "hsl(175 100% 50%)" },
  vehicle: { label: "VEHICLE", color: "hsl(270 80% 65%)" },
  collectible: { label: "COLLECTIBLE", color: "hsl(320 100% 60%)" },
  other: { label: "OTHER", color: "hsl(200 90% 55%)" },
};

// ─── FINANCIAL CONTEXT (derived) ──────────────────────────────
export const financialContext = {
  monthlyIncome: 240000,
  monthlyExpense: 175000,
  monthlySurplus: 65000,
  totalDebt: 61250,
  totalEMI: 0,
  emergencyFund: 520000,
  monthsOfExpenses: 2.97,
  savingsRate: 27,
  upcomingBills: 32000,
  shoppingBudget: 18000,
  shoppingSpent: 15000,
  shoppingRemaining: 3000,
};

// ─── HELPERS ──────────────────────────────────────────────────
export const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.abs(n));

export const fmtSigned = (n: number) =>
  `${n >= 0 ? "+" : "-"}${fmt(n)}`;

export const daysUntil = (date: string) => {
  const diff = new Date(date).getTime() - new Date(CURRENT_DATE).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const daysSince = (date: string) => {
  const diff = new Date(CURRENT_DATE).getTime() - new Date(date).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const pctChange = (invested: number, current: number) =>
  (((current - invested) / invested) * 100).toFixed(2);

// ─── DERIVED OVERVIEW DATA ───────────────────────────────────
const totalAssets = mockAccounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
const totalLiabilities = mockAccounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
const totalInvested = mockHoldings.reduce((s, h) => s + h.current, 0);
const latestMonth = mockMonthlyData[mockMonthlyData.length - 1];
const prevMonth = mockMonthlyData[mockMonthlyData.length - 2];

export const overviewCards = [
  { label: "NET_WORTH", value: fmt(totalAssets - totalLiabilities), change: "+12.5%", positive: true },
  { label: "INCOME", value: fmt(latestMonth.income), change: `${((latestMonth.income - prevMonth.income) / prevMonth.income * 100).toFixed(1)}%`, positive: latestMonth.income >= prevMonth.income },
  { label: "EXPENSES", value: fmt(latestMonth.expense), change: `${((latestMonth.expense - prevMonth.expense) / prevMonth.expense * 100).toFixed(1)}%`, positive: latestMonth.expense <= prevMonth.expense },
  { label: "INVESTED", value: fmt(totalInvested), change: `+${pctChange(mockHoldings.reduce((s, h) => s + h.invested, 0), totalInvested)}%`, positive: true },
  { label: "SAVINGS", value: fmt(latestMonth.savings), change: `+${((latestMonth.savings - prevMonth.savings) / prevMonth.savings * 100).toFixed(1)}%`, positive: latestMonth.savings >= prevMonth.savings },
];

export const spendingBreakdown = mockBudgets.map(b => ({
  name: b.category,
  amount: b.spent,
  percent: 0,
  color: b.color,
}));
const spendingTotal = spendingBreakdown.reduce((s, c) => s + c.amount, 0);
spendingBreakdown.forEach(c => { c.percent = Math.round((c.amount / spendingTotal) * 100); });

const overBudgets = mockBudgets.filter(b => b.spent > b.budget);
const upcomingSubs = mockSubscriptions.filter(s => s.status === "active" && daysUntil(s.renewDate) <= 3);
const ccDueSoon = mockCreditCards.filter(c => daysUntil(c.dueDate) <= 5);

export const quickAlerts = [
  ...overBudgets.map(b => ({
    text: `${b.category} budget exceeded by ${fmt(b.spent - b.budget)}`,
    type: "warning" as const,
    time: CURRENT_MONTH,
  })),
  ...ccDueSoon.map(c => ({
    text: `${c.bank} CC bill due in ${daysUntil(c.dueDate)} days`,
    type: "info" as const,
    time: "Today",
  })),
  ...upcomingSubs.map(s => ({
    text: `${s.name} renews in ${daysUntil(s.renewDate)} day(s)`,
    type: "info" as const,
    time: `${daysUntil(s.renewDate)}d`,
  })),
  {
    text: `Savings goal 73% complete`,
    type: "success" as const,
    time: "Week",
  },
];
