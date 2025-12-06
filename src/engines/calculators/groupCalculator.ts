// Group Expense Champion Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, GroupChampionData } from '../../types/insight.types';

/**
 * Calculate Group Expense Champion insight
 * Measures reliability in paying group bills
 */
export function calculateGroupChampionInsight(
  data: ParsedData
): Insight<GroupChampionData> | null {
  const { groupExpenses } = data;

  if (groupExpenses.length === 0) return null;

  // Count paid vs unpaid items across all group expenses
  let totalCount = 0;
  let paidCount = 0;

  groupExpenses.forEach(expense => {
    expense.items.forEach(item => {
      totalCount++;
      if (item.state === 'PAID_RECEIVED') {
        paidCount++;
      }
    });
  });

  if (totalCount === 0) return null;

  const reliabilityScore = Math.round((paidCount / totalCount) * 100);
  const totalSplits = groupExpenses.length;

  // Generate message based on reliability score
  let message = `You paid ${paidCount} out of ${totalCount} split bills. `;
  message += `That's ${reliabilityScore}% reliability! `;

  if (reliabilityScore === 100) {
    message += '🌟 Perfect score!';
  } else if (reliabilityScore >= 90) {
    message += 'Almost perfect!';
  } else if (reliabilityScore >= 75) {
    message += 'Pretty reliable!';
  } else if (reliabilityScore >= 50) {
    message += 'Room for improvement...';
  } else {
    message += 'Time to settle those debts? 😅';
  }

  return {
    type: 'group_champion',
    title: 'Group Expense Champion',
    tone: 'hard-hitting',
    data: {
      reliabilityScore,
      totalSplits,
      paidCount,
      totalCount
    },
    message
  };
}
