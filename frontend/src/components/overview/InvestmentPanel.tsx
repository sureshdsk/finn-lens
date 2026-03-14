import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { mockHoldings, fmt } from "@/data/mockData";

const holdings = mockHoldings.slice(0, 5);
const totalValue = holdings.reduce((s, h) => s + h.current, 0);

const InvestmentPanel = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="terminal neon-border rounded-sm p-5 crt-overlay">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">Portfolio</h3>
          <span className="text-xs font-display font-bold neon-text">{fmt(totalValue)}</span>
        </div>
        <div className="space-y-0">
          {holdings.map((h, i) => (
            <motion.div key={h.ticker} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.05 }}
              className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
              <div>
                <div className="text-[11px] font-mono text-foreground">{h.name}</div>
                <div className="text-[9px] text-muted-foreground font-mono">{h.ticker} × {h.qty}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-mono font-bold text-foreground">{fmt(h.current)}</div>
                <div className={`text-[10px] font-mono font-bold flex items-center gap-0.5 justify-end ${h.dayChange >= 0 ? "neon-green" : "neon-magenta"}`}>
                  {h.dayChange >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {h.dayChange >= 0 ? "+" : ""}{h.dayChange}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default InvestmentPanel;
