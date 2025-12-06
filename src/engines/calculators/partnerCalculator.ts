// Split Partner Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, SplitPartnerData } from '../../types/insight.types';

/**
 * Calculate Split Partner insight
 * Finds the person you split bills with most frequently
 */
export function calculateSplitPartnerInsight(
  data: ParsedData
): Insight<SplitPartnerData> | null {
  const { groupExpenses } = data;

  if (groupExpenses.length === 0) return null;

  // Count interactions with each person
  const partnerMap = new Map<string, number>();

  groupExpenses.forEach(expense => {
    // Get unique participants in this expense (excluding self - the creator)
    const participants = new Set<string>();

    expense.items.forEach(item => {
      // Add payer if it's not the creator
      if (item.payer && item.payer !== expense.creator) {
        participants.add(item.payer);
      }
    });

    // Increment count for each participant
    participants.forEach(person => {
      partnerMap.set(person, (partnerMap.get(person) || 0) + 1);
    });
  });

  if (partnerMap.size === 0) return null;

  // Find most frequent partner
  let partnerName = '';
  let splitCount = 0;

  partnerMap.forEach((count, name) => {
    if (count > splitCount) {
      splitCount = count;
      partnerName = name;
    }
  });

  if (!partnerName) return null;

  // Generate message
  let message = `${partnerName} is your split buddy! `;
  message += `You've shared ${splitCount} expense${splitCount === 1 ? '' : 's'} together. `;

  if (splitCount >= 20) {
    message += 'Best financial friends! 👯';
  } else if (splitCount >= 10) {
    message += 'Regular split partners! 🤝';
  } else if (splitCount >= 5) {
    message += 'Frequent splitters! 💸';
  } else {
    message += 'Split buddies! 🧾';
  }

  return {
    type: 'split_partner',
    title: 'Your Split Partner',
    tone: 'social',
    data: {
      partnerName,
      splitCount
    },
    message
  };
}
