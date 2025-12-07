// Category classification utilities
// This file is maintained for backward compatibility
// New code should use multi-layer-classifier.ts instead

import classificationRules from '../config/classification-rules.json' assert { type: 'json' };
import { Currency } from '../types/data.types';

export type TransactionCategory =
  | 'Food'
  | 'Groceries'
  | 'Clothing'
  | 'Entertainment'
  | 'E-commerce'
  | 'Travel & Transport'
  | 'Bills & Utilities'
  | 'Utilities & Bills'
  | 'Healthcare'
  | 'Education'
  | 'Investment & Finance'
  | 'Investments'
  | 'Transfers'
  | 'Bank Transfers'
  | 'Transfers & Payments'
  | 'Services & Miscellaneous'
  | 'Others';

// Extract categories from unified config
const categories = classificationRules.categories as Record<string, { keywords: string[] }>;

/**
 * Convert any currency to INR for aggregation
 * Assumes 1 USD ≈ 83 INR (approximate exchange rate)
 */
export function convertToINR(amount: Currency): number {
  if (amount.currency === 'INR') {
    return amount.value;
  }
  // Convert USD to INR
  return amount.value * 83;
}

/**
 * Categorize a transaction or activity based on description
 * Uses keyword matching from unified config + smart pattern detection
 *
 * @deprecated Use classifyTransaction from multi-layer-classifier.ts for better accuracy
 */
export function categorizeTransaction(description: string): TransactionCategory {
  const lowerDesc = description.toLowerCase();

  // FIRST: Check each category's keywords (business/service categories)
  for (const [category, rules] of Object.entries(categories)) {
    if (category === 'Services & Miscellaneous') continue; // Skip fallback category in first pass
    for (const keyword of rules.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return category as TransactionCategory;
      }
    }
  }

  // SECOND: Check for actual bank transfers (NEFT/IMPS/RTGS)
  const bankTransferPatterns = [
    /\bneft\b/i,
    /\bimps\b/i,
    /\brtgs\b/i,
    /to\s+\w*\s*bank\s+account/i,  // "to HDFC Bank Account"
    /from\s+\w*\s*bank\s+account/i,
  ];

  for (const pattern of bankTransferPatterns) {
    if (pattern.test(description)) {
      return 'Bank Transfers';
    }
  }

  // THIRD: Check for person-to-person transfers
  const transferPatterns = [
    /^sent\s+[₹$]/i,           // "Sent ₹500"
    /^received\s+[₹$]/i,       // "Received ₹500"
  ];

  for (const pattern of transferPatterns) {
    if (pattern.test(description)) {
      return 'Transfers';
    }
  }

  // FOURTH: Check if payment to a person (name pattern)
  // "Paid to [NAME]" where NAME is capitalized
  const personPaymentPattern = /(?:paid|to)\s+[A-Z][a-z]+(?:\s+[A-Z])?(?:\s+using\s+bank)/i;
  if (personPaymentPattern.test(description)) {
    return 'Transfers';
  }

  return 'Services & Miscellaneous'; // Default fallback
}

/**
 * Get category statistics for a list of transactions
 */
export function getCategoryStats(
  items: Array<{ description: string; amount: Currency }>
): Map<TransactionCategory, { count: number; total: number }> {
  const stats = new Map<TransactionCategory, { count: number; total: number }>();

  items.forEach(item => {
    const category = categorizeTransaction(item.description);
    const existing = stats.get(category) || { count: 0, total: 0 };

    existing.count++;
    existing.total += convertToINR(item.amount);

    stats.set(category, existing);
  });

  return stats;
}
