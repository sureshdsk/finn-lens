// Money Flow insight calculator - analyzes sent vs received transactions

import { ParsedData } from '../../types/data.types';
import { Insight } from '../../types/insight.types';
import { convertToINR } from '../../utils/categoryUtils';

export interface MoneyFlowInsightData {
  totalSent: { value: number; currency: 'INR' };
  totalReceived: { value: number; currency: 'INR' };
  netFlow: { value: number; currency: 'INR' };
  sentCount: number;
  receivedCount: number;
  flowDirection: 'giver' | 'receiver' | 'balanced';
}

/**
 * Calculate money flow insight from activities
 * Shows total money sent vs received
 */
export function calculateMoneyFlowInsight(
  data: ParsedData
): Insight<MoneyFlowInsightData> | null {
  const { activities } = data;

  const sentActivities = activities.filter(
    a => a.transactionType === 'sent' && a.amount
  );
  const receivedActivities = activities.filter(
    a => a.transactionType === 'received' && a.amount
  );

  if (sentActivities.length === 0 && receivedActivities.length === 0) {
    return null;
  }

  const totalSent = sentActivities.reduce(
    (sum, a) => sum + convertToINR(a.amount!),
    0
  );
  const totalReceived = receivedActivities.reduce(
    (sum, a) => sum + convertToINR(a.amount!),
    0
  );

  const netFlow = totalReceived - totalSent;
  const flowDirection: 'giver' | 'receiver' | 'balanced' =
    netFlow > 1000 ? 'receiver' : netFlow < -1000 ? 'giver' : 'balanced';

  return {
    type: 'money_flow',
    title: 'Money Flow',
    tone: 'funny',
    data: {
      totalSent: { value: totalSent, currency: 'INR' },
      totalReceived: { value: totalReceived, currency: 'INR' },
      netFlow: { value: netFlow, currency: 'INR' },
      sentCount: sentActivities.length,
      receivedCount: receivedActivities.length,
      flowDirection,
    },
    message:
      flowDirection === 'giver'
        ? `You're the generous one! Sent ₹${Math.round(totalSent).toLocaleString()} to friends`
        : flowDirection === 'receiver'
        ? `Money magnet! Received ₹${Math.round(totalReceived).toLocaleString()} this year`
        : `Balanced flow! ₹${Math.round(totalSent).toLocaleString()} sent, ₹${Math.round(totalReceived).toLocaleString()} received`,
  };
}
