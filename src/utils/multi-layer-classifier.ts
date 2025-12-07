/**
 * Multi-Layer Classification Engine
 * Implements priority-based, configurable merchant categorization
 */

import classificationRules from '../config/classification-rules.json' assert { type: 'json' };
import type { ClassificationResult } from '../types/classifier.types';

interface CategoryRules {
  keywords: string[];
  patterns: string[];
  exactMatches: Record<string, boolean>;
}

type Categories = Record<string, CategoryRules>;

const config = classificationRules as {
  version: string;
  categories: Categories;
  exclusions: {
    payment_gateways: string[];
    bank_isos: string[];
    personal_indicators: string[];
    technical_terms: string[];
  };
  fuzzyKeywords: Record<string, string[]>;
};

const categories = config.categories;

/**
 * Layer 1: Exclusion Rules
 * Filters out non-merchant transactions (payment gateways, bank ISOs, P2P transfers)
 */
function checkExclusions(merchant: string): boolean {
  const lowerMerchant = merchant.toLowerCase();
  const exclusions = config.exclusions;

  // Check payment gateways
  for (const gateway of exclusions.payment_gateways) {
    if (lowerMerchant.includes(gateway.toLowerCase())) {
      return true;
    }
  }

  // Check bank ISOs (regex patterns)
  for (const pattern of exclusions.bank_isos) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(merchant)) {
        return true;
      }
    } catch (e) {
      console.warn(`Invalid exclusion pattern: ${pattern}`);
    }
  }

  // Check personal name indicators
  for (const pattern of exclusions.personal_indicators) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(merchant)) {
        return true;
      }
    } catch (e) {
      console.warn(`Invalid personal indicator pattern: ${pattern}`);
    }
  }

  // Check technical terms
  for (const term of exclusions.technical_terms) {
    if (lowerMerchant.includes(term.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Layer 2: Exact Match Rules
 * Brand-specific exact matches (highest priority)
 */
function checkExactMatches(merchant: string): string | null {
  const upperMerchant = merchant.toUpperCase().trim();

  // Check each category's exact matches
  for (const [category, rules] of Object.entries(categories)) {
    for (const exactMerchant of Object.keys(rules.exactMatches)) {
      if (upperMerchant === exactMerchant.toUpperCase()) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Layer 3: Fuzzy Keyword Matching
 * Handles misspellings and variations
 */
function checkFuzzyKeywords(merchant: string): string | null {
  const lowerMerchant = merchant.toLowerCase();
  const fuzzyKeywords = config.fuzzyKeywords;

  // For each fuzzy keyword set, check if any variant matches
  for (const [baseKeyword, variants] of Object.entries(fuzzyKeywords)) {
    for (const variant of variants) {
      if (lowerMerchant.includes(variant.toLowerCase())) {
        // Find which category contains this base keyword
        for (const [category, rules] of Object.entries(categories)) {
          if (rules.keywords.some(kw => kw.toLowerCase() === baseKeyword.toLowerCase())) {
            return category;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Layer 4: Standard Keyword Matching
 * Your existing keyword-based classification
 */
function checkKeywords(merchant: string): string | null {
  const lowerMerchant = merchant.toLowerCase();

  for (const [category, rules] of Object.entries(categories)) {
    for (const keyword of rules.keywords) {
      if (lowerMerchant.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Layer 5: Pattern Matching
 * Regex-based pattern matching
 */
function checkPatterns(merchant: string): string | null {
  for (const [category, rules] of Object.entries(categories)) {
    for (const pattern of rules.patterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(merchant)) {
          return category;
        }
      } catch (e) {
        console.warn(`Invalid regex pattern for category ${category}: ${pattern}`);
      }
    }
  }

  return null;
}

/**
 * Layer 6: Heuristic Rules
 * Context-based classification using amount, patterns, etc.
 */
function checkHeuristics(merchant: string, amount?: number): string | null {
  const lowerMerchant = merchant.toLowerCase();

  // Heuristic 1: Small personal transfers
  // Personal names with small amounts (< ₹500) are likely P2P
  if (amount && amount < 500) {
    // Check if it looks like a person's name (all caps, 2-3 words, no common business terms)
    const words = merchant.split(' ');
    const businessTerms = ['pvt', 'ltd', 'limited', 'technologies', 'services', 'corporation', 'company'];
    const hasBusinessTerm = businessTerms.some(term => lowerMerchant.includes(term));

    if (!hasBusinessTerm && words.length >= 2 && words.length <= 3 && merchant === merchant.toUpperCase()) {
      return 'Transfers & Payments';
    }
  }

  // Heuristic 2: Detect company suffixes for uncategorized merchants
  const companySuffixes = ['PRIVATE LIMITED', 'PVT LTD', 'LIMITED', 'LTD', 'TECHNOLOGIES', 'CORPORATION', 'CORP'];
  const hasCompanySuffix = companySuffixes.some(suffix => merchant.toUpperCase().includes(suffix));

  if (hasCompanySuffix) {
    // If it has a company suffix but hasn't matched anything, categorize as Miscellaneous
    return 'Services & Miscellaneous';
  }

  return null;
}

/**
 * Main Multi-Layer Classification Function
 * Applies rules in priority order
 */
export function classifyTransactionMultiLayer(
  merchant: string,
  amount?: number
): ClassificationResult {
  // Layer 1: Check exclusions first
  if (checkExclusions(merchant)) {
    return {
      category: 'Transfers & Payments',
      confidence: 1.0,
      matchedRule: {
        type: 'exclusion',
        priority: 1,
        matcher: 'exclusion_rules'
      },
      isExcluded: true
    };
  }

  // Layer 2: Exact matches (Priority 2)
  const exactMatch = checkExactMatches(merchant);
  if (exactMatch) {
    return {
      category: exactMatch,
      confidence: 1.0,
      matchedRule: {
        type: 'exact',
        priority: 2,
        matcher: merchant
      }
    };
  }

  // Layer 3: Fuzzy keyword matching (Priority 3)
  const fuzzyMatch = checkFuzzyKeywords(merchant);
  if (fuzzyMatch) {
    return {
      category: fuzzyMatch,
      confidence: 0.95,
      matchedRule: {
        type: 'fuzzy',
        priority: 3,
        matcher: 'fuzzy_keyword'
      }
    };
  }

  // Layer 4: Standard keyword matching (Priority 4)
  const keywordMatch = checkKeywords(merchant);
  if (keywordMatch) {
    return {
      category: keywordMatch,
      confidence: 0.9,
      matchedRule: {
        type: 'keyword',
        priority: 4,
        matcher: 'keyword'
      }
    };
  }

  // Layer 5: Pattern matching (Priority 5)
  const patternMatch = checkPatterns(merchant);
  if (patternMatch) {
    return {
      category: patternMatch,
      confidence: 0.85,
      matchedRule: {
        type: 'pattern',
        priority: 5,
        matcher: 'pattern'
      }
    };
  }

  // Layer 6: Heuristic rules (Priority 6)
  const heuristicMatch = checkHeuristics(merchant, amount);
  if (heuristicMatch) {
    return {
      category: heuristicMatch,
      confidence: 0.7,
      matchedRule: {
        type: 'heuristic',
        priority: 6,
        matcher: 'heuristic'
      }
    };
  }

  // No match found
  return {
    category: 'Uncategorized',
    confidence: 0,
    matchedRule: {
      type: 'heuristic',
      priority: 10,
      matcher: 'none'
    }
  };
}

/**
 * Backward-compatible simple classifier (for existing code)
 */
export function classifyTransaction(merchant: string, amount?: number): string {
  const result = classifyTransactionMultiLayer(merchant, amount);
  return result.category;
}

/**
 * Parse HTML activity file and classify transactions
 */
export interface Transaction {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  rawDate: string;
  confidence?: number;
}

export const parseActivityHTML = (htmlContent: string): Transaction[] => {
  const transactions: Transaction[] = [];

  const paidToPattern = /Paid ₹([\d,.]+) to ([^<]+)/gi;
  const sentToPattern = /Sent ₹([\d,.]+) to ([^<]+)/gi;

  const extractTransactions = (pattern: RegExp, type: 'Paid' | 'Sent') => {
    let match;
    while ((match = pattern.exec(htmlContent)) !== null) {
      const amountStr = match[1].replace(/,/g, '');
      let merchant = match[2].trim();

      if (merchant.includes(' using ')) {
        merchant = merchant.split(' using ')[0];
      }

      const datePattern = /(\d{1,2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2}:\d{2} GMT\+\d{2}:\d{2})/g;
      datePattern.lastIndex = match.index;
      const dateMatch = datePattern.exec(htmlContent);

      let date = '';
      let rawDate = '';
      if (dateMatch) {
        rawDate = dateMatch[1];
        date = rawDate;
      }

      const amount = parseFloat(amountStr);
      const result = classifyTransactionMultiLayer(merchant, amount);

      transactions.push({
        merchant,
        amount,
        date,
        rawDate,
        category: result.category,
        confidence: result.confidence
      });
    }
  };

  extractTransactions(paidToPattern, 'Paid');
  extractTransactions(sentToPattern, 'Sent');

  return transactions;
};
