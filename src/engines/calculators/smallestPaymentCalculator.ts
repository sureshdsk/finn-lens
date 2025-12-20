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
  const { activities, transactions } = data;

  // Combine activities and transactions
  const financialActivities = activities.filter(
    a => a.amount && a.amount.value > 0 && (a.transactionType === 'sent' || a.transactionType === 'paid')
  );

  const allPayments = [
    ...financialActivities.map(a => ({ amount: a.amount!, description: a.title, time: a.time })),
    ...transactions.filter(t => t.amount.value > 0).map(t => ({ amount: t.amount, description: t.description, time: t.time })),
  ];

  if (allPayments.length === 0) return null;

  // Find smallest payment
  let smallest = allPayments[0];
  let smallestINR = convertToINR(smallest.amount);

  allPayments.forEach(payment => {
    const amountINR = convertToINR(payment.amount);
    if (amountINR < smallestINR) {
      smallest = payment;
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
      amount: { value: smallestINR, currency: 'INR' },
      description: smallest.description,
      date: smallest.time,
    },
    message: getMessage(),
  };
}
