// Main insight calculation orchestrator

import { ParsedData } from '../types/data.types';
import { Insight } from '../types/insight.types';
import { YearFilter } from '../utils/dateUtils';
import {
  filterTransactionsByYear,
  filterGroupExpensesByYear,
  filterCashbackRewardsByYear,
  filterVouchersByYear,
  filterActivitiesByYear
} from '../utils/dateUtils';

// Import calculators
import { calculateDomainInsight } from './calculators/domainCalculator';
import { calculateGroupChampionInsight } from './calculators/groupCalculator';
import { calculateVoucherHoarderInsight } from './calculators/voucherCalculator';
import { calculateSpendingTimelineInsight } from './calculators/timelineCalculator';
import { calculateSplitPartnerInsight } from './calculators/partnerCalculator';
import { calculateRewardHunterInsight } from './calculators/rewardCalculator';
import { calculateExpensiveDayInsight } from './calculators/expensiveDayCalculator';
import { calculateResponsibleOneInsight } from './calculators/responsibleCalculator';
import { calculateMoneyNetworkInsight } from './calculators/networkCalculator';

// NEW: Activity-based calculators
import { calculateMoneyFlowInsight } from './calculators/moneyFlowCalculator';
import { calculateTransactionPartnerInsight } from './calculators/transactionPartnerCalculator';
import { calculatePeakActivityInsight } from './calculators/peakActivityCalculator';
import { calculateBulkPaymentInsight } from './calculators/bulkPaymentCalculator';
import { calculateSpendingCategoryInsight } from './calculators/spendingCategoryCalculator';

/**
 * Calculate all insights for the given data and year filter
 */
export function calculateAllInsights(
  data: ParsedData,
  year: YearFilter = 'all'
): Insight[] {
  // Filter data by year
  const filteredData: ParsedData = {
    transactions: filterTransactionsByYear(data.transactions, year),
    groupExpenses: filterGroupExpensesByYear(data.groupExpenses, year),
    cashbackRewards: filterCashbackRewardsByYear(data.cashbackRewards, year),
    voucherRewards: filterVouchersByYear(data.voucherRewards, year),
    activities: filterActivitiesByYear(data.activities, year)
  };

  const insights: Insight[] = [];

  // Calculate each insight (only add if not null)
  const domainInsight = calculateDomainInsight(filteredData);
  if (domainInsight) insights.push(domainInsight);

  const groupInsight = calculateGroupChampionInsight(filteredData);
  if (groupInsight) insights.push(groupInsight);

  const voucherInsight = calculateVoucherHoarderInsight(filteredData);
  if (voucherInsight) insights.push(voucherInsight);

  const timelineInsight = calculateSpendingTimelineInsight(filteredData);
  if (timelineInsight) insights.push(timelineInsight);

  const partnerInsight = calculateSplitPartnerInsight(filteredData);
  if (partnerInsight) insights.push(partnerInsight);

  const rewardInsight = calculateRewardHunterInsight(filteredData);
  if (rewardInsight) insights.push(rewardInsight);

  const expensiveInsight = calculateExpensiveDayInsight(filteredData);
  if (expensiveInsight) insights.push(expensiveInsight);

  const responsibleInsight = calculateResponsibleOneInsight(filteredData);
  if (responsibleInsight) insights.push(responsibleInsight);

  const networkInsight = calculateMoneyNetworkInsight(filteredData);
  if (networkInsight) insights.push(networkInsight);

  // NEW: Activity-based calculators
  const moneyFlowInsight = calculateMoneyFlowInsight(filteredData);
  if (moneyFlowInsight) insights.push(moneyFlowInsight);

  const transactionPartnerInsight = calculateTransactionPartnerInsight(filteredData);
  if (transactionPartnerInsight) insights.push(transactionPartnerInsight);

  const peakActivityInsight = calculatePeakActivityInsight(filteredData);
  if (peakActivityInsight) insights.push(peakActivityInsight);

  const bulkPaymentInsight = calculateBulkPaymentInsight(filteredData);
  if (bulkPaymentInsight) insights.push(bulkPaymentInsight);

  const categoryInsight = calculateSpendingCategoryInsight(filteredData);
  if (categoryInsight) insights.push(categoryInsight);

  console.log(
    `Generated ${insights.length} insights (including ${
      [moneyFlowInsight, transactionPartnerInsight, peakActivityInsight, bulkPaymentInsight, categoryInsight].filter(
        Boolean
      ).length
    } activity/category-based)`
  );

  // Return max 10 insights
  return insights.slice(0, 10);
}
