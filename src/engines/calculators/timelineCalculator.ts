// Spending Timeline Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, SpendingTimelineData } from '../../types/insight.types';
import { getTransactionDateRange, daysBetween, yearsBetween, formatDate } from '../../utils/dateUtils';

/**
 * Calculate Spending Timeline insight
 * Shows the journey from first to last transaction
 */
export function calculateSpendingTimelineInsight(
  data: ParsedData
): Insight<SpendingTimelineData> | null {
  const { transactions, activities } = data;

  if (transactions.length === 0) return null;

  const { min, max } = getTransactionDateRange(transactions);

  if (!min || !max) return null;

  const daysSince = daysBetween(min, max);
  const yearsSince = yearsBetween(min, max);

  // NEW: Count financial activities (sent/received/paid)
  const activityFrequency = activities.filter(
    a => a.amount && a.transactionType !== 'other'
  ).length;

  // Generate message
  let message = `From ${formatDate(min)} to ${formatDate(max)}. `;

  const years = parseFloat(yearsSince);
  if (years >= 1) {
    message += `That's ${yearsSince} years of payments! `;
  } else if (daysSince >= 30) {
    const months = Math.floor(daysSince / 30);
    message += `That's ${months} month${months === 1 ? '' : 's'} of payments! `;
  } else {
    message += `That's ${daysSince} day${daysSince === 1 ? '' : 's'} of payments! `;
  }

  // NEW: Add activity context
  if (activityFrequency > 0) {
    message += `${transactions.length} transactions + ${activityFrequency} app payments. `;
  }

  message += `Your digital payment journey. 🚀`;

  return {
    type: 'spending_timeline',
    title: 'Your Spending Timeline',
    tone: 'thoughtful',
    data: {
      firstDate: min,
      lastDate: max,
      daysSince,
      yearsSince
    },
    message
  };
}
