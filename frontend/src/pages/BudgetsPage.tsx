import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { mockBudgets, budgetCategoryOptions, colorForCategory, fmt, type Budget } from "@/data/mockData";

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formCat, setFormCat] = useState(budgetCategoryOptions[0]);
  const [formBudget, setFormBudget] = useState("");

  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = budgets.filter((b) => b.spent > b.budget).length;

  const openAdd = () => {
    setEditId(null);
    setFormCat(budgetCategoryOptions.find((c) => !budgets.some((b) => b.category === c)) || budgetCategoryOptions[0]);
    setFormBudget("");
    setShowForm(true);
  };

  const openEdit = (b: Budget) => {
    setEditId(b.id);
    setFormCat(b.category);
    setFormBudget(String(b.budget));
    setShowForm(true);
  };

  const save = () => {
    const amt = parseInt(formBudget);
    if (!amt || amt <= 0) return;
    if (editId) {
      setBudgets((prev) => prev.map((b) => (b.id === editId ? { ...b, category: formCat, budget: amt, color: colorForCategory(formCat) } : b)));
    } else {
      setBudgets((prev) => [...prev, { id: `b${Date.now()}`, category: formCat, budget: amt, spent: 0, color: colorForCategory(formCat) }]);
    }
    setShowForm(false);
  };

  const remove = (id: string) => setBudgets((prev) => prev.filter((b) => b.id !== id));

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Total Budget", value: fmt(totalBudget), sub: "MAR 2026", accent: "text-primary" },
          { label: "Total Spent", value: fmt(totalSpent), sub: `${((totalSpent / totalBudget) * 100).toFixed(0)}% used`, accent: totalSpent > totalBudget ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400" },
          { label: "Over Budget", value: String(overBudgetCount), sub: overBudgetCount ? "categories exceeded" : "all on track", accent: overBudgetCount ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-card border border-border shadow-sm rounded-sm p-4">
            <div className="relative z-10">
              <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{card.label}</div>
              <div className={`text-lg font-semibold ${card.accent}`}>{card.value}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={openAdd} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] flex items-center gap-1.5 px-3 py-1.5">
          <Plus className="w-3 h-3" /> Add Budget
        </button>
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border shadow-sm rounded-sm p-5">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground">
                  {editId ? "> Edit Budget" : "> New Budget"}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Category</label>
                  <select value={formCat} onChange={(e) => setFormCat(e.target.value)}
                    className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none">
                    {budgetCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Monthly Limit (₹)</label>
                  <input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} placeholder="20000"
                    className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none" />
                </div>
              </div>
              <button onClick={save} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] flex items-center gap-1.5 px-3 py-1.5">
                <Check className="w-3 h-3" /> {editId ? "Update" : "Create"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget list */}
      <div className="grid sm:grid-cols-2 gap-4">
        {budgets.map((b, i) => {
          const pct = Math.min((b.spent / b.budget) * 100, 100);
          const over = b.spent > b.budget;
          const remaining = b.budget - b.spent;
          return (
            <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-card border border-border shadow-sm rounded-sm p-4 group">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: b.color, boxShadow: `0 0 6px ${b.color.replace(")", " / 0.5)")}` }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">{b.category}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(b)} className="w-5 h-5 rounded-sm flex items-center justify-center hover:bg-secondary/50 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={() => remove(b.id)} className="w-5 h-5 rounded-sm flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground">{fmt(b.spent)}</span>
                  <span className="text-[9px] text-muted-foreground">of {fmt(b.budget)}</span>
                </div>

                <div className="bg-muted/50 rounded-sm h-2.5 overflow-hidden mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.15 + i * 0.05 }}
                    className="h-full rounded-sm"
                    style={{
                      background: over
                        ? "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--destructive)))"
                        : `linear-gradient(90deg, ${b.color}, ${b.color})`,
                      boxShadow: `0 0 6px ${over ? "hsl(var(--accent) / 0.4)" : b.color.replace(")", " / 0.4)")}`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold ${over ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {over ? `OVER by ${fmt(Math.abs(remaining))}` : `${fmt(remaining)} left`}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetsPage;
