// Domain Collector Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, DomainInsightData } from '../../types/insight.types';

/**
 * Extract domain name from transaction description
 * Examples:
 * - "Domain renewal for example.com"
 * - "Google Domains - mysite.dev"
 */
function extractDomain(description: string): string | null {
  // Common patterns for domain transactions
  const patterns = [
    /(?:domain|renewal|registration).*?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i,
    /([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Check if transaction is domain-related
 */
function isDomainTransaction(description: string, product: string): boolean {
  const domainKeywords = [
    'domain',
    'renewal',
    'registration',
    'google domains',
    '.com',
    '.dev',
    '.io',
    '.org',
    '.net'
  ];

  const text = `${description} ${product}`.toLowerCase();
  return domainKeywords.some(keyword => text.includes(keyword));
}

/**
 * Calculate Domain Collector insight
 */
export function calculateDomainInsight(data: ParsedData): Insight<DomainInsightData> | null {
  const { transactions } = data;

  if (transactions.length === 0) return null;

  // Filter domain-related transactions
  const domainTransactions = transactions.filter(t =>
    isDomainTransaction(t.description, t.product)
  );

  if (domainTransactions.length === 0) return null;

  // Count domains and renewals
  const domainMap = new Map<string, number>();
  let totalSpent = 0;

  domainTransactions.forEach(transaction => {
    const domain = extractDomain(transaction.description);
    if (domain) {
      domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
    }
    // Convert to INR if needed
    const amountInINR = transaction.amount.currency === 'INR'
      ? transaction.amount.value
      : transaction.amount.value * 83; // Approx USD to INR
    totalSpent += amountInINR;
  });

  const totalDomains = domainMap.size;
  const totalRenewals = domainTransactions.length;

  // Find most renewed domain
  let mostRenewed: string | null = null;
  let renewalCount = 0;

  domainMap.forEach((count, domain) => {
    if (count > renewalCount) {
      renewalCount = count;
      mostRenewed = domain;
    }
  });

  // Generate message
  let message = `You've collected ${totalDomains} domain${totalDomains === 1 ? '' : 's'}, `;
  message += `with ${totalRenewals} renewal${totalRenewals === 1 ? '' : 's'}, `;
  message += `spending ₹${totalSpent.toFixed(0)}! `;

  if (mostRenewed && renewalCount > 1) {
    message += `${mostRenewed} is your favorite (${renewalCount}x renewed).`;
  }

  return {
    type: 'domain_collector',
    title: 'Domain Collector',
    tone: 'funny',
    data: {
      totalDomains,
      totalRenewals,
      totalSpent,
      mostRenewed,
      renewalCount
    },
    message
  };
}
