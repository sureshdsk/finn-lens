// Date utility functions for filtering and processing transaction data

import { Transaction, GroupExpense, CashbackReward, Voucher, ActivityRecord } from '../types/data.types';

export type YearFilter = '2025' | 'all';

/**
 * Filter transactions by year
 */
export function filterTransactionsByYear(
  transactions: Transaction[],
  year: YearFilter
): Transaction[] {
  if (year === 'all') return transactions;

  return transactions.filter(t => {
    const transactionYear = t.time.getFullYear();
    return transactionYear === parseInt(year);
  });
}

/**
 * Filter group expenses by year
 */
export function filterGroupExpensesByYear(
  expenses: GroupExpense[],
  year: YearFilter
): GroupExpense[] {
  if (year === 'all') return expenses;

  return expenses.filter(e => {
    const expenseYear = e.creationTime.getFullYear();
    return expenseYear === parseInt(year);
  });
}

/**
 * Filter cashback rewards by year
 */
export function filterCashbackRewardsByYear(
  rewards: CashbackReward[],
  year: YearFilter
): CashbackReward[] {
  if (year === 'all') return rewards;

  return rewards.filter(r => {
    const rewardYear = r.date.getFullYear();
    return rewardYear === parseInt(year);
  });
}

/**
 * Filter vouchers by year (based on expiry date)
 */
export function filterVouchersByYear(
  vouchers: Voucher[],
  year: YearFilter
): Voucher[] {
  if (year === 'all') return vouchers;

  return vouchers.filter(v => {
    const voucherYear = v.expiryDate.getFullYear();
    return voucherYear === parseInt(year);
  });
}

/**
 * Filter activities by year
 */
export function filterActivitiesByYear(
  activities: ActivityRecord[],
  year: YearFilter
): ActivityRecord[] {
  if (year === 'all') return activities;

  return activities.filter(activity => {
    const activityYear = activity.time.getFullYear();
    return activityYear === parseInt(year);
  });
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
