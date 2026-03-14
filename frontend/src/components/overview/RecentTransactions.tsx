import { motion } from "framer-motion";
import { ShoppingBag, Utensils, Zap, Film, Car, Home, ArrowDownLeft, Dumbbell, Shield } from "lucide-react";
import { mockTransactions } from "@/data/mockData";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag, ArrowDownLeft, Utensils, Zap, Film, Car, Home, Dumbbell, Shield,
};

const recentTx = mockTransactions.slice(0, 7);

const RecentTransactions = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      className="terminal neon-border rounded-sm p-5 crt-overlay">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">Transaction Log</h3>
          <button className="retro-button rounded-sm text-[10px] px-3 py-1">View All</button>
        </div>
        <div className="space-y-0">
          {recentTx.map((tx, i) => {
            const Icon = iconMap[tx.icon] || ShoppingBag;
            const dateStr = tx.date === "2026-03-08" ? `Today ${tx.time}` :
              tx.date === "2026-03-07" ? `Yest ${tx.time}` :
              `${new Date(tx.date).toLocaleDateString("en-IN", { month: "short", day: "2-digit" })} ${tx.time}`;
            const catShort = tx.category.slice(0, 4).toUpperCase();
            return (
              <motion.div key={tx.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <div className="text-[11px] font-mono text-foreground">{tx.label}</div>
                    <div className="text-[9px] text-muted-foreground font-mono">{dateStr}</div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="text-[9px] text-muted-foreground font-mono bg-secondary/50 px-1.5 py-0.5 rounded-sm">{catShort}</span>
                  <span className={`text-[11px] font-mono font-bold ${tx.type === "credit" ? "neon-green" : "text-foreground"}`}>
                    {tx.type === "credit" ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default RecentTransactions;
