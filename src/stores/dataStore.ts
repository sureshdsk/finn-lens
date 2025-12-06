import { create } from 'zustand';
import { DataStore, RawExtractedData, YearFilter } from '../types/storage.types';
import { ParsedData, Transaction, GroupExpense, CashbackReward, Voucher, ActivityRecord } from '../types/data.types';
import { Insight } from '../types/insight.types';
import { parseTransactionsCSV, parseCashbackRewardsCSV } from '../utils/csvParser';
import { parseGroupExpensesJSON, parseVoucherRewardsJSON } from '../utils/jsonParser';
import { parseCurrency } from '../utils/currencyUtils';
import { calculateAllInsights } from '../engines/insightEngine';
import { parseMyActivityHTML } from '../utils/htmlParser';

/**
 * Global data store using Zustand
 * Manages all app state including raw data, parsed data, insights, and UI state
 */
export const useDataStore = create<DataStore>((set, get) => ({
  // State
  rawData: null,
  parsedData: null,
  insights: [],
  selectedYear: '2025',
  isLoading: false,
  error: null,

  // Actions
  setRawData: (data: RawExtractedData) => {
    set({ rawData: data });
  },

  setParsedData: (data: ParsedData) => {
    set({ parsedData: data });
  },

  setInsights: (insights: Insight[]) => {
    set({ insights });
  },

  setSelectedYear: (year: YearFilter) => {
    set({ selectedYear: year });
    // Automatically recalculate insights when year changes
    get().recalculateInsights(year);
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * Parse raw data into structured format
   */
  parseRawData: () => {
    const { rawData } = get();
    if (!rawData) {
      console.warn('No raw data available for parsing');
      return;
    }

    console.log('Raw data keys:', Object.keys(rawData));
    console.log('Raw data preview:', {
      hasTransactions: !!rawData.transactions,
      hasGroupExpenses: !!rawData.groupExpenses,
      hasCashbackRewards: !!rawData.cashbackRewards,
      hasVoucherRewards: !!rawData.voucherRewards,
      transactionsLength: rawData.transactions?.length,
      groupExpensesLength: rawData.groupExpenses?.length,
    });

    try {
      // Parse transactions CSV
      let transactions: Transaction[] = [];
      if (rawData.transactions) {
        console.log('Parsing transactions CSV...');
        const result = parseTransactionsCSV(rawData.transactions);
        console.log('Transaction parse result:', result);
        if (result.success && result.data) {
          // Convert amount strings to Currency objects
          transactions = result.data.map(t => ({
            ...t,
            amount: typeof t.amount === 'string' ? parseCurrency(t.amount) : t.amount,
          })) as Transaction[];
          console.log(`Parsed ${transactions.length} transactions`);
        } else {
          console.warn('Transaction parsing failed or returned no data:', result.error);
        }
      } else {
        console.warn('No transactions data in rawData');
      }

      // Parse group expenses JSON
      let groupExpenses: GroupExpense[] = [];
      if (rawData.groupExpenses) {
        const result = parseGroupExpensesJSON(rawData.groupExpenses);
        if (result.success && result.data) {
          groupExpenses = result.data;
        }
      }

      // Parse cashback rewards CSV
      let cashbackRewards: CashbackReward[] = [];
      if (rawData.cashbackRewards) {
        const result = parseCashbackRewardsCSV(rawData.cashbackRewards);
        if (result.success && result.data) {
          // Convert amount strings to numbers
          cashbackRewards = result.data.map(r => ({
            ...r,
            amount: typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
          })) as CashbackReward[];
        }
      }

      // Parse voucher rewards JSON
      let voucherRewards: Voucher[] = [];
      if (rawData.voucherRewards) {
        const result = parseVoucherRewardsJSON(rawData.voucherRewards);
        if (result.success && result.data) {
          voucherRewards = result.data;
        }
      }

      // Parse My Activity HTML
      let activities: ActivityRecord[] = [];
      if (rawData.myActivity) {
        console.log('Parsing My Activity HTML...');
        const result = parseMyActivityHTML(rawData.myActivity);
        console.log('My Activity parse result:', result);
        if (result.success && result.data) {
          activities = result.data;
          console.log(`Parsed ${activities.length} activity records`);
        } else {
          console.warn('My Activity parsing failed or returned no data:', result.error);
        }
      } else {
        console.warn('No My Activity data in rawData');
      }

      const parsedData: ParsedData = {
        transactions,
        groupExpenses,
        cashbackRewards,
        voucherRewards,
        activities,
      };

      console.log('Parsed data counts:', {
        transactions: transactions.length,
        groupExpenses: groupExpenses.length,
        cashbackRewards: cashbackRewards.length,
        voucherRewards: voucherRewards.length,
        activities: activities.length,
      });

      set({ parsedData, error: null });

      // Automatically calculate insights after parsing
      get().recalculateInsights(get().selectedYear);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to parse data',
      });
    }
  },

  /**
   * Recalculate insights based on selected year
   */
  recalculateInsights: (year: YearFilter) => {
    const { parsedData } = get();
    console.log('recalculateInsights called with year:', year);
    console.log('parsedData:', parsedData);

    if (!parsedData) {
      console.warn('No parsed data available for insight calculation');
      return;
    }

    try {
      // Calculate all insights using the insight engine
      console.log('Calling calculateAllInsights...');
      const insights = calculateAllInsights(parsedData, year);
      console.log(`Calculated ${insights.length} insights for year: ${year}`, insights);
      set({ insights, error: null });
    } catch (error) {
      console.error('Error calculating insights:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate insights',
        insights: [],
      });
    }
  },
}));
