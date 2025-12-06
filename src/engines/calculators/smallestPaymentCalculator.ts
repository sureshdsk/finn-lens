// Smallest Payment insight calculator - finds the tiniest payment
// Funny insight: "Penny Pincher Alert" or "Why did you even bother?"

import { ParsedData } from '../../types/data.types';
import { Insight, SmallestPaymentInsightData } from '../../types/insight.types';
import { convertToINR } from '../../utils/categoryUtils';

/**
 * Calculate smallest payment insight
 * Highlights hilariously small transactions
 */
export function calculateSmallestPaymentInsight(
  data: ParsedData
): Insight<SmallestPaymentInsightData> | null {
  const { activities } = data;

  const financialActivities = activities.filter(
    a => a.amount && a.amount.value > 0 && (a.transactionType === 'sent' || a.transactionType === 'paid')
  );

  if (financialActivities.length === 0) return null;

  // Find smallest payment
  let smallest = financialActivities[0];
  let smallestINR = convertToINR(smallest.amount!);

  financialActivities.forEach(a => {
    const amountINR = convertToINR(a.amount!);
    if (amountINR < smallestINR) {
      smallest = a;
      smallestINR = amountINR;
    }
  });

  const getMessage = () => {
    if (smallestINR <= 1) {
      return `₹${smallestINR.toFixed(2)}?! You paid the transaction fee for THIS? 😭`;
    } else if (smallestINR <= 5) {
      return `₹${smallestINR.toFixed(2)} - when you're too lazy to carry exact change`;
    } else if (smallestINR <= 10) {
      return `Smallest payment: ₹${smallestINR.toFixed(2)}. Every penny counts!`;
    } else if (smallestINR <= 20) {
      return `₹${smallestINR.toFixed(2)} - the minimalist payment champion`;
    }
    return `Smallest transaction: ₹${smallestINR.toFixed(2)}`;
  };

  return {
    type: 'smallest_payment',
    title: 'Smallest Payment',
    tone: 'funny',
    data: {
      amount: smallest.amount!,
      description: smallest.title,
      date: smallest.time,
    },
    message: getMessage(),
  };
}
