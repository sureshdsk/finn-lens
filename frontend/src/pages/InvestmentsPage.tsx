import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { getInvestmentSummary, type InvestmentSummary } from "@/api/gmail";


const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const SCHEME_COLORS = [
  "hsl(var(--neon-primary))",
  "hsl(var(--neon-green))",
  "hsl(var(--neon-amber))",
  "hsl(45,90%,55%)",
  "hsl(var(--neon-magenta))",
  "hsl(200,80%,60%)",
  "hsl(280,70%,60%)",
  "hsl(340,70%,55%)",
];

const InvestmentsPage = () => {
  const [data, setData] = useState<InvestmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"value" | "returns" | "sips">("value");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const summary = await getInvestmentSummary();
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load investments");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto neon-text" />
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Loading investments...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <AlertCircle className="w-5 h-5 mx-auto text-destructive" />
          <p className="text-[10px] font-mono text-muted-foreground">{error || "No investment data found"}</p>
          <p className="text-[9px] font-mono text-muted-foreground">Connect Gmail and sync to import your Groww investment emails</p>
        </div>
      </div>
    );
  }

  if (data.holdings_count === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <TrendingUp className="w-5 h-5 mx-auto text-muted-foreground" />
          <p className="text-[10px] font-mono text-muted-foreground">No investment data extracted yet</p>
          <p className="text-[9px] font-mono text-muted-foreground">Sync your Gmail in Settings → Integrations to import Groww SIP emails</p>
        </div>
      </div>
    );
  }

  const sorted = [...data.holdings].sort((a, b) => {
    if (sortBy === "value") return b.current_value - a.current_value;
    if (sortBy === "returns") return b.pnl_pct - a.pnl_pct;
    return b.sip_count - a.sip_count;
  });

  // Deduplicate upcoming SIPs by scheme name (keep latest)
  const uniqueSips = data.upcoming_sips.reduce((acc, sip) => {
    if (!acc.find(s => s.scheme_name === sip.scheme_name)) acc.push(sip);
    return acc;
  }, [] as typeof data.upcoming_sips);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Portfolio Value", value: fmt(data.total_current), sub: `Invested: ${fmt(data.total_invested)}`, accent: "neon-text" },
          { label: "Total P&L", value: `${data.total_pnl >= 0 ? "+" : ""}${fmt(data.total_pnl)}`, sub: `${data.total_pnl >= 0 ? "+" : ""}${data.total_pnl_pct.toFixed(2)}%`, accent: data.total_pnl >= 0 ? "neon-green" : "neon-magenta" },
          { label: "Monthly SIP", value: fmt(data.upcoming_sips.reduce((s, sip) => s + (sip.amount || 0), 0) / Math.max(1, data.upcoming_sips.length) * data.holdings_count), sub: `${data.holdings_count} active SIPs`, accent: "text-[hsl(var(--neon-amber))]" },
          { label: "Holdings", value: String(data.holdings_count), sub: "mutual funds", accent: "neon-text" },
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
        {/* Allocation breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="terminal neon-border rounded-sm p-5 crt-overlay">
          <div className="relative z-10">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Allocation</h3>
            <div className="flex h-3 rounded-sm overflow-hidden mb-4">
              {sorted.map((h, i) => (
                <div key={h.scheme_name} className="h-full" style={{
                  width: `${(h.current_value / data.total_current) * 100}%`,
                  background: SCHEME_COLORS[i % SCHEME_COLORS.length],
                }} />
              ))}
            </div>
            <div className="space-y-2.5">
              {sorted.map((h, i) => {
                const shortName = h.scheme_name.replace(/\s*(Direct|Growth|Plan)\s*/gi, " ").trim();
                return (
                  <div key={h.scheme_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SCHEME_COLORS[i % SCHEME_COLORS.length] }} />
                      <span className="text-[9px] font-mono text-foreground truncate">{shortName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[9px] font-mono text-muted-foreground">{((h.current_value / data.total_current) * 100).toFixed(1)}%</span>
                      <span className="text-[9px] font-mono font-bold text-foreground">{fmt(h.current_value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Upcoming SIPs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 terminal neon-border rounded-sm p-5 crt-overlay">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-3.5 h-3.5 text-[hsl(var(--neon-amber))]" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">Upcoming SIPs</h3>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {uniqueSips.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground">No upcoming SIP data</p>
              ) : uniqueSips.map((sip, i) => {
                const shortName = sip.scheme_name.replace(/\s*(Direct|Growth|Plan)\s*/gi, " ").trim();
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                    className="terminal rounded-sm p-3 border border-border flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold text-foreground truncate">{shortName}</div>
                      <div className="text-[9px] text-muted-foreground font-mono">{sip.due_date || "—"}</div>
                    </div>
                    <div className="text-[10px] font-mono font-bold neon-text shrink-0">{sip.amount ? fmt(sip.amount) : "—"}</div>
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
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">{'>'} MF Holdings</h3>
            <div className="flex items-center gap-2">
              {(["value", "returns", "sips"] as const).map((s) => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-2 py-1 rounded-sm text-[8px] font-mono uppercase tracking-wider transition-all ${
                    sortBy === s ? "neon-text neon-border border terminal" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {s}
                </button>
              ))}
              <span className="text-border mx-1">|</span>
              <button onClick={loadData} className="text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 pb-2 border-b border-border text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
            <div className="col-span-4">Scheme</div>
            <div className="col-span-2 text-right">Units × NAV</div>
            <div className="col-span-2 text-right">Invested</div>
            <div className="col-span-2 text-right">Current</div>
            <div className="col-span-2 text-right">P&L</div>
          </div>

          <div className="divide-y divide-border">
            {sorted.map((h, i) => {
              const shortName = h.scheme_name.replace(/\s*(Direct|Growth|Plan)\s*/gi, " ").trim();
              return (
                <motion.div key={h.scheme_name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.03 }}
                  className="grid grid-cols-12 gap-2 py-2.5 items-center">
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SCHEME_COLORS[i % SCHEME_COLORS.length] }} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold text-foreground truncate">{shortName}</div>
                      <div className="text-[8px] text-muted-foreground font-mono">
                        <span className="neon-text">MF</span> • {h.sip_count} SIPs
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-[10px] font-mono text-foreground">{h.total_units.toFixed(2)}</div>
                    <div className="text-[8px] text-muted-foreground font-mono">@ {h.latest_nav.toFixed(2)}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-[10px] font-mono text-foreground">{fmt(h.total_invested)}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="text-[10px] font-mono font-bold text-foreground">{fmt(h.current_value)}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className={`text-[10px] font-mono font-bold flex items-center justify-end gap-0.5 ${h.pnl >= 0 ? "neon-green" : "neon-magenta"}`}>
                      {h.pnl >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {h.pnl >= 0 ? "+" : ""}{fmt(h.pnl)}
                    </div>
                    <div className={`text-[8px] font-mono ${h.pnl >= 0 ? "neon-green" : "neon-magenta"}`}>
                      {h.pnl >= 0 ? "+" : ""}{h.pnl_pct.toFixed(1)}%
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
