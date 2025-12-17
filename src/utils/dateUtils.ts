// Date utility functions for filtering and processing transaction data

import { Transaction, GroupExpense, CashbackReward, Voucher, ActivityRecord } from '../types/data.types';

export type YearFilter = '2025' | '2024' | '2023' | 'all';

/**
 * Check if a transaction status indicates failure
 */
function isFailedTransaction(status: string): boolean {
  if (!status) return false;
  const lowerStatus = status.toLowerCase();
  const failedStatuses = ['failed', 'declined', 'cancelled', 'canceled', 'rejected', 'error', 'refund', 'reversed'];
  return failedStatuses.some(s => lowerStatus.includes(s));
}

/**
 * Filter transactions by year (excludes failed transactions)
 */
export function filterTransactionsByYear(
  transactions: Transaction[],
  year: YearFilter
): Transaction[] {
  // First filter out failed transactions
  const failedCount = transactions.filter(t => isFailedTransaction(t.status)).length;
  const successfulTransactions = transactions.filter(t => !isFailedTransaction(t.status));

  console.log(`Filtering transactions - ${failedCount} failed excluded`);

  if (year === 'all') {
    return successfulTransactions;
  }

  // Filter by year
  const yearFiltered = successfulTransactions.filter(t => {
    const transactionYear = t.time.getFullYear();
    return transactionYear === parseInt(year);
  });

  return yearFiltered;
}

/**
 * Filter group expenses by year
 */
export function filterGroupExpensesByYear(
  expenses: GroupExpense[],
  year: YearFilter
): GroupExpense[] {
  if (year === 'all') return expenses;

  const filtered = expenses.filter(e => {
    const expenseYear = e.creationTime.getFullYear();
    return expenseYear === parseInt(year);
  });

  return filtered;
}

/**
 * Filter cashback rewards by year
 */
export function filterCashbackRewardsByYear(
  rewards: CashbackReward[],
  year: YearFilter
): CashbackReward[] {
  if (year === 'all') return rewards;

  const filtered = rewards.filter(r => {
    const rewardYear = r.date.getFullYear();
    return rewardYear === parseInt(year);
  });

  return filtered;
}

/**
 * Filter vouchers by year (based on expiry date)
 * Note: Vouchers don't have a creation date, so we filter by expiry date
 */
export function filterVouchersByYear(
  vouchers: Voucher[],
  year: YearFilter
): Voucher[] {
  if (year === 'all') return vouchers;

  const filtered = vouchers.filter(v => {
    const voucherYear = v.expiryDate.getFullYear();
    return voucherYear === parseInt(year);
  });

  return filtered;
}

/**
 * Check if an activity indicates a failed transaction
 */
function isFailedActivity(activity: ActivityRecord): boolean {
  const title = activity.title.toLowerCase();
  const description = (activity.description || '').toLowerCase();

  // Check for explicit "Failed" status (common in Google Pay HTML exports)
  // The word "Failed" often appears on its own line in the description
  const failedKeywords = [
    'failed',
    'declined',
    'cancelled',
    'canceled',
    'rejected',
    'unsuccessful',
  ];

  // Check title
  if (failedKeywords.some(keyword => title.includes(keyword))) {
    return true;
  }

  // Check description - look for "Failed" as a standalone word or at end of line
  if (failedKeywords.some(keyword => description.includes(keyword))) {
    return true;
  }

  return false;
}

/**
 * Filter activities by year (excludes failed activities)
 */
export function filterActivitiesByYear(
  activities: ActivityRecord[],
  year: YearFilter
): ActivityRecord[] {
  // First filter out failed activities
  const failedActivities = activities.filter(a => isFailedActivity(a));
  const successfulActivities = activities.filter(a => !isFailedActivity(a));

  console.log(`Filtering activities - ${failedActivities.length} failed excluded`);

  if (year === 'all') {
    return successfulActivities;
  }

  // Filter by year
  const yearFiltered = successfulActivities.filter(activity => {
    const activityYear = activity.time.getFullYear();
    return activityYear === parseInt(year);
  });

  return yearFiltered;
}

/**
 * Get date range from transactions
 */
export function getTransactionDateRange(transactions: Transaction[]): {
  min: Date | null;
  max: Date | null;
} {
  if (transactions.length === 0) {
    return { min: null, max: null };
  }

  const dates = transactions.map(t => t.time);
  const min = new Date(Math.min(...dates.map(d => d.getTime())));
  const max = new Date(Math.max(...dates.map(d => d.getTime())));

  return { min, max };
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffMs / msPerDay);
}

/**
 * Calculate years between two dates (with decimals)
 */
export function yearsBetween(date1: Date, date2: Date): string {
  const days = daysBetween(date1, date2);
  const years = (days / 365.25).toFixed(1);
  return years;
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Group transactions by date (YYYY-MM-DD)
 */
export function groupTransactionsByDate(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  transactions.forEach(transaction => {
    const dateKey = transaction.time.toISOString().split('T')[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(transaction);
  });

  return grouped;
}
