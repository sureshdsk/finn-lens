// HTML parser for My Activity data

import { ActivityRecord, Currency } from '../types/data.types';
import { parseCurrency } from './currencyUtils';
import { classifyTransaction } from './multi-layer-classifier';
import type { TransactionCategory } from './categoryUtils';

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
    // Look for "to [Name]" - capture until "using" keyword or end of string
    // This handles full merchant names like "M S ARASU CHICKEN CENTRE", special chars like "M.K.SYED &CO", and numbers like "SAIDAPET 5"
    const toMatch = description.match(/to\s+([A-Z][A-Z0-9\s.&]+?)(?:\s+using|\s*$)/i);
    if (toMatch) result.recipient = toMatch[1].trim();
  }

  if (type === 'received') {
    // Look for "from [Name]" - capture until "using" keyword or end of string
    const fromMatch = description.match(/from\s+([A-Z][A-Z\s]+?)(?:\s+using|\s*$)/i);
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

    // Parse HTML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const activities: ActivityRecord[] = [];

    // Find all outer-cell divs which contain individual activity records
    const outerCells = doc.querySelectorAll('.outer-cell');

    let failedCount = 0;

    outerCells.forEach((cell, index) => {
      try {
        // Get the header (product name, usually "Google Pay")
        const headerCell = cell.querySelector('.header-cell p');
        const product = headerCell?.textContent?.trim() || '';

        // Get the content cell with the activity description and date
        const contentCell = cell.querySelector('.content-cell');
        if (!contentCell) return;

        // Get ALL text content from the entire outer-cell (not just content-cell)
        // The "Failed" status might be in a sibling element
        const fullCellText = cell.textContent?.trim() || '';

        // Convert <br> tags to newlines before extracting text
        // Clone the content cell to avoid modifying the original DOM
        const contentCellClone = contentCell.cloneNode(true) as HTMLElement;
        const brElements = contentCellClone.querySelectorAll('br');
        brElements.forEach(br => {
          br.replaceWith('\n');
        });

        // Get the content with proper line breaks
        const contentText = contentCellClone.textContent?.trim() || '';

        // Check if this activity is marked as Failed
        // Failed transactions contain the word "Failed" somewhere in the FULL cell content
        const failureKeywords = ['failed', 'declined', 'cancelled', 'canceled', 'rejected', 'unsuccessful'];

        // Create a regex pattern to match failure keywords
        // Note: Don't use \b word boundaries because HTML entities like &emsp; create Unicode spaces
        // that may not be recognized as word boundaries
        const failurePattern = new RegExp(`(${failureKeywords.join('|')})`, 'i');

        // Check the full cell text (not just content-cell) for failure status
        const isFailed = failurePattern.test(fullCellText);

        if (isFailed) {
          failedCount++;
          // Skip failed transactions - don't add them to activities
          return;
        }

        // Extract transaction ID and status from Details section early
        // Pattern: Details:<br>&emsp;TRANSACTION_ID<br>&emsp;Status
        // Look for the Details section - it should have transaction ID followed by status
        const hasDetailsSection = /Details:/i.test(fullCellText);

        if (hasDetailsSection) {
          // If Details section exists, check for valid status (Completed, Failed, or Pending)
          const detailsMatchEarly = fullCellText.match(/Details:.*?([A-Za-z0-9\-@\/+]+)\s+(Completed|Failed|Pending)/s);

          // Skip transactions with Details section but no valid status (empty or missing status)
          // Google Pay app also filters these out
          if (!detailsMatchEarly) {
            failedCount++;
            // Skip transactions without valid status
            return;
          }
        }

        // Split content by newlines, line breaks, or use child elements
        let parts: string[] = [];

        // Try splitting by newlines first
        const textParts = contentText.split(/[\n\r]+/).map(p => p.trim()).filter(Boolean);

        // If we only got 1 part, the HTML might be using elements instead of newlines
        // Try to extract from child elements
        if (textParts.length <= 2) {
          const allElements = contentCell.querySelectorAll('*');
          parts = Array.from(allElements)
            .map(el => el.textContent?.trim() || '')
            .filter(Boolean);

          // If still no good parts, fall back to text split
          if (parts.length === 0) {
            parts = textParts;
          }
        } else {
          parts = textParts;
        }

        if (parts.length === 0) return;

        // Extract date from the content text using regex
        // Google Pay has used two different date formats over time:
        // Format 1 (newer): "8 Dec 2025, 20:11:19 GMT+05:30" (DD Mon YYYY, 24-hour, no AM/PM)
        // Format 2 (older): "Dec 6, 2025, 12:12:14 PM GMT+05:30" (Mon DD, YYYY, 12-hour with AM/PM)
        // We need to support both formats

        // Try Format 1 first (DD Mon YYYY, 24-hour)
        const dateRegex1 = /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+(?:GMT[+-]\d{2}:\d{2}|IST))/;
        // Try Format 2 (Mon DD, YYYY, 12-hour with AM/PM)
        const dateRegex2 = /([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+(?:GMT[+-]\d{2}:\d{2}|IST))/;

        const dateMatch1 = contentText.match(dateRegex1);
        const dateMatch2 = contentText.match(dateRegex2);
        const dateMatch = dateMatch1 || dateMatch2;

        let activityDate = new Date();
        let dateStr: string | undefined;

        if (dateMatch) {
          dateStr = dateMatch[1];
          // Parse the full date string including timezone
          // JavaScript Date constructor can handle both formats
          activityDate = new Date(dateStr);

          // Fallback: if parsing fails, try without timezone
          if (isNaN(activityDate.getTime())) {
            const cleanDateStr = dateStr.replace(/,?\s*(IST|GMT[+-]\d{2}:\d{2})$/, '').trim();
            activityDate = new Date(cleanDateStr);
          }
        }

        // Extract title (text before the date)
        let title = parts[0];
        if (dateMatch) {
          // Remove the date from the title if it's concatenated
          title = contentText.substring(0, contentText.indexOf(dateMatch[0])).trim();
        }

        // Extract transaction ID from Details section
        // Pattern: Details:<br>&emsp;TRANSACTION_ID<br>&emsp;Status
        const detailsMatch = fullCellText.match(/Details:.*?([A-Za-z0-9\-@\/+]+)\s+(Completed|Failed|Pending)/s);
        const transactionId = detailsMatch ? detailsMatch[1].trim() : '';

        // NEW: Parse transaction data
        let { type: transactionType, amount } = parseTransactionFromTitle(title);
        const { recipient, sender } = extractPersonFromDescription(contentText, transactionType);

        // FIX: P2P UPI collect/request transactions
        // Google labels received money as "Paid ₹X using Bank Account" (without recipient)
        // We use transaction ID pattern to distinguish received vs sent:
        // - 35-char alphanumeric IDs (no dashes) = RECEIVED via P2P UPI collect
        // - Examples: YBN..., KOT..., AXL..., UPI..., PTM..., YESB..., INB...
        if (transactionType === 'paid' && !recipient && /^[A-Za-z0-9]{35}$/.test(transactionId)) {
          transactionType = 'received';
        }

        // Only add if we have a valid title
        if (title) {
          // Extract amount value for classification
          const amountValue = amount?.value || 0;

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
            category: classifyTransaction(title + ' ' + contentText, amountValue) as TransactionCategory,
            sourceApp: 'googlepay' as const, // HTML parser is currently only for Google Pay
          });
        }
      } catch (error) {
        console.error(`Error parsing activity ${index}:`, error);
      }
    });

    // Get year breakdown BEFORE filtering
    const yearBreakdown = new Map<number, { total: number; failed: number; successful: number }>();

    outerCells.forEach((cell) => {
      try {
        const contentCell = cell.querySelector('.content-cell');
        if (!contentCell) return;

        // Convert <br> tags to newlines for proper parsing
        const contentCellClone = contentCell.cloneNode(true) as HTMLElement;
        const brElements = contentCellClone.querySelectorAll('br');
        brElements.forEach(br => {
          br.replaceWith('\n');
        });

        const contentText = contentCellClone.textContent?.trim() || '';
        const parts = contentText.split('\n').map(p => p.trim()).filter(Boolean);
        if (parts.length === 0) return;

        // Extract date using the same regex as above (support both formats)
        const dateRegex1 = /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+(?:GMT[+-]\d{2}:\d{2}|IST))/;
        const dateRegex2 = /([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+(?:GMT[+-]\d{2}:\d{2}|IST))/;

        const dateMatch1 = contentText.match(dateRegex1);
        const dateMatch2 = contentText.match(dateRegex2);
        const dateMatch = dateMatch1 || dateMatch2;

        let activityDate = new Date();
        if (dateMatch) {
          const dateStr = dateMatch[1];
          activityDate = new Date(dateStr);

          // Fallback: if parsing fails, try without timezone
          if (isNaN(activityDate.getTime())) {
            const cleanDateStr = dateStr.replace(/,?\s*(IST|GMT[+-]\d{2}:\d{2})$/, '').trim();
            activityDate = new Date(cleanDateStr);
          }
        }

        const year = activityDate.getFullYear();
        if (!yearBreakdown.has(year)) {
          yearBreakdown.set(year, { total: 0, failed: 0, successful: 0 });
        }

        const fullCellText = cell.textContent?.trim() || '';
        const failureKeywords = ['failed', 'declined', 'cancelled', 'canceled', 'rejected', 'unsuccessful'];
        const failurePattern = new RegExp(`\\b(${failureKeywords.join('|')})\\b`, 'i');
        const isFailed = failurePattern.test(fullCellText);

        const stats = yearBreakdown.get(year)!;
        stats.total++;
        if (isFailed) {
          stats.failed++;
        } else {
          stats.successful++;
        }
      } catch (error) {
        // Ignore errors in year counting
      }
    });

    // Verify if expected matches actual
    if (activities.length !== outerCells.length - failedCount) {
      console.warn(`⚠️ MISMATCH: Expected ${outerCells.length - failedCount} but got ${activities.length}. Some activities may have been skipped due to missing data.`);
    }

    return { success: true, data: activities };
  } catch (error) {
    console.error('My Activity HTML parse error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown HTML parsing error',
    };
  }
}
