// Payment Streak insight calculator - tracks consecutive payment days
// Funny insight: "Payment Streak Warrior" or "Spending Spree Champion"

import { ParsedData } from '../../types/data.types';
import { Insight, PaymentStreakInsightData } from '../../types/insight.types';

/**
 * Calculate payment streak insight
 * Shows longest consecutive days with payments
 */
export function calculatePaymentStreakInsight(
  data: ParsedData
): Insight<PaymentStreakInsightData> | null {
  const { activities, transactions } = data;

  // Combine activities and transactions
  const financialActivities = activities.filter(
    a => a.amount && (a.transactionType === 'sent' || a.transactionType === 'paid')
  );

  // Get all payment dates from both sources
  const allPaymentDates = [
    ...financialActivities.map(a => a.time),
    ...transactions.map(t => t.time),
  ];

  if (allPaymentDates.length === 0) return null;

  // Sort by date
  const sorted = [...allPaymentDates].sort((a, b) => a.getTime() - b.getTime());

  // Get unique dates (YYYY-MM-DD)
  const uniqueDates = new Set(
    sorted.map(d => d.toISOString().split('T')[0])
  );
  const dates = Array.from(uniqueDates).sort();

  if (dates.length === 0) return null;

  // Find longest streak
  let longestStreak = 1;
  let longestStreakStart = dates[0];
  let longestStreakEnd = dates[0];
  let currentStreak = 1;
  let currentStreakStart = dates[0];

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      currentStreak++;
    } else {
      // Streak broken
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStart = currentStreakStart;
        longestStreakEnd = dates[i - 1];
      }
      currentStreak = 1;
      currentStreakStart = dates[i];
    }
  }

  // Check final streak
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
    longestStreakStart = currentStreakStart;
    longestStreakEnd = dates[dates.length - 1];
  }

  // Calculate current streak from last date
  const today = new Date();
  const lastDate = new Date(dates[dates.length - 1]);
  const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  let currentStreakFromEnd = 0;
  if (daysSinceLast <= 1) {
    // Active streak
    for (let i = dates.length - 1; i > 0; i--) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreakFromEnd++;
      } else {
        break;
      }
    }
    currentStreakFromEnd++; // Include the last day
  }

  const getMessage = () => {
    if (longestStreak >= 30) {
      return `Payment Marathon Champion! ${longestStreak} days straight 🏃`;
    } else if (longestStreak >= 14) {
      return `${longestStreak} consecutive days of payments. Your wallet was crying!`;
    } else if (longestStreak >= 7) {
      return `${longestStreak} day payment streak! Consistency level: impressive`;
    } else if (longestStreak >= 3) {
      return `${longestStreak} days in a row. Not bad, not bad!`;
    }
    return `Longest streak: ${longestStreak} days of consecutive spending`;
  };

  return {
    type: 'payment_streak',
    title: 'Payment Streak',
    tone: 'funny',
    data: {
      longestStreak,
      streakStartDate: new Date(longestStreakStart),
      streakEndDate: new Date(longestStreakEnd),
      currentStreak: currentStreakFromEnd,
    },
    message: getMessage(),
  };
}
