// Money Network Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, MoneyNetworkData } from '../../types/insight.types';

/**
 * Calculate Money Network insight
 * Tracks unique people and groups in expense sharing
 */
export function calculateMoneyNetworkInsight(
  data: ParsedData
): Insight<MoneyNetworkData> | null {
  const { groupExpenses, activities } = data;

  // Track unique people from group expenses
  const peopleFromGroups = new Set<string>();
  const groupSet = new Set<string>();

  groupExpenses.forEach(expense => {
    // Add group name
    if (expense.groupName) {
      groupSet.add(expense.groupName);
    }

    // Add creator
    if (expense.creator) {
      peopleFromGroups.add(expense.creator);
    }

    // Add all payers
    expense.items.forEach(item => {
      if (item.payer) {
        peopleFromGroups.add(item.payer);
      }
    });
  });

  // NEW: Track unique people from activities
  const peopleFromActivities = new Set<string>();
  activities.forEach(activity => {
    if (activity.recipient) peopleFromActivities.add(activity.recipient);
    if (activity.sender) peopleFromActivities.add(activity.sender);
  });

  // Combine both sets for total unique people
  const allPeople = new Set([...peopleFromGroups, ...peopleFromActivities]);
  const peopleCount = allPeople.size;
  const groupCount = groupSet.size;
  const people = Array.from(allPeople);

  if (peopleCount === 0) return null;

  // Generate message
  let message = '';

  if (peopleFromGroups.size > 0 && peopleFromActivities.size > 0) {
    message = `You transact with ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'} `;
    if (groupCount > 0) {
      message += `(${peopleFromGroups.size} in groups, ${peopleFromActivities.size} direct payments). `;
    } else {
      message += 'in your network! ';
    }
  } else if (peopleFromGroups.size > 0) {
    message = `You share expenses with ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'} `;
    if (groupCount > 0) {
      message += `across ${groupCount} group${groupCount === 1 ? '' : 's'}! `;
    } else {
      message += 'in your network! ';
    }
  } else {
    message = `You've sent/received money with ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}! `;
  }

  if (peopleCount >= 20) {
    message += 'Your money network is HUGE! 🌐';
  } else if (peopleCount >= 10) {
    message += 'Quite the social spender! 👥';
  } else if (peopleCount >= 5) {
    message += 'A solid squad! 🤝';
  } else {
    message += 'Your inner circle! 💫';
  }

  return {
    type: 'money_network',
    title: 'Your Money Network',
    tone: 'social',
    data: {
      peopleCount,
      groupCount,
      people
    },
    message
  };
}
