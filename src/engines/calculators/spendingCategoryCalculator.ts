// Spending Category insight calculator - analyzes spending by category

import { ParsedData } from '../../types/data.types';
import { Insight } from '../../types/insight.types';
import {
  getCategoryStats,
  TransactionCategory,
  convertToINR,
} from '../../utils/categoryUtils';

export interface SpendingCategoryInsightData {
  topCategory: TransactionCategory;
  topCategoryAmount: { value: number; currency: 'INR' };
  topCategoryCount: number;
  categoryBreakdown: Array<{
    category: TransactionCategory;
    amount: { value: number; currency: 'INR' };
    count: number;
    percentage: number;
  }>;
  diversityScore: number; // How many categories used (0-11)
}

/**
 * Calculate spending category insight
 * Shows top spending category and breakdown
 */
export function calculateSpendingCategoryInsight(
  data: ParsedData
): Insight<SpendingCategoryInsightData> | null {
  const { transactions, activities } = data;

  // Combine transactions and activities
  const allItems = [
    ...transactions.map(t => ({ description: t.description, amount: t.amount })),
    ...activities
      .filter(
        a =>
          a.amount &&
          (a.transactionType === 'sent' || a.transactionType === 'paid')
      )
      .map(a => ({ description: a.title, amount: a.amount! })),
  ];

  if (allItems.length === 0) return null;

  const categoryStats = getCategoryStats(allItems);

  // Find top category
  let topCategory: TransactionCategory = 'Others';
  let topAmount = 0;
  let topCount = 0;

  categoryStats.forEach((stats, category) => {
    if (stats.total > topAmount) {
      topCategory = category;
      topAmount = stats.total;
      topCount = stats.count;
    }
  });

  // Calculate total for percentages
  const grandTotal = allItems.reduce(
    (sum, item) => sum + convertToINR(item.amount),
    0
  );

  // Create breakdown sorted by amount
  const categoryBreakdown = Array.from(categoryStats.entries())
    .map(([category, stats]) => ({
      category,
      amount: { value: Math.round(stats.total), currency: 'INR' as const },
      count: stats.count,
      percentage: Math.round((stats.total / grandTotal) * 100),
    }))
    .sort((a, b) => b.amount.value - a.amount.value);

  const diversityScore = categoryStats.size;

  // Generate contextual message based on top category
  const categoryMessages: Record<TransactionCategory, string> = {
    Food: `Foodie alert! ₹${Math.round(topAmount).toLocaleString()} spent on food`,
    Entertainment: `Living your best life! ₹${Math.round(topAmount).toLocaleString()} on entertainment`,
    'Travel & Transport': `Always on the move! ₹${Math.round(topAmount).toLocaleString()} on travel`,
    'E-commerce': `Shopping spree! ₹${Math.round(topAmount).toLocaleString()} on online shopping`,
    'Utilities & Bills': `Responsible adult! ₹${Math.round(topAmount).toLocaleString()} on bills`,
    Education: `Investing in knowledge! ₹${Math.round(topAmount).toLocaleString()} on education`,
    Healthcare: `Health first! ₹${Math.round(topAmount).toLocaleString()} on healthcare`,
    Groceries: `Home chef! ₹${Math.round(topAmount).toLocaleString()} on groceries`,
    Clothing: `Fashionista! ₹${Math.round(topAmount).toLocaleString()} on clothing`,
    Investments: `Smart saver! ₹${Math.round(topAmount).toLocaleString()} invested`,
    Others: `Diverse spender! ₹${Math.round(topAmount).toLocaleString()} across ${topCount} payments`,
  };

  return {
    type: 'spending_category',
    title: 'Spending Categories',
    tone: 'funny',
    data: {
      topCategory,
      topCategoryAmount: { value: Math.round(topAmount), currency: 'INR' },
      topCategoryCount: topCount,
      categoryBreakdown,
      diversityScore,
    },
    message: categoryMessages[topCategory],
  };
}
