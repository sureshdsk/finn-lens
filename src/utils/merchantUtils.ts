/**
 * Utility functions for normalizing and grouping merchant names
 */

interface MerchantGroup {
  normalizedName: string;
  displayName: string;
  patterns: RegExp[];
}

/**
 * Predefined merchant groups for common variations
 */
const MERCHANT_GROUPS: MerchantGroup[] = [
  // Banks - group all bank transfers together
  {
    normalizedName: 'BANK_TRANSFER',
    displayName: 'Bank Account Transfers',
    patterns: [
      /bank\s+account/i,
      /^to\s+bank/i,
      /^from\s+bank/i,
      /account\s+transfer/i,
      /^a\/c\s+/i,
      /savings\s+account/i,
      /current\s+account/i,
    ],
  },
  // UPI transfers
  {
    normalizedName: 'UPI_TRANSFER',
    displayName: 'UPI Transfers',
    patterns: [/^upi\s+/i, /upi\s+transaction/i, /via\s+upi/i],
  },
  // Popular merchants with common variations
  {
    normalizedName: 'SWIGGY',
    displayName: 'Swiggy',
    patterns: [/swiggy/i],
  },
  {
    normalizedName: 'ZOMATO',
    displayName: 'Zomato',
    patterns: [/zomato/i],
  },
  {
    normalizedName: 'AMAZON',
    displayName: 'Amazon',
    patterns: [/amazon/i, /amzn/i],
  },
  {
    normalizedName: 'FLIPKART',
    displayName: 'Flipkart',
    patterns: [/flipkart/i],
  },
  {
    normalizedName: 'UBER',
    displayName: 'Uber',
    patterns: [/uber/i],
  },
  {
    normalizedName: 'OLA',
    displayName: 'Ola',
    patterns: [/\bola\b/i, /ola\s+cabs/i],
  },
  {
    normalizedName: 'NETFLIX',
    displayName: 'Netflix',
    patterns: [/netflix/i],
  },
  {
    normalizedName: 'SPOTIFY',
    displayName: 'Spotify',
    patterns: [/spotify/i],
  },
  {
    normalizedName: 'YOUTUBE',
    displayName: 'YouTube',
    patterns: [/youtube/i, /yt\s+premium/i],
  },
  {
    normalizedName: 'GOOGLE',
    displayName: 'Google',
    patterns: [/google/i, /^g\s+pay/i],
  },
  {
    normalizedName: 'PAYTM',
    displayName: 'Paytm',
    patterns: [/paytm/i],
  },
  {
    normalizedName: 'PHONEPE',
    displayName: 'PhonePe',
    patterns: [/phonepe/i, /phone\s+pe/i],
  },
  {
    normalizedName: 'ELECTRICITY_BILL',
    displayName: 'Electricity Bill',
    patterns: [/electricity/i, /electric\s+bill/i, /power\s+bill/i, /bescom/i, /msedcl/i],
  },
  {
    normalizedName: 'MOBILE_RECHARGE',
    displayName: 'Mobile Recharge',
    patterns: [/mobile\s+recharge/i, /prepaid\s+recharge/i, /airtel\s+recharge/i, /jio\s+recharge/i],
  },
  {
    normalizedName: 'DTH_RECHARGE',
    displayName: 'DTH Recharge',
    patterns: [/dth\s+recharge/i, /tata\s+sky/i, /dish\s+tv/i],
  },
  {
    normalizedName: 'ATM_WITHDRAWAL',
    displayName: 'ATM Withdrawals',
    patterns: [/atm\s+withdrawal/i, /cash\s+withdrawal/i],
  },
];

/**
 * Cleans and normalizes a merchant description
 * @param description - Raw transaction description
 * @returns Cleaned merchant name
 */
export function cleanMerchantDescription(description: string): string {
  let merchant = description.trim();

  // Remove common prefixes
  merchant = merchant
    .replace(/^(To|From|Payment to|Paid to|Sent to|Received from|Transfer to|Transfer from)\s+/i, '')
    .replace(/\s+\([^)]+\)$/g, '') // Remove trailing parentheses
    .replace(/\s+-\s+[A-Z0-9]+$/i, '') // Remove trailing transaction IDs
    .replace(/\s+\d{4,}$/, '') // Remove trailing numbers (likely transaction IDs)
    .trim();

  return merchant;
}

/**
 * Normalizes a merchant name by finding matching predefined groups
 * or creating a normalized version of the name
 * @param description - Transaction description
 * @returns Object with normalized key and display name
 */
export function normalizeMerchantName(description: string): {
  key: string;
  displayName: string;
} {
  const cleaned = cleanMerchantDescription(description);

  // Check against predefined merchant groups
  for (const group of MERCHANT_GROUPS) {
    for (const pattern of group.patterns) {
      if (pattern.test(cleaned)) {
        return {
          key: group.normalizedName,
          displayName: group.displayName,
        };
      }
    }
  }

  // If no match found, use cleaned description
  // Normalize case and remove extra whitespace
  const normalized = cleaned
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  // Use the original cleaned version (with proper case) as display name
  return {
    key: normalized,
    displayName: cleaned,
  };
}

/**
 * Groups transactions by normalized merchant name
 * @param transactions - Array of transactions with description and amount
 * @returns Array of merchant data with aggregated amounts and counts
 */
export function groupTransactionsByMerchant<T extends { description: string; amount: { value: number; currency: string } }>(
  transactions: T[],
  convertToINR: (amount: { value: number; currency: string }) => number
): Array<{ name: string; fullName: string; amount: number; count: number }> {
  const merchantMap = new Map<string, { displayName: string; amount: number; count: number }>();

  transactions.forEach((t) => {
    const { key, displayName } = normalizeMerchantName(t.description);

    // Skip if empty or too generic
    if (!key || key.length < 2) return;

    const existing = merchantMap.get(key) || { displayName, amount: 0, count: 0 };
    merchantMap.set(key, {
      displayName: existing.displayName, // Keep the first display name we saw
      amount: existing.amount + convertToINR(t.amount),
      count: existing.count + 1,
    });
  });

  // Convert to array and sort by amount
  const sorted = Array.from(merchantMap.entries())
    .map(([key, data]) => ({
      name: data.displayName.length > 25 ? data.displayName.substring(0, 25) + '...' : data.displayName,
      fullName: data.displayName,
      amount: Math.round(data.amount),
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  return sorted;
}
