import { motion } from "framer-motion";
import { mockMonthlyData } from "@/data/mockData";

const months = mockMonthlyData.map(m => m.month);
const incomeData = mockMonthlyData.map(m => m.income / 1000);
const expenseData = mockMonthlyData.map(m => m.expense / 1000);
const maxVal = Math.max(...incomeData, ...expenseData);

const SpendingChart = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="terminal neon-border rounded-sm p-5 crt-overlay">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">Income vs Expenses</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--neon-cyan))]/80 shadow-[var(--glow-cyan)]" />
              <span className="text-[10px] text-muted-foreground font-mono">INC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--neon-magenta))]/80 shadow-[var(--glow-magenta)]" />
              <span className="text-[10px] text-muted-foreground font-mono">EXP</span>
            </div>
          </div>
        </div>
        <div className="terminal rounded-sm p-3 relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="flex items-end justify-between gap-1.5 h-48 relative z-10">
            {months.map((month, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-[2px] h-40">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(incomeData[i] / maxVal) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.04 }}
                    className="w-[42%] rounded-t-sm"
                    style={{
                      background: "linear-gradient(180deg, hsl(var(--neon-cyan) / 0.9) 0%, hsl(var(--neon-cyan) / 0.2) 100%)",
                      boxShadow: "0 0 6px hsl(var(--neon-cyan) / 0.3)",
                    }}
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(expenseData[i] / maxVal) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.04 + 0.1 }}
                    className="w-[42%] rounded-t-sm"
                    style={{
                      background: "linear-gradient(180deg, hsl(var(--neon-magenta) / 0.9) 0%, hsl(var(--neon-magenta) / 0.2) 100%)",
                      boxShadow: "0 0 6px hsl(var(--neon-magenta) / 0.3)",
                    }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground font-mono">{month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SpendingChart;
