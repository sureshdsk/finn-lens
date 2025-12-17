// Zustand store types for multi-app support

import { ParsedData, RawExtractedData, AppRawData } from './data.types';
import { Insight } from './insight.types';
import { FilterContext } from './filter.types';
import { UpiAppId } from './app.types';

// Re-export types for backward compatibility
export type { RawExtractedData } from './data.types';
export type { YearFilter } from './filter.types';

/**
 * Multi-app data store interface
 */
export interface DataStore {
  // State - Multi-app support
  rawDataByApp: Map<UpiAppId, AppRawData>; // Raw data per app
  parsedData: ParsedData | null; // Unified parsed data
  insights: Insight[];

  // Filtering
  filterContext: FilterContext; // Combined year + app filter

  // UI state
  isLoading: boolean;
  error: string | null;
  uploadedApps: UpiAppId[]; // Which apps have been uploaded

  // Actions
  addAppData: (app: UpiAppId, rawData: AppRawData) => Promise<void>;
  removeAppData: (app: UpiAppId) => void;
  setParsedData: (data: ParsedData) => void;
  setInsights: (insights: Insight[]) => void;
  setFilterContext: (context: FilterContext) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Complex actions
  parseAllData: () => Promise<void>; // Parse all uploaded apps
  recalculateInsights: (context: FilterContext) => void;
  clearAllData: () => void;

  // Legacy actions (for backward compatibility during migration)
  setRawData: (data: RawExtractedData) => void;
  setSelectedYear: (year: FilterContext['year']) => void;
  parseRawData: () => void;
}
