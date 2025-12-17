import { create } from 'zustand';
import { DataStore, RawExtractedData, YearFilter } from '../types/storage.types';
import {
  ParsedData,
  Transaction,
  GroupExpense,
  CashbackReward,
  Voucher,
  ActivityRecord,
  AppRawData,
} from '../types/data.types';
import { Insight } from '../types/insight.types';
import { UpiApp, UpiAppId } from '../types/app.types';
import { FilterContext } from '../types/filter.types';
import { parseTransactionsCSV, parseCashbackRewardsCSV } from '../utils/csvParser';
import { parseGroupExpensesJSON, parseVoucherRewardsJSON } from '../utils/jsonParser';
import { parseCurrency } from '../utils/currencyUtils';
import { calculateAllInsights } from '../engines/insightEngine';
import { parseMyActivityHTML } from '../utils/htmlParser';
import { MultiAppManager } from '../services/MultiAppManager';
import { applyFilters } from '../utils/filterUtils';

const multiAppManager = new MultiAppManager();

/**
 * Multi-app data store using Zustand
 */
export const useDataStore = create<DataStore>((set, get) => ({
  // State - Multi-app support
  rawDataByApp: new Map(),
  parsedData: null,
  insights: [],
  filterContext: {
    year: '2025',
    apps: ['all'],
  },
  isLoading: false,
  error: null,
  uploadedApps: [],

  // Actions
  addAppData: async (app: UpiAppId, rawData: AppRawData) => {
    const currentMap = get().rawDataByApp;
    const newMap = new Map(currentMap);
    newMap.set(app, rawData);

    set({ rawDataByApp: newMap });

    // Add to uploaded apps list
    const uploadedApps = get().uploadedApps;
    if (!uploadedApps.includes(app)) {
      set({ uploadedApps: [...uploadedApps, app] });
    }

    // Auto-parse all data
    await get().parseAllData();
  },

  removeAppData: (app: UpiAppId) => {
    const currentMap = get().rawDataByApp;
    const newMap = new Map(currentMap);
    newMap.delete(app);

    set({
      rawDataByApp: newMap,
      uploadedApps: get().uploadedApps.filter(a => a !== app),
    });

    // Re-parse remaining data
    get().parseAllData();
  },

  setParsedData: (data: ParsedData) => {
    set({ parsedData: data });
  },

  setInsights: (insights: Insight[]) => {
    set({ insights });
  },

  setFilterContext: (context: FilterContext) => {
    set({ filterContext: context });
    // Auto-recalculate insights
    get().recalculateInsights(context);
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * Parse all uploaded app data
   */
  parseAllData: async () => {
    const { rawDataByApp } = get();

    if (rawDataByApp.size === 0) {
      set({ parsedData: null, insights: [] });
      return;
    }

    try {
      set({ isLoading: true, error: null });

      const result = await multiAppManager.parseAllAppData(rawDataByApp);

      if (!result.success || !result.data) {
        set({
          error: result.error || 'Failed to parse data',
          isLoading: false,
        });
        return;
      }

      set({ parsedData: result.data, isLoading: false });

      // Auto-calculate insights
      get().recalculateInsights(get().filterContext);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to parse data',
        isLoading: false,
      });
    }
  },

  /**
   * Recalculate insights with filtering
   */
  recalculateInsights: (context: FilterContext) => {
    const { parsedData } = get();

    if (!parsedData) {
      set({ insights: [] });
      return;
    }

    try {
      // Apply filters
      const filteredData = applyFilters(parsedData, context);

      // Calculate insights on filtered data
      const insights = calculateAllInsights(filteredData, context.year);

      set({ insights, error: null });
    } catch (error) {
      console.error('Error calculating insights:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to calculate insights',
        insights: [],
      });
    }
  },

  /**
   * Clear all data
   */
  clearAllData: () => {
    set({
      rawDataByApp: new Map(),
      parsedData: null,
      insights: [],
      uploadedApps: [],
      error: null,
    });
  },

  // Legacy actions (for backward compatibility during migration)
  setRawData: (data: RawExtractedData) => {
    // Convert to new format with Google Pay as default app
    const appRawData: AppRawData = {
      app: UpiApp.GOOGLE_PAY,
      rawData: data as Record<string, string>,
      uploadedAt: new Date(),
    };

    const newMap = new Map();
    newMap.set(UpiApp.GOOGLE_PAY, appRawData);

    set({ rawDataByApp: newMap, uploadedApps: [UpiApp.GOOGLE_PAY] });
  },

  setSelectedYear: (year: YearFilter) => {
    const currentContext = get().filterContext;
    const newContext: FilterContext = {
      ...currentContext,
      year,
    };
    set({ filterContext: newContext });
    // Automatically recalculate insights when year changes
    get().recalculateInsights(newContext);
  },

  parseRawData: () => {
    const { rawDataByApp } = get();
    if (rawDataByApp.size === 0) {
      console.warn('No raw data available for parsing');
      return;
    }

    try {
      // Get Google Pay data (legacy support)
      const googlePayData = rawDataByApp.get(UpiApp.GOOGLE_PAY);
      if (!googlePayData) {
        console.warn('No Google Pay data in rawDataByApp');
        return;
      }

      const rawData = googlePayData.rawData;

      // Parse transactions CSV
      let transactions: Transaction[] = [];
      if (rawData.transactions) {
        const result = parseTransactionsCSV(rawData.transactions);
        if (result.success && result.data) {
          // Convert amount strings to Currency objects
          transactions = result.data.map(t => ({
            ...t,
            amount: typeof t.amount === 'string' ? parseCurrency(t.amount) : t.amount,
            sourceApp: UpiApp.GOOGLE_PAY, // Add sourceApp
          })) as Transaction[];
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
          groupExpenses = result.data.map(g => ({
            ...g,
            sourceApp: UpiApp.GOOGLE_PAY,
          })) as GroupExpense[];
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
            sourceApp: UpiApp.GOOGLE_PAY,
          })) as CashbackReward[];
        }
      }

      // Parse voucher rewards JSON
      let voucherRewards: Voucher[] = [];
      if (rawData.voucherRewards) {
        const result = parseVoucherRewardsJSON(rawData.voucherRewards);
        if (result.success && result.data) {
          voucherRewards = result.data.map(v => ({
            ...v,
            sourceApp: UpiApp.GOOGLE_PAY,
          })) as Voucher[];
        }
      }

      // Parse My Activity HTML
      let activities: ActivityRecord[] = [];
      if (rawData.myActivity) {
        const result = parseMyActivityHTML(rawData.myActivity);
        if (result.success && result.data) {
          activities = result.data.map(a => ({
            ...a,
            sourceApp: UpiApp.GOOGLE_PAY,
          })) as ActivityRecord[];
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
        sources: [UpiApp.GOOGLE_PAY],
      };

      set({ parsedData, error: null });

      // Automatically calculate insights after parsing
      get().recalculateInsights(get().filterContext);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to parse data',
      });
    }
  },
}));
