import Papa from 'papaparse';
import { classifyTransaction } from './multi-layer-classifier';

export interface CSVParseResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}

/**
 * Generic CSV parser using PapaParse with TypeScript support
 * @param csvString - Raw CSV string
 * @param transform - Optional transformation function to convert row to desired type
 * @returns Parsed data array or error
 */
export function parseCSV<T>(
  csvString: string,
  transform?: (row: any) => T | null
): CSVParseResult<T> {
  try {
    if (!csvString || csvString.trim().length === 0) {
      console.warn('Empty CSV string provided');
      return { success: true, data: [] };
    }

    console.log('CSV string preview (first 200 chars):', csvString.substring(0, 200));

    const result = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings for custom parsing
    });

    console.log('Papa parse result:', {
      rowCount: result.data.length,
      errors: result.errors,
      meta: result.meta,
      firstRow: result.data[0],
    });

    if (result.errors.length > 0) {
      const errorMessages = result.errors.map(e => e.message).join(', ');
      console.error('CSV parsing errors:', result.errors);
      return { success: false, error: `CSV parsing error: ${errorMessages}` };
    }

    // If no transform function provided, return raw data
    if (!transform) {
      return { success: true, data: result.data as T[] };
    }

    // Apply transformation and filter out null values
    const transformedData = result.data
      .map(transform)
      .filter((item): item is T => item !== null);

    console.log(`Transformed ${result.data.length} rows to ${transformedData.length} items`);

    return { success: true, data: transformedData };
  } catch (error) {
    console.error('CSV parsing exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown CSV parsing error',
    };
  }
}

/**
 * Parse transaction CSV with custom transformation
 */
export function parseTransactionsCSV(csvString: string) {
  let rowsProcessed = 0;
  let rowsSkipped = 0;

  const result = parseCSV(csvString, (row) => {
    rowsProcessed++;
    try {
      // Log first row to see structure
      if (rowsProcessed === 1) {
        console.log('First transaction row keys:', Object.keys(row));
        console.log('First transaction row:', row);
      }

      // Skip invalid rows - use exact column names from CSV
      const transactionId = row['Transaction ID'] || row.ID;
      if (!row.Time || !transactionId) {
        rowsSkipped++;
        if (rowsSkipped <= 3) {
          console.warn(`Skipping row ${rowsProcessed} - missing Time or Transaction ID:`, row);
        }
        return null;
      }

      const description = row.Description || '';
      const amountStr = row.Amount || '0';
      // Extract numeric value for classification (remove currency symbols and commas)
      const amountValue = parseFloat(amountStr.replace(/[₹$,]/g, '')) || 0;

      return {
        time: new Date(row.Time),
        id: transactionId,
        description,
        product: row.Product || '',
        method: row['Payment method'] || row.Method || '',
        status: row.Status || '',
        amount: amountStr, // Will be parsed by currencyUtils
        category: classifyTransaction(description, amountValue),
      };
    } catch (error) {
      console.error(`Error transforming row ${rowsProcessed}:`, error, row);
      return null;
    }
  });

  console.log(`Transaction CSV: processed ${rowsProcessed} rows, skipped ${rowsSkipped}`);
  return result;
}

/**
 * Parse cashback rewards CSV with custom transformation
 */
export function parseCashbackRewardsCSV(csvString: string) {
  return parseCSV(csvString, (row) => {
    try {
      // Skip invalid rows
      if (!row.Date) {
        return null;
      }

      // Column is called "Reward amount" not "Amount"
      const amount = row['Reward amount'] || row.Amount || '0';
      const description = row['Rewards description'] || row.Description || '';

      return {
        date: new Date(row.Date),
        currency: row.Currency || 'INR',
        amount: amount,
        description: description,
      };
    } catch (error) {
      return null;
    }
  });
}
