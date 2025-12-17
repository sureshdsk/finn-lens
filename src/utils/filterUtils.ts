// Combined filtering utilities for year and app filtering

import type { ParsedData } from '../types/data.types';
import type { FilterContext, AppFilter } from '../types/filter.types';
import type { UpiAppId } from '../types/app.types';
import {
  filterTransactionsByYear,
  filterActivitiesByYear,
  filterGroupExpensesByYear,
  filterCashbackRewardsByYear,
  filterVouchersByYear,
} from './dateUtils';

/**
 * Apply app filter to array
 */
function filterByApp<T extends { sourceApp: UpiAppId }>(items: T[], appFilter: AppFilter[]): T[] {
  // If "all" is in the filter, return everything
  if (appFilter.includes('all')) {
    return items;
  }

  // Filter to only selected apps
  return items.filter(item => appFilter.includes(item.sourceApp));
}

/**
 * Apply combined year + app filtering to parsed data
 */
export function applyFilters(data: ParsedData, context: FilterContext): ParsedData {
  // First filter by year
  const yearFiltered: ParsedData = {
    transactions: filterTransactionsByYear(data.transactions, context.year),
    activities: filterActivitiesByYear(data.activities, context.year),
    groupExpenses: filterGroupExpensesByYear(data.groupExpenses, context.year),
    cashbackRewards: filterCashbackRewardsByYear(data.cashbackRewards, context.year),
    voucherRewards: filterVouchersByYear(data.voucherRewards, context.year),
    sources: data.sources,
  };

  // Then filter by app
  const appFiltered: ParsedData = {
    transactions: filterByApp(yearFiltered.transactions, context.apps),
    activities: filterByApp(yearFiltered.activities, context.apps),
    groupExpenses: filterByApp(yearFiltered.groupExpenses, context.apps),
    cashbackRewards: filterByApp(yearFiltered.cashbackRewards, context.apps),
    voucherRewards: filterByApp(yearFiltered.voucherRewards, context.apps),
    sources: yearFiltered.sources,
  };

  return appFiltered;
}

/**
 * Get list of unique apps from parsed data
 */
export function getUniqueApps(data: ParsedData): UpiAppId[] {
  const apps = new Set<UpiAppId>();

  data.transactions.forEach(t => apps.add(t.sourceApp));
  data.activities.forEach(a => apps.add(a.sourceApp));
  data.groupExpenses.forEach(g => apps.add(g.sourceApp));
  data.cashbackRewards.forEach(r => apps.add(r.sourceApp));
  data.voucherRewards.forEach(v => apps.add(v.sourceApp));

  return Array.from(apps);
}
