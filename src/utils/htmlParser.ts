// HTML parser for My Activity data

import { ActivityRecord, Currency } from '../types/data.types';
import { parseCurrency } from './currencyUtils';
import { categorizeTransaction } from './categoryUtils';

export interface HTMLParseResult {
  success: boolean;
  data?: ActivityRecord[];
  error?: string;
}

/**
 * Parse transaction type and amount from activity title
 * Examples:
 * - "Received ₹60.00" -> { type: 'received', amount: { value: 60, currency: 'INR' } }
 * - "Sent ₹1,500.00" -> { type: 'sent', amount: { value: 1500, currency: 'INR' } }
 * - "Paid ₹2,000.00" -> { type: 'paid', amount: { value: 2000, currency: 'INR' } }
 */
function parseTransactionFromTitle(title: string): {
  type: 'sent' | 'received' | 'paid' | 'request' | 'other';
  amount?: Currency;
} {
  const lowerTitle = title.toLowerCase();

  // Detect transaction type
  let type: 'sent' | 'received' | 'paid' | 'request' | 'other' = 'other';
  if (lowerTitle.includes('received')) type = 'received';
  else if (lowerTitle.includes('sent')) type = 'sent';
  else if (lowerTitle.includes('paid')) type = 'paid';
  else if (lowerTitle.includes('request')) type = 'request';

  // Extract amount using regex
  // Match patterns: ₹1,234.56 or $123.45 or INR 1234.56
  const amountMatch = title.match(/[₹$][\d,]+\.?\d*|(?:INR|USD)\s*[\d,]+\.?\d*/);

  let amount: Currency | undefined;
  if (amountMatch) {
    const amountStr = amountMatch[0];
    amount = parseCurrency(amountStr);
  }

  return { type, amount };
}

/**
 * Extract recipient/sender from activity description
 * Look for patterns like:
 * - "to [Name]"
 * - "from [Name]"
 * - Contact names in description
 */
function extractPersonFromDescription(description: string, type: string): {
  recipient?: string;
  sender?: string;
} {
  const result: { recipient?: string; sender?: string } = {};

  if (type === 'sent' || type === 'paid') {
    // Look for "to [Name]"
    const toMatch = description.match(/to\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/);
    if (toMatch) result.recipient = toMatch[1].trim();
  }

  if (type === 'received') {
    // Look for "from [Name]"
    const fromMatch = description.match(/from\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/);
    if (fromMatch) result.sender = fromMatch[1].trim();
  }

  return result;
}

/**
 * Parse Google Pay My Activity HTML file
 */
export function parseMyActivityHTML(htmlString: string): HTMLParseResult {
  try {
    if (!htmlString || htmlString.trim().length === 0) {
      console.warn('Empty My Activity HTML');
      return { success: true, data: [] };
    }

    console.log('My Activity HTML length:', htmlString.length);
    console.log('My Activity preview (first 500 chars):', htmlString.substring(0, 500));

    // Parse HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    console.log('HTML parsed, document title:', doc.title);

    const activities: ActivityRecord[] = [];

    // Find all outer-cell divs which contain individual activity records
    const outerCells = doc.querySelectorAll('.outer-cell');
    console.log(`Found ${outerCells.length} activity records`);

    let failedCount = 0;

    outerCells.forEach((cell, index) => {
      try {
        // Get the header (product name, usually "Google Pay")
        const headerCell = cell.querySelector('.header-cell p');
        const product = headerCell?.textContent?.trim() || '';

        // Get the content cell with the activity description and date
        const contentCell = cell.querySelector('.content-cell');
        if (!contentCell) return;

        // Get the full HTML content to check for "Failed" badge
        const contentHTML = contentCell.innerHTML || '';
        const contentText = contentCell.textContent?.trim() || '';

        // Check if this activity is marked as Failed
        // Failed transactions have "Failed" text in the content
        // Also check for other failure indicators
        const lowerContent = contentText.toLowerCase();
        const failureKeywords = [
          'failed',
          'declined',
          'cancelled',
          'canceled',
          'rejected',
          'unsuccessful',
        ];

        const isFailed = failureKeywords.some(keyword => lowerContent.includes(keyword));

        if (isFailed) {
          failedCount++;
          // Skip failed transactions - don't add them to activities
          if (index < 10 || failedCount <= 5) {
            console.log(`Skipping failed activity ${index}:`, contentText.substring(0, 150));
          }
          return;
        }

        // Split by newlines to get description and date
        const parts = contentText.split('\n').map(p => p.trim()).filter(Boolean);

        if (parts.length === 0) return;

        const title = parts[0]; // e.g., "Received ₹60.00"
        const dateStr = parts[1]; // e.g., "4 Dec 2025, 10:30:00 IST"

        // Parse the date
        let activityDate = new Date();
        if (dateStr) {
          // Google uses format like "4 Dec 2025, 10:30:00 IST"
          // Remove timezone and parse
          const cleanDateStr = dateStr.replace(/,?\s*(IST|GMT[+-]\d{2}:\d{2})$/, '').trim();
          activityDate = new Date(cleanDateStr);
        }

        // NEW: Parse transaction data
        const { type: transactionType, amount } = parseTransactionFromTitle(title);
        const { recipient, sender } = extractPersonFromDescription(contentText, transactionType);

        // Only add if we have a valid title
        if (title) {
          activities.push({
            title,
            time: activityDate,
            description: contentText,
            products: product ? [product] : [],
            // NEW FIELDS
            transactionType,
            amount,
            recipient,
            sender,
            category: categorizeTransaction(title + ' ' + contentText),
          });
        }

        // Log first few for debugging
        if (index < 3) {
          console.log(`Activity ${index}:`, {
            title,
            dateStr,
            product,
            transactionType,
            amount,
            recipient,
            sender,
          });
        }
      } catch (error) {
        console.error(`Error parsing activity ${index}:`, error);
      }
    });

    console.log(`Successfully parsed ${activities.length} activities from ${outerCells.length} cells (${failedCount} failed transactions skipped)`);

    return { success: true, data: activities };
  } catch (error) {
    console.error('My Activity HTML parse error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown HTML parsing error',
    };
  }
}
