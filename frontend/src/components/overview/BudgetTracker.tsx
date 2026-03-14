import { motion } from "framer-motion";
import { mockBudgets, CURRENT_MONTH } from "@/data/mockData";

const budgets = mockBudgets.slice(0, 5);

const BudgetTracker = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
      className="terminal neon-border rounded-sm p-5 crt-overlay">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">Budget</h3>
          <span className="text-[9px] text-muted-foreground font-mono">{CURRENT_MONTH.replace(" ", "_")}</span>
        </div>
        <div className="space-y-3.5">
          {budgets.map((b, i) => {
            const pct = Math.min((b.spent / b.budget) * 100, 100);
            const over = b.spent > b.budget;
            return (
              <motion.div key={b.category} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.06 }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-foreground font-mono uppercase">{b.category}</span>
                  <span className={`text-[10px] font-mono font-bold ${over ? "neon-magenta" : "text-muted-foreground"}`}>
                    {(b.spent / 1000).toFixed(0)}K/{(b.budget / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="terminal rounded-sm h-2.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.55 + i * 0.06 }}
                    className="h-full rounded-sm"
                    style={{
                      background: over
                        ? "linear-gradient(90deg, hsl(var(--neon-magenta)), hsl(var(--neon-red)))"
                        : `linear-gradient(90deg, ${b.color}, ${b.color})`,
                      boxShadow: `0 0 6px ${over ? "hsl(var(--neon-magenta) / 0.4)" : b.color.replace(")", " / 0.4)")}`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default BudgetTracker;
