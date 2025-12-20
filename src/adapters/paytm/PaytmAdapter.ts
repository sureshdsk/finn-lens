// Paytm adapter - handles Paytm XLSX export

import { BaseAppAdapter, DetectionResult, ParseResult } from '../base/AppAdapter';
import { UpiApp, FileFormat } from '../../types/app.types';
import { Transaction, Currency } from '../../types/data.types';
import { TransactionCategory } from '../../utils/categoryUtils';
import { parsePaytmXLSX } from '../../utils/xlsxParser';
import { parseCurrency } from '../../utils/currencyUtils';

/**
 * Paytm adapter - handles Paytm XLSX export
 * Supports: Paytm_UPI_Statement_*.xlsx files
 */
export class PaytmAdapter extends BaseAppAdapter {
  readonly appId = UpiApp.PAYTM;
  readonly supportedFormats = [FileFormat.XLSX];

  /**
   * Detect if file is Paytm XLSX export
   */
  async detect(file: File, _content?: string | ArrayBuffer): Promise<DetectionResult> {
    try {
      // Check filename pattern
      const isPaytmFile =
        file.name.includes('Paytm') &&
        file.name.includes('UPI_Statement') &&
        file.name.endsWith('.xlsx');

      if (isPaytmFile) {
        return { canHandle: true, confidence: 0.95 };
      }

      // Check for .xlsx extension and try to parse
      if (file.name.endsWith('.xlsx')) {
        // If we have the ArrayBuffer content, we could parse and check for "Passbook Payment History" sheet
        // For now, return lower confidence for generic .xlsx files
        return { canHandle: true, confidence: 0.3 };
      }

      return { canHandle: false, confidence: 0 };
    } catch (error) {
      return { canHandle: false, confidence: 0 };
    }
  }

  /**
   * Extract raw data from Paytm XLSX file
   */
  async extract(file: File): Promise<Record<string, string>> {
    const arrayBuffer = await this.readFileAsArrayBuffer(file);

    // Store as base64 string since Record<string, string> is expected
    // We'll convert it back in parse()
    const base64 = this.arrayBufferToBase64(arrayBuffer);

    return { paytmXlsx: base64 };
  }

  /**
   * Parse Paytm XLSX into unified Transaction format
   */
  async parse(rawData: Record<string, string>): Promise<ParseResult> {
    try {
      const base64Data = rawData.paytmXlsx;
      if (!base64Data) {
        return { success: false, error: 'No Paytm XLSX data found' };
      }

      // Convert base64 back to ArrayBuffer
      const arrayBuffer = this.base64ToArrayBuffer(base64Data);

      // Parse using xlsxParser
      const result = parsePaytmXLSX(arrayBuffer, this.appId);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to parse Paytm XLSX',
        };
      }

      // Convert parsed data to unified format
      const transactions: Transaction[] = result.data.map(row => {
        // Parse currency if needed (xlsxParser returns amount as string)
        const amount: Currency =
          typeof row.amount === 'string' ? parseCurrency(row.amount) : row.amount;

        return {
          time: row.time,
          id: row.id,
          description: row.description,
          product: row.product,
          method: row.method,
          status: row.status,
          amount,
          category: row.category as TransactionCategory | undefined,
          sourceApp: this.appId,
        };
      });

      return {
        success: true,
        data: {
          transactions,
          groupExpenses: [],
          cashbackRewards: [],
          voucherRewards: [],
          activities: [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Paytm data',
      };
    }
  }

  /**
   * Helper: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper: Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
