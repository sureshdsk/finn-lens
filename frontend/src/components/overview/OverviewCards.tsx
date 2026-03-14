import { motion } from "framer-motion";
import { Wallet, TrendingUp, CreditCard, LineChart, PiggyBank } from "lucide-react";
import { overviewCards } from "@/data/mockData";

const icons = [Wallet, TrendingUp, CreditCard, LineChart, PiggyBank];

const OverviewCards = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {overviewCards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="terminal neon-border rounded-sm p-4 crt-overlay"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              {(() => { const Icon = icons[i]; return <Icon className="w-4 h-4 neon-text" />; })()}
              <span className={`text-[10px] font-mono font-bold ${card.positive ? "neon-green" : "neon-magenta"}`}>
                {card.change} {card.positive ? "▲" : "▼"}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-mono">{'>'} {card.label}</div>
            <div className="text-base font-display font-bold neon-text">{card.value}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default OverviewCards;
