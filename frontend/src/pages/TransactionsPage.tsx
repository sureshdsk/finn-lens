import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Search, Filter, Download, ShoppingBag, ArrowDownLeft, Utensils, Zap, Film, Car, Home, Dumbbell, Shield } from "lucide-react";
import { mockTransactions, mockAccounts, categoryColors } from "@/data/mockData";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag, ArrowDownLeft, Utensils, Zap, Film, Car, Home, Dumbbell, Shield,
};

const allCategories = [...new Set(mockTransactions.map(t => t.category))].sort();

const TransactionsPage = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedAccount, setSelectedAccount] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");

  const filtered = useMemo(() => {
    return mockTransactions.filter(t => {
      const matchSearch = !search || t.label.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "All" || t.category === selectedCategory;
      const matchAcc = selectedAccount === "All" || t.accountId === selectedAccount;
      const matchType = selectedType === "All" || t.type === selectedType;
      return matchSearch && matchCat && matchAcc && matchType;
    });
  }, [search, selectedCategory, selectedAccount, selectedType]);

  const totalIncome = filtered.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === "debit").reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-sm uppercase tracking-wider text-foreground">Transactions</h2>
          <p className="text-[10px] text-muted-foreground font-mono">{'>'} {filtered.length} records found</p>
        </div>
        <button className="retro-button rounded-sm text-[10px] px-3 py-1.5 flex items-center gap-1.5">
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="terminal neon-border rounded-sm p-3 crt-overlay">
          <div className="relative z-10">
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">{'>'} INFLOW</div>
            <div className="text-sm font-display font-bold neon-green">+₹{totalIncome.toLocaleString("en-IN")}</div>
          </div>
        </div>
        <div className="terminal neon-border rounded-sm p-3 crt-overlay">
          <div className="relative z-10">
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">{'>'} OUTFLOW</div>
            <div className="text-sm font-display font-bold neon-magenta">-₹{totalExpense.toLocaleString("en-IN")}</div>
          </div>
        </div>
        <div className="terminal neon-border rounded-sm p-3 crt-overlay">
          <div className="relative z-10">
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">{'>'} NET</div>
            <div className={`text-sm font-display font-bold ${totalIncome - totalExpense >= 0 ? "neon-green" : "neon-magenta"}`}>
              {totalIncome - totalExpense >= 0 ? "+" : "-"}₹{Math.abs(totalIncome - totalExpense).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      <div className="terminal neon-border rounded-sm p-4 crt-overlay">
        <div className="relative z-10 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1 block">{'>'} Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..."
                className="w-full terminal neon-border rounded-sm pl-8 pr-3 py-2 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[hsl(var(--neon-cyan))]/50 transition-all bg-transparent" />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1 block">{'>'} Category</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="terminal neon-border rounded-sm px-3 py-2 text-[11px] font-mono text-foreground bg-card focus:outline-none transition-all appearance-none cursor-pointer">
              <option value="All">All</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1 block">{'>'} Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}
              className="terminal neon-border rounded-sm px-3 py-2 text-[11px] font-mono text-foreground bg-card focus:outline-none transition-all appearance-none cursor-pointer">
              <option value="All">All Accounts</option>
              {mockAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-1 block">{'>'} Type</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
              className="terminal neon-border rounded-sm px-3 py-2 text-[11px] font-mono text-foreground bg-card focus:outline-none transition-all appearance-none cursor-pointer">
              <option value="All">All</option>
              <option value="credit">Income</option>
              <option value="debit">Expense</option>
            </select>
          </div>
        </div>
      </div>

      <div className="terminal neon-border rounded-sm crt-overlay">
        <div className="relative z-10">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            <div className="col-span-1">Icon</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Account</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[11px] font-mono text-muted-foreground">
              {'>'} No transactions found matching filters.
            </div>
          ) : (
            filtered.map((tx, i) => {
              const Icon = iconMap[tx.icon] || Filter;
              const account = mockAccounts.find(a => a.id === tx.accountId);
              const catColor = categoryColors[tx.category] || "hsl(175 100% 50%)";
              return (
                <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/30 hover:bg-[hsl(var(--neon-cyan))]/[0.02] transition-colors items-center">
                  <div className="col-span-1"><Icon className="w-3.5 h-3.5 text-muted-foreground" /></div>
                  <div className="col-span-3"><div className="text-[11px] font-mono text-foreground truncate">{tx.label}</div></div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm border" style={{ borderColor: `${catColor}40`, color: catColor }}>
                      {tx.category.toUpperCase()}
                    </span>
                  </div>
                  <div className="col-span-2"><span className="text-[10px] font-mono text-muted-foreground">{account?.name.split(" ")[0] || "—"}</span></div>
                  <div className="col-span-2"><span className="text-[10px] font-mono text-muted-foreground">{tx.date.slice(5)} {tx.time}</span></div>
                  <div className="col-span-2 text-right">
                    <span className={`text-[11px] font-mono font-bold ${tx.type === "credit" ? "neon-green" : "text-foreground"}`}>
                      {tx.type === "credit" ? "+" : "-"}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
