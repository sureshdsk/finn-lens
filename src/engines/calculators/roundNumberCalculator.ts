// Round Number Obsession insight calculator
// Funny insight: "The OCD Payment Award" or "Round Number Fanatic"

import { ParsedData } from '../../types/data.types';
import { Insight, RoundNumberObsessionInsightData } from '../../types/insight.types';
import { convertToINR } from '../../utils/categoryUtils';

/**
 * Calculate round number obsession insight
 * Detects if user loves paying in round numbers (₹100, ₹500, ₹1000, etc.)
 */
export function calculateRoundNumberObsessionInsight(
  data: ParsedData
): Insight<RoundNumberObsessionInsightData> | null {
  const { activities } = data;

  const financialActivities = activities.filter(
    a => a.amount && (a.transactionType === 'sent' || a.transactionType === 'paid')
  );

  if (financialActivities.length < 10) return null; // Need enough data

  // Count round numbers
  const roundNumberCounts = new Map<number, number>();
  let roundPayments = 0;

  financialActivities.forEach(a => {
    const amountINR = Math.round(convertToINR(a.amount!));

    // Check if it's a round number (divisible by 10, 50, 100, 500, 1000)
    const isRound10 = amountINR % 10 === 0 && amountINR > 0;
    const isRound50 = amountINR % 50 === 0;
    const isRound100 = amountINR % 100 === 0;
    const isRound500 = amountINR % 500 === 0;
    const isRound1000 = amountINR % 1000 === 0;

    if (isRound1000) {
      roundPayments++;
      roundNumberCounts.set(1000, (roundNumberCounts.get(1000) || 0) + 1);
    } else if (isRound500) {
      roundPayments++;
      roundNumberCounts.set(500, (roundNumberCounts.get(500) || 0) + 1);
    } else if (isRound100) {
      roundPayments++;
      roundNumberCounts.set(100, (roundNumberCounts.get(100) || 0) + 1);
    } else if (isRound50) {
      roundPayments++;
      roundNumberCounts.set(50, (roundNumberCounts.get(50) || 0) + 1);
    } else if (isRound10) {
      roundPayments++;
      roundNumberCounts.set(10, (roundNumberCounts.get(10) || 0) + 1);
    }
  });

  const roundPercentage = Math.round((roundPayments / financialActivities.length) * 100);

  // Find favorite round number
  let favoriteRoundNumber = 10;
  let maxCount = 0;

  roundNumberCounts.forEach((count, num) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteRoundNumber = num;
    }
  });

  // Only show this insight if user has a decent round number habit
  if (roundPercentage < 20) return null;

  const getMessage = () => {
    if (roundPercentage >= 70) {
      return `${roundPercentage}% round numbers. OCD level: MAXIMUM 🎯`;
    } else if (roundPercentage >= 50) {
      return `${roundPercentage}% of payments are round numbers. The perfectionist!`;
    } else if (roundPercentage >= 30) {
      return `Round number enthusiast: ${roundPercentage}% of payments`;
    }
    return `${roundPercentage}% round numbers. You like things neat!`;
  };

  return {
    type: 'round_number_obsession',
    title: 'Round Number Obsession',
    tone: 'funny',
    data: {
      roundPayments,
      totalPayments: financialActivities.length,
      roundPercentage,
      favoriteRoundNumber,
    },
    message: getMessage(),
  };
}
