// Bulk Payment insight calculator - analyzes transaction velocity

import { ParsedData } from '../../types/data.types';
import { Insight } from '../../types/insight.types';

export interface BulkPaymentInsightData {
  maxTransactionsInHour: number;
  maxTransactionsInDay: number;
  busiestDate: Date;
  velocityScore: number; // avg transactions per active day
}

/**
 * Calculate bulk payment insight from activities and transactions
 * Shows transaction velocity and burst patterns
 */
export function calculateBulkPaymentInsight(
  data: ParsedData
): Insight<BulkPaymentInsightData> | null {
  const { activities, transactions } = data;

  // Combine activities and transactions
  const financialActivities = activities.filter(
    a => a.amount && a.transactionType !== 'other'
  );

  // Convert transactions to activity-like objects for processing
  const transactionActivities = transactions.map(t => ({
    time: t.time,
    amount: t.amount,
    transactionType: 'paid' as const,
  }));

  const allPayments = [...financialActivities, ...transactionActivities];

  if (allPayments.length === 0) return null;

  // Group by hour and day
  const hourGroups = new Map<string, number>(); // "2025-12-04T10" -> count
  const dayGroups = new Map<string, number>(); // "2025-12-04" -> count

  allPayments.forEach(payment => {
    const hourKey = payment.time.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const dayKey = payment.time.toISOString().slice(0, 10); // YYYY-MM-DD

    hourGroups.set(hourKey, (hourGroups.get(hourKey) || 0) + 1);
    dayGroups.set(dayKey, (dayGroups.get(dayKey) || 0) + 1);
  });

  // Find max
  let maxHour = 0,
    maxDay = 0,
    busiestDateKey = '';

  hourGroups.forEach(count => {
    if (count > maxHour) maxHour = count;
  });

  dayGroups.forEach((count, dateKey) => {
    if (count > maxDay) {
      maxDay = count;
      busiestDateKey = dateKey;
    }
  });

  const velocityScore = Math.round(
    allPayments.length / dayGroups.size
  );

  return {
    type: 'bulk_payment',
    title: 'Payment Velocity',
    tone: 'funny',
    data: {
      maxTransactionsInHour: maxHour,
      maxTransactionsInDay: maxDay,
      busiestDate: new Date(busiestDateKey),
      velocityScore,
    },
    message:
      maxHour > 10
        ? `Speed demon! ${maxHour} transactions in one hour`
        : `You averaged ${velocityScore} payments per active day`,
  };
}
