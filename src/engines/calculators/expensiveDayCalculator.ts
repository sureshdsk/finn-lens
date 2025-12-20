// Expensive Day Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, ExpensiveDayData } from '../../types/insight.types';
import { formatDate } from '../../utils/dateUtils';
import { convertToINR } from '../../utils/categoryUtils';

/**
 * Calculate Expensive Day insight
 * Finds the day with highest total spending from ALL sources (transactions + activities)
 */
export function calculateExpensiveDayInsight(
  data: ParsedData
): Insight<ExpensiveDayData> | null {
  const { transactions, activities } = data;

  if (transactions.length === 0 && activities.length === 0) return null;

  // Create a map to track spending by date (YYYY-MM-DD format)
  const spendingByDate = new Map<string, {
    total: number;
    transactionCount: number;
    activityCount: number;
  }>();

  // Add transaction amounts to the map
  transactions.forEach(transaction => {
    // Use local timezone for date grouping (YYYY-MM-DD format)
    const year = transaction.time.getFullYear();
    const month = String(transaction.time.getMonth() + 1).padStart(2, '0');
    const day = String(transaction.time.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    const amount = convertToINR(transaction.amount);

    if (!spendingByDate.has(dateKey)) {
      spendingByDate.set(dateKey, { total: 0, transactionCount: 0, activityCount: 0 });
    }

    const dayData = spendingByDate.get(dateKey)!;
    dayData.total += amount;
    dayData.transactionCount++;
  });

  // Add activity amounts (only spent/paid, not received)
  activities.forEach(activity => {
    if (activity.amount && (activity.transactionType === 'sent' || activity.transactionType === 'paid')) {
      // Use local timezone for date grouping (YYYY-MM-DD format)
      const year = activity.time.getFullYear();
      const month = String(activity.time.getMonth() + 1).padStart(2, '0');
      const day = String(activity.time.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const amount = convertToINR(activity.amount);

      if (!spendingByDate.has(dateKey)) {
        spendingByDate.set(dateKey, { total: 0, transactionCount: 0, activityCount: 0 });
      }

      const dayData = spendingByDate.get(dateKey)!;
      dayData.total += amount;
      dayData.activityCount++;
    }
  });

  // Find the day with maximum spending
  let maxDate: string | null = null;
  let maxAmount = 0;
  let maxTransactionCount = 0;
  let maxActivityCount = 0;

  spendingByDate.forEach((dayData, dateKey) => {
    if (dayData.total > maxAmount) {
      maxAmount = dayData.total;
      maxDate = dateKey;
      maxTransactionCount = dayData.transactionCount;
      maxActivityCount = dayData.activityCount;
    }
  });

  if (!maxDate || maxAmount === 0) return null;

  const expensiveDay = new Date(maxDate);
  const totalSpent = maxAmount;

  // Generate message
  let message = '';

  if (maxTransactionCount > 0 && maxActivityCount > 0) {
    message = `On ${formatDate(expensiveDay)}, you went wild! ${maxTransactionCount} transactions + ${maxActivityCount} app payments for ₹${Math.round(totalSpent).toLocaleString()}. `;
  } else if (maxActivityCount > 0) {
    message = `On ${formatDate(expensiveDay)}, you made ${maxActivityCount} payments totaling ₹${Math.round(totalSpent).toLocaleString()}. `;
  } else {
    message = `On ${formatDate(expensiveDay)}, you spent ₹${Math.round(totalSpent).toLocaleString()}. `;
  }

  if (totalSpent >= 50000) {
    message += 'Remember this epic day? 🎉';
  } else if (totalSpent >= 10000) {
    message += 'That was a big day! 💳';
  } else if (totalSpent >= 5000) {
    message += 'A memorable spending spree! 🛍️';
  } else {
    message += 'Your peak spending day! 📊';
  }

  return {
    type: 'expensive_day',
    title: 'Your Most Expensive Day',
    tone: 'hard-hitting',
    data: {
      date: expensiveDay,
      amount: totalSpent
    },
    message
  };
}
