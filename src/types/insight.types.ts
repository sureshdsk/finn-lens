// Insight types and interfaces

export type InsightType =
  | 'domain_collector'
  | 'group_champion'
  | 'voucher_hoarder'
  | 'spending_timeline'
  | 'split_partner'
  | 'reward_hunter'
  | 'expensive_day'
  | 'responsible_one'
  | 'money_network'
  // NEW: Activity-based insights
  | 'money_flow'
  | 'transaction_partner'
  | 'peak_activity'
  | 'bulk_payment'
  | 'spending_category'
  // FUNNY INSIGHTS
  | 'payment_streak'
  | 'split_dodger'
  | 'midnight_shopper'
  | 'smallest_payment'
  | 'round_number_obsession';

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

// Specific insight data interfaces
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

export interface VoucherHoarderData {
  totalVouchers: number;
  expired: number;
  active: number;
  wastePercentage: number;
}

export interface SpendingTimelineData {
  firstDate: Date;
  lastDate: Date;
  daysSince: number;
  yearsSince: string;
}

export interface SplitPartnerData {
  partnerName: string;
  splitCount: number;
}

export interface RewardHunterData {
  totalRewards: number;
  rewardCount: number;
  avgReward: number;
}

export interface ExpensiveDayData {
  date: Date;
  amount: number;
}

export interface ResponsibleOneData {
  createdCount: number;
  totalAmount: number;
}

export interface MoneyNetworkData {
  peopleCount: number;
  groupCount: number;
  people: string[];
}

// NEW: Activity-based insight data interfaces
export interface MoneyFlowInsightData {
  totalSent: { value: number; currency: 'INR' };
  totalReceived: { value: number; currency: 'INR' };
  netFlow: { value: number; currency: 'INR' };
  sentCount: number;
  receivedCount: number;
  flowDirection: 'giver' | 'receiver' | 'balanced';
}

export interface TransactionPartnerInsightData {
  mostFrequentPartner: string;
  transactionCount: number;
  totalAmount: { value: number; currency: 'INR' };
  partnerType: 'recipient' | 'sender' | 'both';
}

export interface PeakActivityInsightData {
  peakHour: number;
  peakDay: string;
  peakHourTransactions: number;
  peakDayTransactions: number;
  nightOwlScore: number;
}

export interface BulkPaymentInsightData {
  maxTransactionsInHour: number;
  maxTransactionsInDay: number;
  busiestDate: Date;
  velocityScore: number;
}

export interface SpendingCategoryInsightData {
  topCategory: string;
  topCategoryAmount: { value: number; currency: 'INR' };
  topCategoryCount: number;
  categoryBreakdown: Array<{
    category: string;
    amount: { value: number; currency: 'INR' };
    count: number;
    percentage: number;
  }>;
  diversityScore: number;
}

// FUNNY INSIGHTS DATA INTERFACES
export interface PaymentStreakInsightData {
  longestStreak: number;
  streakStartDate: Date;
  streakEndDate: Date;
  currentStreak: number;
}

export interface SplitDodgerInsightData {
  totalSplits: number;
  dodgedCount: number;
  dodgedAmount: { value: number; currency: 'INR' };
  dodgeRate: number;
}

export interface MidnightShopperInsightData {
  lateNightCount: number;
  latestHour: number;
  latestTransaction: string;
  totalLateNightSpending: { value: number; currency: 'INR' };
}

export interface SmallestPaymentInsightData {
  amount: { value: number; currency: 'INR' };
  description: string;
  date: Date;
}

export interface RoundNumberObsessionInsightData {
  roundPayments: number;
  totalPayments: number;
  roundPercentage: number;
  favoriteRoundNumber: number;
}
