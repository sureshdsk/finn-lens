// Midnight Shopper insight calculator - tracks late night spending
// Funny insight: "Night Owl Spender" or "3 AM Shopping Squad"

import { ParsedData } from '../../types/data.types';
import { Insight, MidnightShopperInsightData } from '../../types/insight.types';
import { convertToINR } from '../../utils/categoryUtils';

/**
 * Calculate midnight shopper insight
 * Shows late night (12am-5am) spending patterns
 */
export function calculateMidnightShopperInsight(
  data: ParsedData
): Insight<MidnightShopperInsightData> | null {
  const { activities } = data;

  const financialActivities = activities.filter(
    a => a.amount && (a.transactionType === 'sent' || a.transactionType === 'paid')
  );

  if (financialActivities.length === 0) return null;

  // Filter late night transactions (12am - 5am)
  const lateNightTransactions = financialActivities.filter(a => {
    const hour = a.time.getHours();
    return hour >= 0 && hour < 5;
  });

  if (lateNightTransactions.length === 0) return null;

  // Find latest transaction
  let latestHour = 0;
  let latestTransaction = '';

  lateNightTransactions.forEach(a => {
    const hour = a.time.getHours();
    if (hour > latestHour || (hour === latestHour && a.time.getMinutes() > new Date(latestTransaction || 0).getMinutes())) {
      latestHour = hour;
      latestTransaction = a.title;
    }
  });

  // Calculate total late night spending
  const totalSpending = lateNightTransactions.reduce((sum, a) => {
    return sum + (a.amount ? convertToINR(a.amount) : 0);
  }, 0);

  const getMessage = () => {
    if (lateNightTransactions.length >= 50) {
      return `${lateNightTransactions.length} transactions after midnight. Are you okay? 🌙`;
    } else if (lateNightTransactions.length >= 20) {
      return `Night Owl Squad! ${lateNightTransactions.length} late night payments`;
    } else if (lateNightTransactions.length >= 10) {
      return `${lateNightTransactions.length} payments between 12-5 AM. Sleep is overrated?`;
    } else if (latestHour >= 3) {
      return `${latestHour} AM payments detected. That's dedication!`;
    }
    return `${lateNightTransactions.length} late night transactions spotted`;
  };

  return {
    type: 'midnight_shopper',
    title: 'Midnight Shopper',
    tone: 'funny',
    data: {
      lateNightCount: lateNightTransactions.length,
      latestHour,
      latestTransaction,
      totalLateNightSpending: { value: totalSpending, currency: 'INR' },
    },
    message: getMessage(),
  };
}
