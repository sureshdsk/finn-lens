// Expensive Day Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, ExpensiveDayData } from '../../types/insight.types';
import { groupTransactionsByDate, formatDate } from '../../utils/dateUtils';
import { convertToINR } from '../../utils/categoryUtils';

/**
 * Calculate Expensive Day insight
 * Finds the day with highest total spending
 */
export function calculateExpensiveDayInsight(
  data: ParsedData
): Insight<ExpensiveDayData> | null {
  const { transactions, activities } = data;

  if (transactions.length === 0) return null;

  // Group transactions by date
  const groupedByDate = groupTransactionsByDate(transactions);

  let maxDate: Date | null = null;
  let maxAmount = 0;
  let maxTransactionCount = 0;

  // Find the day with highest spending
  groupedByDate.forEach((dayTransactions, dateKey) => {
    let dayTotal = 0;

    dayTransactions.forEach(transaction => {
      dayTotal += convertToINR(transaction.amount);
    });

    if (dayTotal > maxAmount) {
      maxAmount = dayTotal;
      maxDate = new Date(dateKey);
      maxTransactionCount = dayTransactions.length;
    }
  });

  if (!maxDate || maxAmount === 0) return null;

  // NEW: Check activity correlation on the same day
  const expensiveDayStr = maxDate.toISOString().slice(0, 10);
  const activitiesOnDay = activities.filter(a => {
    const activityDateStr = a.time.toISOString().slice(0, 10);
    return (
      activityDateStr === expensiveDayStr &&
      a.amount &&
      (a.transactionType === 'sent' || a.transactionType === 'paid')
    );
  });

  const activitySpent = activitiesOnDay.reduce(
    (sum, a) => sum + convertToINR(a.amount!),
    0
  );

  // Generate message
  let message = '';

  if (activitiesOnDay.length > 0) {
    const totalSpent = maxAmount + activitySpent;
    message = `On ${formatDate(maxDate)}, you went wild! ${maxTransactionCount} card transactions + ${activitiesOnDay.length} app payments for ₹${Math.round(totalSpent).toLocaleString()}. `;
  } else {
    message = `On ${formatDate(maxDate)}, you spent ₹${Math.round(maxAmount).toLocaleString()}. `;
  }

  if (maxAmount >= 50000) {
    message += 'Remember this epic day? 🎉';
  } else if (maxAmount >= 10000) {
    message += 'That was a big day! 💳';
  } else if (maxAmount >= 5000) {
    message += 'A memorable spending spree! 🛍️';
  } else {
    message += 'Your peak spending day! 📊';
  }

  return {
    type: 'expensive_day',
    title: 'Your Most Expensive Day',
    tone: 'hard-hitting',
    data: {
      date: maxDate,
      amount: maxAmount
    },
    message
  };
}
