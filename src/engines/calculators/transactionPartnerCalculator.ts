// Transaction Partner insight calculator - finds most frequent payment partner

import { ParsedData } from '../../types/data.types';
import { Insight } from '../../types/insight.types';
import { convertToINR } from '../../utils/categoryUtils';

export interface TransactionPartnerInsightData {
  mostFrequentPartner: string;
  transactionCount: number;
  totalAmount: { value: number; currency: 'INR' };
  partnerType: 'recipient' | 'sender' | 'both';
}

/**
 * Calculate transaction partner insight from activities
 * Shows most frequent person for money transfers
 */
export function calculateTransactionPartnerInsight(
  data: ParsedData
): Insight<TransactionPartnerInsightData> | null {
  const { activities } = data;

  // Count transactions per person
  const partnerCounts = new Map<
    string,
    {
      count: number;
      totalAmount: number;
      types: Set<'sent' | 'received'>;
    }
  >();

  activities.forEach(activity => {
    if (!activity.amount) return;

    const partner = activity.recipient || activity.sender;
    if (!partner) return;

    const existing = partnerCounts.get(partner) || {
      count: 0,
      totalAmount: 0,
      types: new Set(),
    };

    existing.count++;
    existing.totalAmount += convertToINR(activity.amount);
    if (activity.transactionType === 'sent') existing.types.add('sent');
    if (activity.transactionType === 'received') existing.types.add('received');

    partnerCounts.set(partner, existing);
  });

  if (partnerCounts.size === 0) return null;

  // Find most frequent
  let mostFrequent = {
    name: '',
    data: { count: 0, totalAmount: 0, types: new Set<'sent' | 'received'>() },
  };

  partnerCounts.forEach((partnerData, name) => {
    if (partnerData.count > mostFrequent.data.count) {
      mostFrequent = { name, data: partnerData };
    }
  });

  if (!mostFrequent.name) return null;

  const partnerType: 'recipient' | 'sender' | 'both' =
    mostFrequent.data.types.size === 2
      ? 'both'
      : mostFrequent.data.types.has('sent')
      ? 'recipient'
      : 'sender';

  return {
    type: 'transaction_partner',
    title: 'Transaction Partner',
    tone: 'funny',
    data: {
      mostFrequentPartner: mostFrequent.name,
      transactionCount: mostFrequent.data.count,
      totalAmount: {
        value: mostFrequent.data.totalAmount,
        currency: 'INR',
      },
      partnerType,
    },
    message: `${mostFrequent.name} is your payment buddy! ${mostFrequent.data.count} transactions together`,
  };
}
