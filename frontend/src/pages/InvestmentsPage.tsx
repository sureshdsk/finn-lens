import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Lightbulb, BarChart3, RefreshCw } from "lucide-react";
import { mockHoldings, mockInvestmentSuggestions, fmt, pctChange } from "@/data/mockData";

const typeLabels: Record<string, string> = { stock: "STOCK", mf: "MF", etf: "ETF", gold: "GOLD", crypto: "CRYPTO" };
const typeColors: Record<string, string> = {
  stock: "neon-text", mf: "neon-green", etf: "text-[hsl(var(--neon-amber))]",
  gold: "text-[hsl(45,90%,55%)]", crypto: "neon-magenta",
};

const urgencyStyles: Record<string, { border: string; badge: string; badgeText: string }> = {
  high: { border: "border-destructive/30", badge: "bg-destructive/10", badgeText: "text-destructive" },
  medium: { border: "border-[hsl(var(--neon-amber))]/30", badge: "bg-[hsl(var(--neon-amber))]/10", badgeText: "text-[hsl(var(--neon-amber))]" },
  low: { border: "border-border", badge: "bg-secondary", badgeText: "text-muted-foreground" },
};

const suggestionIcons: Record<string, typeof TrendingUp> = {
  average_down: ArrowDownRight, arbitrage: RefreshCw, rebalance: BarChart3, take_profit: ArrowUpRight,
};

const InvestmentsPage = () => {
  const [sortBy, setSortBy] = useState<"value" | "returns" | "day">("value");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const totalInvested = mockHoldings.reduce((s, h) => s + h.invested, 0);
  const totalCurrent = mockHoldings.reduce((s, h) => s + h.current, 0);
  const totalPnL = totalCurrent - totalInvested;
  const totalPct = pctChange(totalInvested, totalCurrent);
  const todayPnL = mockHoldings.reduce((s, h) => s + (h.current * h.dayChange) / 100, 0);

  const sorted = [...mockHoldings]
    .filter((h) => typeFilter === "all" || h.type === typeFilter)
    .sort((a, b) => {
      if (sortBy === "value") return b.current - a.current;
      if (sortBy === "returns") return (b.current - b.invested) / b.invested - (a.current - a.invested) / a.invested;
      return b.dayChange - a.dayChange;
    });

  const breakdown = Object.entries(
    mockHoldings.reduce((acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + h.current;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Portfolio Value", value: fmt(totalCurrent), sub: `Invested: ${fmt(totalInvested)}`, accent: "neon-text" },
          { label: "Total P&L", value: `${totalPnL >= 0 ? "+" : ""}${fmt(totalPnL)}`, sub: `${totalPnL >= 0 ? "+" : ""}${totalPct}%`, accent: totalPnL >= 0 ? "neon-green" : "neon-magenta" },
          { label: "Today's P&L", value: `${todayPnL >= 0 ? "+" : ""}${fmt(todayPnL)}`, sub: "day change", accent: todayPnL >= 0 ? "neon-green" : "neon-magenta" },
          { label: "Holdings", value: String(mockHoldings.length), sub: `${new Set(mockHoldings.map((h) => h.type)).size} asset types`, accent: "text-[hsl(var(--neon-amber))]" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="terminal neon-border rounded-sm p-4 crt-overlay">
            <div className="relative z-10">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest mb-1">{card.label}</div>
              <div className={`text-lg font-display font-bold ${card.accent}`}>{card.value}</div>
              <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Portfolio breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="terminal neon-border rounded-sm p-5 crt-overlay">
          <div className="relative z-10">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Asset Allocation</h3>
            <div className="flex h-3 rounded-sm overflow-hidden mb-4">
              {breakdown.map(([type, value]) => (
                <div key={type} className="h-full" style={{
                  width: `${(value / totalCurrent) * 100}%`,
                  background: mockHoldings.find((h) => h.type === type)?.color,
                }} />
              ))}
            </div>
            <div className="space-y-2.5">
              {breakdown.map(([type, value]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: mockHoldings.find((h) => h.type === type)?.color }} />
                    <span className="text-[10px] font-mono uppercase text-foreground">{typeLabels[type]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground">{((value / totalCurrent) * 100).toFixed(1)}%</span>
                    <span className="text-[10px] font-mono font-bold text-foreground">{fmt(value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 terminal neon-border rounded-sm p-5 crt-overlay">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-3.5 h-3.5 text-[hsl(var(--neon-amber))]" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">Smart Suggestions</h3>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {mockInvestmentSuggestions.map((s, i) => {
                const Icon = suggestionIcons[s.type];
                const urg = urgencyStyles[s.urgency];
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                    className={`terminal rounded-sm p-3 border ${urg.border}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-sm terminal neon-border flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3 h-3 neon-text" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-foreground">{s.title}</span>
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-sm ${urg.badge} ${urg.badgeText}`}>
                              {s.urgency.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[9px] text-muted-foreground font-mono mt-1 leading-relaxed">{s.description}</p>
                        </div>
                      </div>
                      <button className="retro-button-solid rounded-sm text-[8px] px-2 py-1 shrink-0 whitespace-nowrap mt-0.5">
                        {s.action}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Holdings table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="terminal neon-border rounded-sm p-5 crt-overlay">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">{'>'} Holdings</h3>
            <div className="flex items-center gap-2">
              {["all", "stock", "mf", "etf", "gold", "crypto"].map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2 py-1 rounded-sm text-[8px] font-mono uppercase tracking-wider transition-all ${
                    typeFilter === t ? "neon-text neon-border border terminal" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {t === "all" ? "ALL" : typeLabels[t]}
                </button>
              ))}
              <span className="text-border mx-1">|</span>
              {(["value", "returns", "day"] as const).map((s) => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-2 py-1 rounded-sm text-[8px] font-mono uppercase tracking-wider transition-all ${
                    sortBy === s ? "neon-text neon-border border terminal" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 pb-2 border-b border-border text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
            <div className="col-span-4">Asset</div>
            <div className="col-span-2 text-right">Qty × Avg</div>
            <div className="col-span-2 text-right">Current</div>
            <div className="col-span-2 text-right">P&L</div>
            <div className="col-span-2 text-right">Day</div>
          </div>

          <div className="divide-y divide-border">
            {sorted.map((h, i) => {
              const pnl = h.current - h.invested;
              const pnlPct = pctChange(h.invested, h.current);
              return (
                <motion.div key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.03 }}
                  className="grid grid-cols-12 gap-2 py-2.5 items-center">
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: h.color }} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold text-foreground truncate">{h.ticker}</div>
                      <div className="text-[8px] text-muted-foreground font-mono truncate flex items-center gap-1">
                        <span className={typeColors[h.type]}>{typeLabels[h.type]}</span> • {h.name}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-[10px] font-mono text-foreground">{h.qty} × {fmt(h.avgPrice)}</div>
                    <div className="text-[8px] text-muted-foreground font-mono">{fmt(h.invested)}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-[10px] font-mono font-bold text-foreground">{fmt(h.currentPrice)}</div>
                    <div className="text-[8px] text-muted-foreground font-mono">{fmt(h.current)}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className={`text-[10px] font-mono font-bold flex items-center justify-end gap-0.5 ${pnl >= 0 ? "neon-green" : "neon-magenta"}`}>
                      {pnl >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                    </div>
                    <div className={`text-[8px] font-mono ${pnl >= 0 ? "neon-green" : "neon-magenta"}`}>
                      {pnl >= 0 ? "+" : ""}{pnlPct}%
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className={`text-[10px] font-mono font-bold ${h.dayChange >= 0 ? "neon-green" : "neon-magenta"}`}>
                      {h.dayChange >= 0 ? "+" : ""}{h.dayChange}%
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InvestmentsPage;
