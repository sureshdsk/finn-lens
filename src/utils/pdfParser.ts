/**
 * PDF Parser for PhonePe transaction statements
 * Handles password-protected PDFs and extracts transaction data
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { UpiAppId } from '../types/app.types';
import type { Transaction, Currency } from '../types/data.types';
import type { TransactionCategory } from './categoryUtils';
import { classifyTransaction } from './multi-layer-classifier';

// Configure PDF.js worker
// Use local worker from node_modules for privacy-first approach
if (typeof window !== 'undefined') {
  try {
    // In Vite, we need to use the legacy build path
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).href;
  } catch {
    // Ignore if GlobalWorkerOptions is not available
  }
}

export interface PDFParseResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
  warning?: string;
}

interface TextItem {
  x: number;
  y: number;
  text: string;
}

/**
 * Extract text from password-protected PDF
 * @param pdfBuffer - PDF file as ArrayBuffer
 * @param password - PDF password (optional)
 * @returns Extracted text per page or error
 */
export async function extractPDFText(
  pdfBuffer: ArrayBuffer,
  password?: string
): Promise<{ success: boolean; pages?: string[]; error?: string }> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      password: password,
    });

    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      pages.push(pageText);
    }

    return { success: true, pages };
  } catch (error: any) {
    if (error.name === 'PasswordException') {
      return {
        success: false,
        error: 'Invalid PDF password. Please try again.',
      };
    }
    if (error.name === 'InvalidPDFException') {
      return {
        success: false,
        error: 'Invalid or corrupted PDF file.',
      };
    }
    return {
      success: false,
      error: error.message || 'Failed to extract PDF text.',
    };
  }
}

/**
 * Parse PhonePe transaction PDF
 *
 * PhonePe PDFs have a multi-line structure per transaction:
 * - Row 1: Date | Description | Type | Amount
 * - Row 2: Time
 * - Row 3: Transaction ID
 * - Row 4: UTR Number
 * - Row 5: Account info
 *
 * @param pdfBuffer - PDF file as ArrayBuffer
 * @param password - PDF decryption password
 * @param sourceApp - Source app identifier (default: 'phonepe')
 * @returns Parsed transactions or error
 */
export async function parsePhonePePDF(
  pdfBuffer: ArrayBuffer,
  password: string,
  sourceApp: UpiAppId = 'phonepe'
): Promise<PDFParseResult<Transaction>> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      password: password,
    });

    const pdf = await loadingTask.promise;

    // Parse all pages to capture all transactions
    // Some PDFs may have transactions across multiple pages
    const allTextItems: any[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      allTextItems.push(...textContent.items);
    }

    // Group text items by Y-coordinate (rows)
    const rowMap = new Map<number, TextItem[]>();

    allTextItems.forEach((item: any) => {
      const y = Math.round(item.transform[5]); // Y coordinate
      const x = item.transform[4]; // X coordinate
      const text = item.str;

      if (!rowMap.has(y)) {
        rowMap.set(y, []);
      }
      rowMap.get(y)!.push({ x, y, text });
    });

    // Sort rows by Y (descending, top to bottom)
    const sortedRows = Array.from(rowMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => ({
        y,
        items: items.sort((a, b) => a.x - b.x), // Sort by X within row
        text: items.sort((a, b) => a.x - b.x).map(i => i.text).join(' '),
      }));

    // Find main transaction rows (contain "Credit" or "Debit" and "INR")
    const transactions: Transaction[] = [];
    let skippedRows = 0;
    const debugMode = false; // Set to true for detailed logging

    if (debugMode) {
      console.log('\n=== All Rows in PDF ===');
      sortedRows.forEach((row, idx) => {
        console.log(`Row ${idx}: ${row.text}`);
      });
      console.log('=== End of Rows ===\n');
    }

    for (let i = 0; i < sortedRows.length; i++) {
      const row = sortedRows[i];

      // Check if this is a main transaction row
      const hasType = /\b(Credit|Debit)\b/.test(row.text);
      const hasAmount = /INR\s+[\d,]+\.\d{2}/.test(row.text);

      if (hasType && hasAmount) {
        try {
          // Parse main row
          let dateMatch = row.text.match(/([A-Z][a-z]{2}\s+\d{2},\s+\d{4})/);
          const typeMatch = row.text.match(/\b(Credit|Debit)\b/);
          const amountMatch = row.text.match(/INR\s+([\d,]+\.\d{2})/);

          // If date is not on this row, look in previous rows (common in PhonePe PDFs)
          if (!dateMatch) {
            // Check up to 3 previous rows for a date
            for (let j = Math.max(0, i - 3); j < i; j++) {
              const prevRow = sortedRows[j];
              const prevDateMatch = prevRow.text.match(/([A-Z][a-z]{2}\s+\d{2},\s+\d{4})/);
              if (prevDateMatch) {
                dateMatch = prevDateMatch;
                break;
              }
            }
          }

          if (!dateMatch || !typeMatch || !amountMatch) {
            console.warn(`Skipping row ${i} - incomplete data: ${row.text}`);
            console.warn(`  - Has date: ${!!dateMatch}, Has type: ${!!typeMatch}, Has amount: ${!!amountMatch}`);
            skippedRows++;
            continue;
          }

          // Get description (text between date and type, or just before type if date is on different line)
          let description = 'PhonePe Transaction';

          // Try to extract description from the row text
          // Pattern 1: Date on same line - "MMM DD, YYYY Description Credit/Debit"
          let descriptionMatch = row.text.match(
            /[A-Z][a-z]{2}\s+\d{2},\s+\d{4}\s+(.+?)\s+(Credit|Debit)/
          );

          if (descriptionMatch) {
            description = descriptionMatch[1].trim();
          } else {
            // Pattern 2: No date on line - "Description Credit/Debit"
            descriptionMatch = row.text.match(/(.+?)\s+(Credit|Debit)/);
            if (descriptionMatch) {
              description = descriptionMatch[1].trim();
            }
          }

          // Collect details from next 4-5 rows
          let time = '';
          let transactionId = '';
          let utrNo = '';
          let accountInfo = '';

          for (let j = i + 1; j < Math.min(i + 6, sortedRows.length); j++) {
            const detailRow = sortedRows[j];

            // Stop if we hit another transaction
            if (/\b(Credit|Debit)\b/.test(detailRow.text) && /INR\s+[\d,]+\.\d{2}/.test(detailRow.text)) {
              break;
            }

            // Extract time (HH:MM AM/PM pattern)
            if (!time && /\d{2}:\d{2}\s+[AP]M/.test(detailRow.text)) {
              const timeMatch = detailRow.text.match(/(\d{2}:\d{2}\s+[AP]M)/);
              time = timeMatch ? timeMatch[1] : '';
            }

            // Extract transaction ID
            if (!transactionId && /Transaction ID\s*:\s*/.test(detailRow.text)) {
              const txIdMatch = detailRow.text.match(/Transaction ID\s*:\s*(\w+)/);
              transactionId = txIdMatch ? txIdMatch[1] : '';
            }

            // Extract UTR number
            if (!utrNo && /UTR No\s*:\s*/.test(detailRow.text)) {
              const utrMatch = detailRow.text.match(/UTR No\s*:\s*(\w+)/);
              utrNo = utrMatch ? utrMatch[1] : '';
            }

            // Extract account info
            if (!accountInfo && /(Credited to|Debited from)/.test(detailRow.text)) {
              accountInfo = detailRow.text.trim();
            }
          }

          // Parse date + time
          const dateStr = dateMatch[1];
          const dateTimeStr = time ? `${dateStr} ${time}` : dateStr;
          const transactionDate = parsePhonePeDate(dateTimeStr);

          // Parse amount
          const amountValue = parseFloat(amountMatch[1].replace(/,/g, ''));
          const amount: Currency = { value: amountValue, currency: 'INR' };

          // Determine status (PhonePe PDFs typically only show successful transactions)
          const status = 'Success';

          // Classify transaction
          const category = classifyTransaction(description, amountValue);

          // Create transaction object
          const transaction: Transaction = {
            time: transactionDate,
            id: transactionId || utrNo || `PHONEPE-${Date.now()}-${transactions.length}`,
            description: description,
            product: 'PhonePe UPI',
            method: accountInfo || 'PhonePe',
            status: status,
            amount: amount,
            category: category as TransactionCategory | undefined,
            sourceApp: sourceApp,
          };

          transactions.push(transaction);
        } catch (error) {
          console.error(`Error parsing transaction row:`, error);
          skippedRows++;
        }
      }
    }

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => b.time.getTime() - a.time.getTime());

    // Return results
    if (transactions.length === 0) {
      return {
        success: true,
        data: [],
        warning: 'No transactions found in PDF',
      };
    }

    if (skippedRows > 0) {
      console.warn(`Skipped ${skippedRows} rows during parsing`);
    }

    return {
      success: true,
      data: transactions,
    };
  } catch (error: any) {
    if (error.name === 'PasswordException') {
      return {
        success: false,
        error: 'Invalid PDF password. Please try again.',
      };
    }
    if (error.name === 'InvalidPDFException') {
      return {
        success: false,
        error: 'Invalid or corrupted PDF file.',
      };
    }
    return {
      success: false,
      error: error.message || 'Failed to parse PhonePe PDF.',
    };
  }
}

/**
 * Parse PhonePe date format
 * Format: "MMM DD, YYYY HH:MM AM/PM" or "MMM DD, YYYY"
 * Example: "Oct 03, 2025 09:39 PM"
 */
function parsePhonePeDate(dateStr: string): Date {
  // Month name to number mapping
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  // Parse: "Oct 03, 2025 09:39 PM" or "Oct 03, 2025"
  const match = dateStr.match(
    /([A-Z][a-z]{2})\s+(\d{2}),\s+(\d{4})(?:\s+(\d{2}):(\d{2})\s+([AP]M))?/
  );

  if (!match) {
    console.warn(`Failed to parse date: ${dateStr}`);
    return new Date();
  }

  const [, monthStr, day, year, hours, minutes, meridiem] = match;
  const month = months[monthStr];

  if (month === undefined) {
    console.warn(`Unknown month: ${monthStr}`);
    return new Date();
  }

  // If time is provided, parse it
  if (hours && minutes && meridiem) {
    let hour = parseInt(hours);
    if (meridiem === 'PM' && hour !== 12) {
      hour += 12;
    } else if (meridiem === 'AM' && hour === 12) {
      hour = 0;
    }

    return new Date(
      parseInt(year),
      month,
      parseInt(day),
      hour,
      parseInt(minutes)
    );
  }

  // No time provided, use midnight
  return new Date(parseInt(year), month, parseInt(day));
}
