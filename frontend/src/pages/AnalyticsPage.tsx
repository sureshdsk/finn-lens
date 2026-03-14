import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { mockTransactions, mockMonthlyData, mockWeeklySpending, categoryColors, fmt } from "@/data/mockData";

const categoryBreakdown = Object.entries(
  mockTransactions
    .filter((t) => t.type === "debit")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>)
).sort((a, b) => b[1] - a[1]);

const totalExpense = categoryBreakdown.reduce((s, [, v]) => s + v, 0);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="terminal neon-border rounded-sm p-2.5 text-[9px] font-mono shadow-lg">
      <div className="text-foreground font-bold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="text-foreground font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const AnalyticsPage = () => {
  const [period, setPeriod] = useState<"6m" | "3m" | "1m">("6m");
  const visibleMonths = period === "1m" ? mockMonthlyData.slice(-1) : period === "3m" ? mockMonthlyData.slice(-3) : mockMonthlyData;
  const avgExpense = Math.round(mockMonthlyData.reduce((s, m) => s + m.expense, 0) / mockMonthlyData.length);
  const latestSavingsRate = Math.round((mockMonthlyData[mockMonthlyData.length - 1].savings / mockMonthlyData[mockMonthlyData.length - 1].income) * 100);
  const expenseTrend = ((mockMonthlyData[mockMonthlyData.length - 1].expense - mockMonthlyData[mockMonthlyData.length - 2].expense) / mockMonthlyData[mockMonthlyData.length - 2].expense * 100).toFixed(1);
  const expenseTrendUp = Number(expenseTrend) > 0;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Avg Monthly Spend", value: fmt(avgExpense), icon: TrendingDown, accent: "text-[hsl(var(--neon-amber))]" },
          { label: "Savings Rate", value: `${latestSavingsRate}%`, icon: TrendingUp, accent: "neon-green" },
          { label: "Expense Trend", value: `${expenseTrendUp ? "+" : ""}${expenseTrend}%`, icon: expenseTrendUp ? ArrowUpRight : ArrowDownRight, accent: expenseTrendUp ? "neon-magenta" : "neon-green" },
          { label: "Top Category", value: categoryBreakdown[0][0], icon: TrendingUp, accent: "neon-text" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="terminal neon-border rounded-sm p-4 crt-overlay">
            <div className="relative z-10">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest mb-1">{card.label}</div>
              <div className="flex items-center gap-1.5">
                <card.icon className={`w-4 h-4 ${card.accent}`} />
                <span className={`text-lg font-display font-bold ${card.accent}`}>{card.value}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2">
        {(["6m", "3m", "1m"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-all ${period === p ? "neon-text neon-border border terminal" : "text-muted-foreground hover:text-foreground"}`}>{p}</button>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="terminal neon-border rounded-sm p-5 crt-overlay">
        <div className="relative z-10">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Income vs Expense</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={visibleMonths} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" fill="hsl(var(--neon-green))" radius={[2, 2, 0, 0]} opacity={0.85} />
              <Bar dataKey="expense" fill="hsl(var(--neon-magenta))" radius={[2, 2, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-5 mt-2">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--neon-green))]" /> Income</div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--neon-magenta))]" /> Expense</div>
          </div>
        </div>
      </motion.div>
      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="terminal neon-border rounded-sm p-5 crt-overlay">
          <div className="relative z-10">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Savings Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={visibleMonths}>
                <defs><linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--neon-cyan))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--neon-cyan))" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="savings" stroke="hsl(var(--neon-cyan))" fill="url(#savingsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="terminal neon-border rounded-sm p-5 crt-overlay">
          <div className="relative z-10">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Spending by Category</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={categoryBreakdown.map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                    {categoryBreakdown.map(([cat]) => (<Cell key={cat} fill={categoryColors[cat] || "hsl(0 0% 40%)"} stroke="transparent" />))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 9, fontFamily: "JetBrains Mono" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {categoryBreakdown.slice(0, 6).map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: categoryColors[cat] || "hsl(0 0% 40%)" }} /><span className="text-[9px] font-mono text-foreground">{cat}</span></div>
                    <span className="text-[9px] font-mono text-muted-foreground">{((val / totalExpense) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="terminal neon-border rounded-sm p-5 crt-overlay">
        <div className="relative z-10">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Weekly Spending (This Month)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mockWeeklySpending}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[2, 2, 0, 0]}>{mockWeeklySpending.map((_, i) => (<Cell key={i} fill={`hsl(var(--neon-cyan) / ${1 - i * 0.15})`} opacity={0.85} />))}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="terminal neon-border rounded-sm p-5 crt-overlay">
        <div className="relative z-10">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Monthly Comparison</h3>
          <div className="grid grid-cols-5 gap-2 pb-2 border-b border-border text-[8px] font-mono uppercase tracking-widest text-muted-foreground"><div>Month</div><div className="text-right">Income</div><div className="text-right">Expense</div><div className="text-right">Savings</div><div className="text-right">Rate</div></div>
          <div className="divide-y divide-border">
            {mockMonthlyData.map((m, i) => {
              const rate = Math.round((m.savings / m.income) * 100);
              const prevExpense = i > 0 ? mockMonthlyData[i - 1].expense : m.expense;
              const expChange = ((m.expense - prevExpense) / prevExpense * 100).toFixed(1);
              return (
                <motion.div key={m.month} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.04 }}
                  className="grid grid-cols-5 gap-2 py-2.5 items-center">
                  <div className="text-[10px] font-mono font-bold text-foreground">{m.month}</div>
                  <div className="text-[10px] font-mono neon-green text-right">{fmt(m.income)}</div>
                  <div className="text-right"><div className="text-[10px] font-mono neon-magenta">{fmt(m.expense)}</div>{i > 0 && <div className={`text-[8px] font-mono ${Number(expChange) > 0 ? "neon-magenta" : "neon-green"}`}>{Number(expChange) > 0 ? "+" : ""}{expChange}%</div>}</div>
                  <div className="text-[10px] font-mono neon-text text-right">{fmt(m.savings)}</div>
                  <div className={`text-[10px] font-mono font-bold text-right ${rate >= 30 ? "neon-green" : rate >= 20 ? "text-[hsl(var(--neon-amber))]" : "neon-magenta"}`}>{rate}%</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsPage;
