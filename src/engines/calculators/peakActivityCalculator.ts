// Peak Activity insight calculator - analyzes transaction timing patterns

import { ParsedData } from '../../types/data.types';
import { Insight } from '../../types/insight.types';

export interface PeakActivityInsightData {
  peakHour: number; // 0-23
  peakDay: string; // 'Monday', 'Tuesday', etc.
  peakHourTransactions: number;
  peakDayTransactions: number;
  nightOwlScore: number; // % of transactions after 10pm
}

/**
 * Calculate peak activity times insight from activities and transactions
 * Shows when user is most active with payments
 */
export function calculatePeakActivityInsight(
  data: ParsedData
): Insight<PeakActivityInsightData> | null {
  const { activities, transactions } = data;

  // Combine activities and transactions
  const financialActivities = activities.filter(
    a => a.amount && a.transactionType !== 'other'
  );

  const allPayments = [
    ...financialActivities.map(a => ({ time: a.time })),
    ...transactions.map(t => ({ time: t.time })),
  ];

  if (allPayments.length === 0) return null;

  // Count by hour
  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<string, number>();
  let nightTransactions = 0;

  allPayments.forEach(payment => {
    const hour = payment.time.getHours();
    const day = payment.time.toLocaleDateString('en-US', { weekday: 'long' });

    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);

    if (hour >= 22 || hour < 6) nightTransactions++;
  });

  // Find peaks
  let peakHour = 0,
    peakHourCount = 0;
  hourCounts.forEach((count, hour) => {
    if (count > peakHourCount) {
      peakHour = hour;
      peakHourCount = count;
    }
  });

  let peakDay = '',
    peakDayCount = 0;
  dayCounts.forEach((count, day) => {
    if (count > peakDayCount) {
      peakDay = day;
      peakDayCount = count;
    }
  });

  const nightOwlScore = Math.round(
    (nightTransactions / allPayments.length) * 100
  );

  // Convert 24-hour format to 12-hour AM/PM format
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  return {
    type: 'peak_activity',
    title: 'Peak Activity Times',
    tone: 'funny',
    data: {
      peakHour,
      peakDay,
      peakHourTransactions: peakHourCount,
      peakDayTransactions: peakDayCount,
      nightOwlScore,
    },
    message:
      nightOwlScore > 30
        ? `Night owl alert! ${nightOwlScore}% of payments after 10pm`
        : `${peakDay}s at ${formatHour(peakHour)} is your payment time`,
  };
}
