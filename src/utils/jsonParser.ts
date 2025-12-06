import { GroupExpense, Voucher } from '../types/data.types';
import { parseCurrency } from './currencyUtils';

export interface JSONParseResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}

/**
 * Remove anti-XSSI prefix ")]}'" from JSON string
 * Google uses this prefix to prevent JSON hijacking
 */
function removeAntiXSSIPrefix(jsonString: string): string {
  if (jsonString.startsWith(")]}'\n")) {
    return jsonString.slice(5);
  }
  if (jsonString.startsWith(")]}' ")) {
    return jsonString.slice(5);
  }
  return jsonString;
}

/**
 * Parse group expenses JSON
 */
export function parseGroupExpensesJSON(jsonString: string): JSONParseResult<GroupExpense> {
  try {
    if (!jsonString || jsonString.trim().length === 0) {
      console.warn('Empty group expenses JSON');
      return { success: true, data: [] };
    }

    console.log('Group expenses JSON preview (first 200 chars):', jsonString.substring(0, 200));

    const cleaned = removeAntiXSSIPrefix(jsonString);
    console.log('After removing XSSI prefix (first 200 chars):', cleaned.substring(0, 200));

    const parsed = JSON.parse(cleaned);
    console.log('Parsed group expenses JSON structure:', {
      isArray: Array.isArray(parsed),
      keys: typeof parsed === 'object' ? Object.keys(parsed) : 'not an object',
      firstItem: Array.isArray(parsed) ? parsed[0] : null,
    });

    // Handle different JSON structures - support both camelCase and snake_case
    let expenses = Array.isArray(parsed)
      ? parsed
      : (parsed.Group_expenses || parsed.groupExpenses || []);
    console.log(`Found ${expenses.length} group expenses in JSON`);

    const transformedExpenses = expenses
      .map((expense: any, index: number) => {
        try {
          // Support both snake_case and camelCase field names
          const creationTime = expense.creation_time || expense.creationTime;
          const groupName = expense.group_name || expense.groupName;
          const totalAmount = expense.total_amount || expense.totalAmount;

          if (!creationTime) {
            if (index < 3) console.warn(`Skipping group expense ${index} - no creation_time:`, expense);
            return null;
          }

          return {
            creationTime: new Date(creationTime),
            creator: expense.creator || '',
            groupName: groupName || '',
            totalAmount: parseCurrency(totalAmount || ''),
            state: expense.state || 'ONGOING',
            title: expense.title || '',
            items: (expense.items || []).map((item: any) => ({
              amount: parseCurrency(item.amount || ''),
              state: item.state || 'UNPAID',
              payer: item.payer || '',
            })),
          } as GroupExpense;
        } catch (error) {
          console.error(`Error transforming group expense ${index}:`, error, expense);
          return null;
        }
      })
      .filter((item): item is GroupExpense => item !== null);

    console.log(`Transformed ${expenses.length} expenses to ${transformedExpenses.length} valid items`);
    return { success: true, data: transformedExpenses };
  } catch (error) {
    console.error('Group expenses JSON parse error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown JSON parsing error',
    };
  }
}

/**
 * Parse voucher rewards JSON
 */
export function parseVoucherRewardsJSON(jsonString: string): JSONParseResult<Voucher> {
  try {
    if (!jsonString || jsonString.trim().length === 0) {
      console.warn('Empty voucher rewards JSON');
      return { success: true, data: [] };
    }

    console.log('Voucher rewards JSON preview (first 200 chars):', jsonString.substring(0, 200));

    const cleaned = removeAntiXSSIPrefix(jsonString);
    console.log('After removing XSSI prefix (first 200 chars):', cleaned.substring(0, 200));

    const parsed = JSON.parse(cleaned);
    console.log('Parsed voucher JSON structure:', {
      isArray: Array.isArray(parsed),
      keys: typeof parsed === 'object' ? Object.keys(parsed) : 'not an object',
      firstItem: Array.isArray(parsed) ? parsed[0] : null,
    });

    // Handle different JSON structures - support multiple field names
    let vouchers = Array.isArray(parsed)
      ? parsed
      : (parsed.couponRewardExportRecord || parsed.vouchers || []);
    console.log(`Found ${vouchers.length} vouchers in JSON`);

    const transformedVouchers = vouchers
      .map((voucher: any, index: number) => {
        try {
          if (!voucher.code) {
            if (index < 3) console.warn(`Skipping voucher ${index} - no code:`, voucher);
            return null;
          }

          // Support both expiryDate and expiry_date field names
          const expiryDate = voucher.expiryDate || voucher.expiry_date || voucher.expiration_date;

          return {
            code: voucher.code,
            details: voucher.details || '',
            summary: voucher.summary || '',
            expiryDate: expiryDate ? new Date(expiryDate) : new Date(),
          } as Voucher;
        } catch (error) {
          console.error(`Error transforming voucher ${index}:`, error, voucher);
          return null;
        }
      })
      .filter((item): item is Voucher => item !== null);

    console.log(`Transformed ${vouchers.length} vouchers to ${transformedVouchers.length} valid items`);
    return { success: true, data: transformedVouchers };
  } catch (error) {
    console.error('Voucher JSON parse error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown JSON parsing error',
    };
  }
}

/**
 * Generic JSON parser with optional transformation
 */
export function parseJSON<T>(
  jsonString: string,
  transform?: (data: any) => T[] | null
): JSONParseResult<T> {
  try {
    if (!jsonString || jsonString.trim().length === 0) {
      return { success: true, data: [] };
    }

    const cleaned = removeAntiXSSIPrefix(jsonString);
    const parsed = JSON.parse(cleaned);

    if (!transform) {
      const data = Array.isArray(parsed) ? parsed : [parsed];
      return { success: true, data: data as T[] };
    }

    const transformed = transform(parsed);
    if (transformed === null) {
      return { success: false, error: 'Transformation failed' };
    }

    return { success: true, data: transformed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown JSON parsing error',
    };
  }
}
