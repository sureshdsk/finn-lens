import { useMemo } from 'react';
import { ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { convertToINR, TransactionCategory } from '../../utils/categoryUtils';
import { Currency } from '../../types/data.types';
import { useThemeStore } from '../../stores/themeStore';
import styles from './SpendingCharts.module.css';

interface CategoryData {
  category: TransactionCategory;
  amount: number;
  percentage: number;
  count: number;
}

interface TransactionLike {
  description: string;
  amount: Currency;
  date: Date;
}

interface SpendingChartsProps {
  categoryData: CategoryData[];
  transactions: TransactionLike[];
}

interface MonthlyData {
  month: string;
  amount: number;
  count: number;
}

export default function SpendingCharts({ categoryData, transactions }: SpendingChartsProps) {
  const { getCurrentColors } = useThemeStore();
  const themeColors = getCurrentColors();

  // Prepare monthly trend data - aggregate from already filtered transactions
  const monthlyData = useMemo(() => {
    const monthMap = new Map<number, { amount: number; count: number }>();

    // Initialize all 12 months
    for (let i = 0; i < 12; i++) {
      monthMap.set(i, { amount: 0, count: 0 });
    }

    // Aggregate transactions by month
    transactions.forEach(t => {
      const monthIndex = t.date.getMonth();
      const existing = monthMap.get(monthIndex)!;
      const amountInINR = convertToINR(t.amount);
      monthMap.set(monthIndex, {
        amount: existing.amount + amountInINR,
        count: existing.count + 1
      });
    });

    // Convert to array
    const result: MonthlyData[] = [];
    monthMap.forEach((value, monthIndex) => {
      const monthName = new Date(2024, monthIndex, 1).toLocaleString('en-US', { month: 'short' });
      result.push({
        month: monthName,
        amount: Math.round(value.amount),
        count: value.count
      });
    });

    return result;
  }, [transactions]);


  const formatAmount = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${Math.round(amount).toLocaleString()}`;
  };

  const MonthlyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className={styles.tooltip}
          style={{
            background: themeColors.surface,
            borderColor: themeColors.primary,
            color: themeColors.text,
          }}
        >
          <p className={styles.tooltipLabel} style={{ color: themeColors.text }}>
            {data.month}
          </p>
          <p className={styles.tooltipValue} style={{ color: themeColors.primary }}>
            {formatAmount(data.amount)}
          </p>
          <p className={styles.tooltipPercentage} style={{ color: themeColors.textSecondary }}>
            {data.count} transactions
          </p>
        </div>
      );
    }
    return null;
  };


  if (categoryData.length === 0) {
    return null;
  }

  return (
    <div className={styles.chartsContainer}>
      <div className={styles.chartsGrid}>
        {/* Monthly Trend Bar Chart - Full Width */}
        <div className={`${styles.chartSection} ${styles.fullWidth}`}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>
              <span className={styles.chartIcon}>📊</span>
              Monthly Trend
            </h3>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.surfaceBorder} opacity={0.3} />
                <XAxis
                  dataKey="month"
                  stroke={themeColors.textMuted}
                  style={{ fontSize: '13px', fontWeight: 500 }}
                  tick={{ fill: themeColors.textSecondary }}
                />
                <YAxis
                  stroke={themeColors.textMuted}
                  tickFormatter={formatAmount}
                  style={{ fontSize: '13px', fontWeight: 500 }}
                  tick={{ fill: themeColors.textSecondary }}
                />
                <Tooltip content={<MonthlyTooltip />} />
                <Bar
                  dataKey="amount"
                  fill={themeColors.primary}
                  fillOpacity={0.9}
                  radius={[8, 8, 0, 0]}
                  animationBegin={400}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
