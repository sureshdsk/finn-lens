import { useQuery } from '@tanstack/react-query'
import { getSpendingSummaryApi, getMonthlySpendingApi } from '@/api/unified'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f97316', groceries: '#22c55e', clothing: '#ec4899',
  entertainment: '#a855f7', ecommerce: '#3b82f6', travel_transport: '#06b6d4',
  bills_utilities: '#eab308', healthcare: '#ef4444', education: '#6366f1',
  investment_finance: '#10b981', services_misc: '#64748b', uncategorized: '#6b7280',
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food', groceries: 'Groceries', clothing: 'Clothing',
  entertainment: 'Entertainment', ecommerce: 'E-commerce', travel_transport: 'Travel',
  bills_utilities: 'Bills', healthcare: 'Health', education: 'Education',
  investment_finance: 'Investment', services_misc: 'Services', uncategorized: 'Other',
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function fmtFull(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border shadow-sm rounded-sm p-2.5 text-[9px] shadow-lg">
      <div className="text-foreground font-bold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="text-foreground font-bold">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['spending-summary-analytics'],
    queryFn: () => getSpendingSummaryApi({}),
  })

  const { data: monthly = [], isLoading: loadingMonthly } = useQuery({
    queryKey: ['monthly-spending'],
    queryFn: () => getMonthlySpendingApi({}),
  })

  const cats = summary?.categories ?? []
  const totalExpense = cats.reduce((s, c) => s + Number(c.total), 0)

  const chartData = monthly.map((m) => ({
    month: m.month_label,
    income: Number(m.income),
    expense: Number(m.expense),
    savings: Number(m.savings),
  }))

  const latestMonth = chartData[chartData.length - 1]
  const prevMonth = chartData[chartData.length - 2]
  const expenseTrend = latestMonth && prevMonth && prevMonth.expense > 0
    ? ((latestMonth.expense - prevMonth.expense) / prevMonth.expense * 100).toFixed(1)
    : '0'
  const savingsRate = latestMonth && latestMonth.income > 0
    ? Math.round((latestMonth.savings / latestMonth.income) * 100)
    : 0
  const avgExpense = chartData.length > 0
    ? Math.round(chartData.reduce((s, m) => s + m.expense, 0) / chartData.length)
    : 0

  const isLoading = loadingSummary || loadingMonthly

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Avg Monthly Spend', value: isLoading ? '...' : fmt(avgExpense), icon: TrendingDown, accent: 'text-[hsl(var(--text-amber-600 dark:text-amber-400))]' },
          { label: 'Savings Rate', value: isLoading ? '...' : `${savingsRate}%`, icon: TrendingUp, accent: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Expense Trend', value: isLoading ? '...' : `${Number(expenseTrend) > 0 ? '+' : ''}${expenseTrend}%`, icon: Number(expenseTrend) > 0 ? TrendingUp : TrendingDown, accent: Number(expenseTrend) > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Top Category', value: isLoading ? '...' : (CATEGORY_LABELS[cats[0]?.category] ?? '—'), icon: TrendingUp, accent: 'text-primary' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-card border border-border shadow-sm rounded-sm p-4">
            <div className="relative z-10">
              <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{card.label}</div>
              <div className="flex items-center gap-1.5">
                <card.icon className={`w-4 h-4 ${card.accent}`} />
                <span className={`text-lg font-semibold ${card.accent}`}>{card.value}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Income vs Expense chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card border border-border shadow-sm rounded-sm p-5">
        <div className="relative z-10">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Income vs Expense</h3>
          {isLoading ? <Skeleton className="h-[260px] w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" fill="hsl(var(--text-emerald-600 dark:text-emerald-400))" radius={[2, 2, 0, 0]} opacity={0.85} />
                <Bar dataKey="expense" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center justify-center gap-5 mt-2">
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--text-emerald-600 dark:text-emerald-400))]" /> Income</div>
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--accent))]" /> Expense</div>
          </div>
        </div>
      </motion.div>

      {/* Category breakdown */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card border border-border shadow-sm rounded-sm p-5">
        <div className="relative z-10">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Spending by Category</h3>
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={cats.filter(c => c.category !== 'transfers_payments').map(c => ({ name: CATEGORY_LABELS[c.category] ?? c.category, value: Number(c.total) }))}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value"
                  >
                    {cats.filter(c => c.category !== 'transfers_payments').map(c => (
                      <Cell key={c.category} fill={CATEGORY_COLORS[c.category] ?? '#6b7280'} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtFull(Number(v))} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 2, fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {cats.filter(c => c.category !== 'transfers_payments').slice(0, 8).map(c => (
                  <div key={c.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.category] ?? '#6b7280' }} />
                      <span className="text-[9px] text-foreground">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {totalExpense > 0 ? Math.round((Number(c.total) / totalExpense) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Monthly comparison table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-card border border-border shadow-sm rounded-sm p-5">
        <div className="relative z-10">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Monthly Comparison</h3>
          <div className="grid grid-cols-5 gap-2 pb-2 border-b border-border text-[8px] uppercase tracking-widest text-muted-foreground">
            <div>Month</div><div className="text-right">Income</div><div className="text-right">Expense</div><div className="text-right">Savings</div><div className="text-right">Rate</div>
          </div>
          {isLoading ? (
            <div className="space-y-2 mt-2">{[0,1,2].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {chartData.map((m, i) => {
                const rate = m.income > 0 ? Math.round((m.savings / m.income) * 100) : 0
                const prevExp = i > 0 ? chartData[i - 1].expense : m.expense
                const expChange = prevExp > 0 ? ((m.expense - prevExp) / prevExp * 100).toFixed(1) : '0'
                return (
                  <div key={m.month} className="grid grid-cols-5 gap-2 py-2.5 items-center">
                    <div className="text-[10px] font-bold text-foreground">{m.month}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 text-right">{fmtFull(m.income)}</div>
                    <div className="text-right">
                      <div className="text-[10px] text-rose-500">{fmtFull(m.expense)}</div>
                      {i > 0 && <div className={`text-[8px] ${Number(expChange) > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{Number(expChange) > 0 ? '+' : ''}{expChange}%</div>}
                    </div>
                    <div className="text-[10px] text-primary text-right">{fmtFull(m.savings)}</div>
                    <div className={`text-[10px] font-bold text-right ${rate >= 30 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 20 ? 'text-[hsl(var(--text-amber-600 dark:text-amber-400))]' : 'text-rose-500'}`}>{rate}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
