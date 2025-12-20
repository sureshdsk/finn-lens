// Types for filtering data by year and app

import type { UpiAppId } from './app.types';

export type YearFilter = '2025' | '2024' | '2023' | 'all';
export type AppFilter = UpiAppId | 'all';

/**
 * Combined filtering context
 */
export interface FilterContext {
  year: YearFilter;
  apps: AppFilter[]; // Can select multiple apps
}

/**
 * Extended filter options for future use
 */
export interface FilterOptions {
  year?: YearFilter;
  apps?: AppFilter[];
  dateRange?: { start: Date; end: Date };
  minAmount?: number;
  maxAmount?: number;
}
