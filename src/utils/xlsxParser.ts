import * as XLSX from 'xlsx';
import { classifyTransaction } from './multi-layer-classifier';
import type { UpiAppId } from '../types/app.types';

export interface XLSXParseResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}

/**
 * Generic XLSX parser using SheetJS
 * @param xlsxBuffer - Raw XLSX file buffer
 * @param sheetName - Name of the sheet to parse
 * @param transform - Optional transformation function to convert row to desired type
 * @returns Parsed data array or error
 */
export function parseXLSX<T>(
  xlsxBuffer: ArrayBuffer,
  sheetName: string,
  transform?: (row: any) => T | null
): XLSXParseResult<T> {
  try {
    // Parse the workbook
    const workbook = XLSX.read(xlsxBuffer, { type: 'array' });

    // Check if the sheet exists
    if (!workbook.SheetNames.includes(sheetName)) {
      console.error(`Sheet "${sheetName}" not found. Available sheets:`, workbook.SheetNames);
      return {
        success: false,
        error: `Sheet "${sheetName}" not found in workbook`,
      };
    }

    // Get the worksheet
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false, // Keep as strings for custom parsing
    });

    if (jsonData.length === 0) {
      console.warn(`Sheet "${sheetName}" is empty`);
      return { success: true, data: [] };
    }

    // If no transform function provided, return raw data
    if (!transform) {
      return { success: true, data: jsonData as T[] };
    }

    // Apply transformation and filter out null values
    const transformedData = jsonData
      .map(transform)
      .filter((item): item is T => item !== null);

    return { success: true, data: transformedData };
  } catch (error) {
    console.error('XLSX parsing exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown XLSX parsing error',
    };
  }
}

/**
 * Parse Paytm UPI Statement XLSX
 * Sheet: "Passbook Payment History"
 * Columns: Date, Time, Transaction Details, Other Transaction Details, Your Account, Amount, UPI Ref No., Order ID, Remarks, Tags, Comment
 */
export function parsePaytmXLSX(xlsxBuffer: ArrayBuffer, sourceApp: UpiAppId = 'paytm') {
  let rowsProcessed = 0;
  let rowsSkipped = 0;

  const result = parseXLSX(xlsxBuffer, 'Passbook Payment History', (row) => {
    rowsProcessed++;
    try {
      // Skip invalid rows
      if (!row.Date || !row['UPI Ref No.']) {
        rowsSkipped++;
        if (rowsSkipped <= 3) {
          console.warn(`Skipping row ${rowsProcessed} - missing Date or UPI Ref No.:`, row);
        }
        return null;
      }

      // Parse date and time (format: DD/MM/YYYY and HH:MM:SS)
      const dateParts = row.Date.split('/');
      const timeParts = row.Time?.split(':') || ['00', '00', '00'];

      if (dateParts.length !== 3) {
        console.warn(`Invalid date format in row ${rowsProcessed}:`, row.Date);
        return null;
      }

      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(dateParts[2], 10);
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);
      const second = parseInt(timeParts[2], 10);

      const transactionTime = new Date(year, month, day, hour, minute, second);

      // Parse amount (format: "+123.00" or "-123.00")
      const amountStr = (row.Amount || '0').toString().trim();
      const amountValue = parseFloat(amountStr.replace(/[+,]/g, '')) || 0;

      // Determine transaction type from amount sign
      const isCredit = amountStr.startsWith('+');
      const transactionType = isCredit ? 'received' : 'paid';

      // Build description from Transaction Details
      const description = row['Transaction Details'] || '';
      const otherDetails = row['Other Transaction Details (UPI ID or A/c No)'] || '';

      return {
        time: transactionTime,
        id: row['UPI Ref No.'],
        description: description,
        product: 'UPI', // Paytm UPI transactions
        method: `Paytm UPI${row['Your Account'] ? ` - ${row['Your Account']}` : ''}`,
        status: row.Remarks || 'Transaction success',
        amount: `₹${Math.abs(amountValue).toFixed(2)}`, // Will be parsed by currencyUtils
        category: classifyTransaction(description, Math.abs(amountValue)),
        sourceApp,
        // Additional Paytm-specific fields (can be used for enhanced insights)
        _paytmData: {
          transactionType,
          upiId: otherDetails,
          tags: row.Tags || '',
          comment: row.Comment || '',
          orderId: row['Order ID'] || '',
        },
      };
    } catch (error) {
      console.error(`Error transforming row ${rowsProcessed}:`, error, row);
      return null;
    }
  });

  if (result.success && result.data) {
    console.log(`Paytm XLSX parsing complete: ${result.data.length} transactions (${rowsSkipped} rows skipped)`);
  }

  return result;
}
