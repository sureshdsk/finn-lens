// Google Pay adapter - handles Google Takeout ZIP files

import JSZip from 'jszip';
import { BaseAppAdapter, DetectionResult, ParseResult } from '../base/AppAdapter';
import { UpiApp, FileFormat } from '../../types/app.types';
import { ParsedData, Transaction, GroupExpense, CashbackReward, Voucher, ActivityRecord } from '../../types/data.types';
import { parseTransactionsCSV, parseCashbackRewardsCSV } from '../../utils/csvParser';
import { parseGroupExpensesJSON, parseVoucherRewardsJSON } from '../../utils/jsonParser';
import { parseMyActivityHTML } from '../../utils/htmlParser';
import { parseCurrency } from '../../utils/currencyUtils';

/**
 * Google Pay adapter - handles Google Takeout ZIP files
 */
export class GooglePayAdapter extends BaseAppAdapter {
  readonly appId = UpiApp.GOOGLE_PAY;
  readonly supportedFormats = [FileFormat.ZIP];

  /**
   * Detect if file is Google Pay Takeout ZIP
   */
  async detect(file: File): Promise<DetectionResult> {
    // Check file extension
    if (!file.name.endsWith('.zip')) {
      return { canHandle: false, confidence: 0 };
    }

    try {
      const zip = await JSZip.loadAsync(file);

      // Look for Google Pay signature files
      const hasGoogleTransactions = Object.keys(zip.files).some(name =>
        name.includes('Google transactions/transactions_')
      );

      const hasGooglePayFolder = Object.keys(zip.files).some(name =>
        name.includes('Google Pay/')
      );

      if (hasGoogleTransactions || hasGooglePayFolder) {
        return { canHandle: true, confidence: 0.95 };
      }

      return { canHandle: false, confidence: 0 };
    } catch (error) {
      return { canHandle: false, confidence: 0 };
    }
  }

  /**
   * Extract raw data from Google Takeout ZIP
   * This is the existing zipParser.ts logic
   */
  async extract(file: File): Promise<Record<string, string>> {
    const zip = await JSZip.loadAsync(file);
    const extractedData: Record<string, string> = {};

    // Find and read Google transactions CSV
    const transactionFile = Object.keys(zip.files).find(name =>
      name.includes('Google transactions/transactions_') && name.endsWith('.csv')
    );

    if (transactionFile) {
      extractedData.transactions = await zip.files[transactionFile].async('text');
    }

    // Helper function to find file with flexible path matching
    const findFile = (relativePath: string): string | undefined => {
      return Object.keys(zip.files).find(name =>
        name.endsWith(relativePath) || name === relativePath
      );
    };

    // Read group expenses JSON
    const groupExpensesFile = findFile('Google Pay/Group expenses/Group expenses.json');
    if (groupExpensesFile) {
      extractedData.groupExpenses = await zip.files[groupExpensesFile].async('text');
    }

    // Read cashback rewards CSV
    const cashbackFile = findFile('Google Pay/Rewards earned/Cashback rewards.csv');
    if (cashbackFile) {
      extractedData.cashbackRewards = await zip.files[cashbackFile].async('text');
    }

    // Read voucher rewards JSON (remove )]}' prefix if present)
    const voucherFile = findFile('Google Pay/Rewards earned/Voucher rewards.json');
    if (voucherFile) {
      const raw = await zip.files[voucherFile].async('text');
      // Remove the anti-XSSI prefix )]}' if present
      extractedData.voucherRewards = raw.replace(/^\)\]\}'[\n\r]*/, '');
    }

    // Read My Activity HTML
    const myActivityFile = findFile('Google Pay/My Activity/My Activity.html');
    if (myActivityFile) {
      extractedData.myActivity = await zip.files[myActivityFile].async('text');
    }

    return extractedData;
  }

  /**
   * Parse extracted raw data into unified format
   * This is the existing dataStore.parseRawData() logic
   */
  async parse(rawData: Record<string, string>): Promise<ParseResult> {
    try {
      const parsedData: Partial<ParsedData> = {
        transactions: [],
        groupExpenses: [],
        cashbackRewards: [],
        voucherRewards: [],
        activities: [],
      };

      // Parse transactions CSV
      if (rawData.transactions) {
        const result = parseTransactionsCSV(rawData.transactions);
        if (result.success && result.data) {
          parsedData.transactions = result.data.map(t => ({
            ...t,
            amount: typeof t.amount === 'string' ? parseCurrency(t.amount) : t.amount,
            sourceApp: this.appId, // Tag with source app
          })) as Transaction[];
        }
      }

      // Parse group expenses JSON
      if (rawData.groupExpenses) {
        const result = parseGroupExpensesJSON(rawData.groupExpenses);
        if (result.success && result.data) {
          parsedData.groupExpenses = result.data.map(g => ({
            ...g,
            sourceApp: this.appId,
          })) as GroupExpense[];
        }
      }

      // Parse cashback rewards CSV
      if (rawData.cashbackRewards) {
        const result = parseCashbackRewardsCSV(rawData.cashbackRewards);
        if (result.success && result.data) {
          parsedData.cashbackRewards = result.data.map(r => ({
            ...r,
            amount: typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
            sourceApp: this.appId,
          })) as CashbackReward[];
        }
      }

      // Parse voucher rewards JSON
      if (rawData.voucherRewards) {
        const result = parseVoucherRewardsJSON(rawData.voucherRewards);
        if (result.success && result.data) {
          parsedData.voucherRewards = result.data.map(v => ({
            ...v,
            sourceApp: this.appId,
          })) as Voucher[];
        }
      }

      // Parse My Activity HTML
      if (rawData.myActivity) {
        const result = parseMyActivityHTML(rawData.myActivity);
        if (result.success && result.data) {
          parsedData.activities = result.data.map(a => ({
            ...a,
            sourceApp: this.appId,
          })) as ActivityRecord[];
        }
      }

      return { success: true, data: parsedData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Google Pay data',
      };
    }
  }
}
