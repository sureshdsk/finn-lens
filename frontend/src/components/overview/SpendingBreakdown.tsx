import { motion } from "framer-motion";
import { spendingBreakdown, fmt } from "@/data/mockData";

const total = spendingBreakdown.reduce((s, c) => s + c.amount, 0);

const SpendingBreakdown = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="terminal neon-border rounded-sm p-5 crt-overlay">
      <div className="relative z-10">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-5">Breakdown</h3>
        <div className="flex justify-center mb-5">
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {spendingBreakdown.reduce((acc, cat, i) => {
                const offset = spendingBreakdown.slice(0, i).reduce((s, c) => s + c.percent, 0);
                acc.push(
                  <circle key={cat.name} cx="18" cy="18" r="14" fill="none" stroke={cat.color} strokeWidth="3.5"
                    strokeDasharray={`${cat.percent} ${100 - cat.percent}`} strokeDashoffset={-offset}
                    style={{ filter: `drop-shadow(0 0 4px ${cat.color})` }} />
                );
                return acc;
              }, [] as React.ReactElement[])}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-display font-bold neon-text">{fmt(total)}</div>
                <div className="text-[9px] text-muted-foreground font-mono">TOTAL</div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2.5">
          {spendingBreakdown.map((cat, i) => (
            <motion.div key={cat.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color, boxShadow: `0 0 6px ${cat.color}` }} />
                <span className="text-[11px] text-foreground font-mono">{cat.name}</span>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-[11px] font-bold text-foreground font-mono">{fmt(cat.amount)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{cat.percent}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SpendingBreakdown;
