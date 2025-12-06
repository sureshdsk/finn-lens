// Category classification utilities

import categories from '../categories.json';
import { Currency } from '../types/data.types';

export type TransactionCategory =
  | 'Food'
  | 'Groceries'
  | 'Clothing'
  | 'Entertainment'
  | 'E-commerce'
  | 'Travel & Transport'
  | 'Utilities & Bills'
  | 'Healthcare'
  | 'Education'
  | 'Investments'
  | 'Others';

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
 * Uses keyword matching from categories.json
 */
export function categorizeTransaction(description: string): TransactionCategory {
  const lowerDesc = description.toLowerCase();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return category as TransactionCategory;
      }
    }
  }

  return 'Others'; // Default fallback
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
