// Responsible One Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, ResponsibleOneData } from '../../types/insight.types';

/**
 * Calculate Responsible One insight
 * Tracks expenses where user is the creator/organizer
 */
export function calculateResponsibleOneInsight(
  data: ParsedData
): Insight<ResponsibleOneData> | null {
  const { groupExpenses } = data;

  if (groupExpenses.length === 0) return null;

  // We need to identify which expenses the user created
  // Since we don't have a "self" identifier, we'll assume the most common creator is the user
  const creatorMap = new Map<string, number>();

  groupExpenses.forEach(expense => {
    if (expense.creator) {
      creatorMap.set(expense.creator, (creatorMap.get(expense.creator) || 0) + 1);
    }
  });

  if (creatorMap.size === 0) return null;

  // Find the most common creator (assumed to be the user)
  let userCreator = '';
  let maxCount = 0;

  creatorMap.forEach((count, creator) => {
    if (count > maxCount) {
      maxCount = count;
      userCreator = creator;
    }
  });

  // Get expenses created by user
  const userCreatedExpenses = groupExpenses.filter(e => e.creator === userCreator);
  const createdCount = userCreatedExpenses.length;

  if (createdCount === 0) return null;

  // Calculate total amount organized
  let totalAmount = 0;
  userCreatedExpenses.forEach(expense => {
    const amountInINR = expense.totalAmount.currency === 'INR'
      ? expense.totalAmount.value
      : expense.totalAmount.value * 83; // Approx USD to INR
    totalAmount += amountInINR;
  });

  // Generate message
  let message = `You organized ${createdCount} group expense${createdCount === 1 ? '' : 's'}. `;
  message += `That's ₹${totalAmount.toFixed(0)} in total! `;

  if (createdCount >= 20) {
    message += 'You\'re THE planner! 📋';
  } else if (createdCount >= 10) {
    message += 'The organizing guru! 🎯';
  } else if (createdCount >= 5) {
    message += 'The responsible one! ⭐';
  } else {
    message += 'You take initiative! 💪';
  }

  return {
    type: 'responsible_one',
    title: 'The Responsible One',
    tone: 'wholesome',
    data: {
      createdCount,
      totalAmount
    },
    message
  };
}
