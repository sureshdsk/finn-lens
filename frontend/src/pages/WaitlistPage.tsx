import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Check, Trash2, Clock, TrendingDown,
  ShieldAlert, ThumbsUp, ThumbsDown, Timer, Tag, ChevronDown, ChevronUp,
  Sparkles, IndianRupee,
} from "lucide-react";

interface WaitlistItem {
  id: string;
  name: string;
  price: number;
  category: string;
  url: string;
  addedDate: string;
  cooldownDays: number;
  priceHistory: { date: string; price: number }[];
  notes: string;
  status: "waiting" | "approved" | "rejected";
}

const initialItems: WaitlistItem[] = [
  { id: "pw1", name: "Sony WH-1000XM5 Headphones", price: 24990, category: "Electronics", url: "amazon.in", addedDate: "2026-02-20", cooldownDays: 14, notes: "Current earbuds still work fine", status: "waiting", priceHistory: [{ date: "2026-01-15", price: 27990 }, { date: "2026-02-01", price: 26490 }, { date: "2026-02-15", price: 25990 }, { date: "2026-03-01", price: 24990 }] },
  { id: "pw2", name: "iPad Air M2", price: 59900, category: "Electronics", url: "apple.com", addedDate: "2026-03-01", cooldownDays: 30, notes: "Want for note-taking, but laptop works", status: "waiting", priceHistory: [{ date: "2026-01-01", price: 59900 }, { date: "2026-02-01", price: 59900 }, { date: "2026-03-01", price: 59900 }] },
  { id: "pw3", name: "Nike Air Max 90", price: 11495, category: "Fashion", url: "nike.com", addedDate: "2026-02-10", cooldownDays: 7, notes: "Already have 4 sneakers", status: "rejected", priceHistory: [{ date: "2026-01-20", price: 12995 }, { date: "2026-02-10", price: 11495 }, { date: "2026-03-05", price: 10995 }] },
  { id: "pw4", name: "Kindle Paperwhite", price: 14999, category: "Electronics", url: "amazon.in", addedDate: "2026-01-25", cooldownDays: 14, notes: "Read 3+ books/month, phone screen hurts eyes", status: "approved", priceHistory: [{ date: "2026-01-10", price: 16999 }, { date: "2026-02-01", price: 15999 }, { date: "2026-03-01", price: 14999 }] },
];

const financialContext = {
  monthlyIncome: 240000, monthlyExpense: 175000, monthlySurplus: 65000,
  totalDebt: 61250, totalEMI: 0, emergencyFund: 520000, monthsOfExpenses: 2.97,
  savingsRate: 27, upcomingBills: 32000, shoppingBudget: 18000, shoppingSpent: 15000, shoppingRemaining: 3000,
};

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const daysSince = (date: string) => { const diff = new Date("2026-03-08").getTime() - new Date(date).getTime(); return Math.ceil(diff / (1000 * 60 * 60 * 24)); };
const categoryOptions = ["Electronics", "Fashion", "Home", "Fitness", "Books", "Travel", "Gaming", "Other"];

const generateVerdict = (item: WaitlistItem) => {
  const ctx = financialContext;
  const pricePct = (item.price / ctx.monthlyIncome) * 100;
  const surplusPct = (item.price / ctx.monthlySurplus) * 100;
  const waited = daysSince(item.addedDate);
  const cooldownMet = waited >= item.cooldownDays;
  const priceDropped = item.priceHistory.length > 1 && item.priceHistory[item.priceHistory.length - 1].price < item.priceHistory[0].price;
  const priceDrop = item.priceHistory.length > 1 ? ((item.priceHistory[0].price - item.priceHistory[item.priceHistory.length - 1].price) / item.priceHistory[0].price * 100).toFixed(1) : "0";
  const fitsShoppingBudget = item.price <= ctx.shoppingRemaining;
  const debtFree = ctx.totalDebt <= 0;

  const reasons: { type: "pro" | "con"; text: string }[] = [];
  if (cooldownMet) reasons.push({ type: "pro", text: `Cooldown passed (${waited} days waited). Not an impulse buy.` });
  if (priceDropped) reasons.push({ type: "pro", text: `Price dropped ${priceDrop}% since tracking began.` });
  if (pricePct < 5) reasons.push({ type: "pro", text: `Only ${pricePct.toFixed(1)}% of monthly income. Low impact.` });
  if (fitsShoppingBudget) reasons.push({ type: "pro", text: `Fits within remaining shopping budget (${fmt(ctx.shoppingRemaining)}).` });
  if (surplusPct < 30) reasons.push({ type: "pro", text: `Uses ${surplusPct.toFixed(0)}% of monthly surplus. Affordable.` });
  if (!cooldownMet) reasons.push({ type: "con", text: `Cooldown not met. ${item.cooldownDays - waited} days remaining. Wait it out.` });
  if (!priceDropped) reasons.push({ type: "con", text: `No price drop detected. Wait for a sale or discount.` });
  if (pricePct >= 10) reasons.push({ type: "con", text: `${pricePct.toFixed(1)}% of monthly income. Significant purchase.` });
  if (!fitsShoppingBudget) reasons.push({ type: "con", text: `Exceeds remaining shopping budget by ${fmt(item.price - ctx.shoppingRemaining)}.` });
  if (!debtFree) reasons.push({ type: "con", text: `You have ${fmt(ctx.totalDebt)} in outstanding debt. Clear debt first.` });
  if (surplusPct >= 50) reasons.push({ type: "con", text: `Uses ${surplusPct.toFixed(0)}% of monthly surplus. Too heavy.` });
  if (ctx.monthsOfExpenses < 3) reasons.push({ type: "con", text: `Emergency fund covers only ${ctx.monthsOfExpenses.toFixed(1)} months. Below 3-month minimum.` });

  const proCount = reasons.filter(r => r.type === "pro").length;
  const conCount = reasons.filter(r => r.type === "con").length;
  const score = Math.max(0, Math.min(100, 50 + (proCount - conCount) * 15));
  return { reasons, score, cooldownMet, priceDropped, priceDrop };
};

const WaitlistPage = () => {
  const [items, setItems] = useState<WaitlistItem[]>(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState(categoryOptions[0]);
  const [formCooldown, setFormCooldown] = useState("7");
  const [formNotes, setFormNotes] = useState("");

  const ctx = financialContext;
  const waitingItems = items.filter(i => i.status === "waiting");
  const totalWaiting = waitingItems.reduce((s, i) => s + i.price, 0);
  const savedByRejecting = items.filter(i => i.status === "rejected").reduce((s, i) => s + i.price, 0);

  const addItem = () => {
    const price = parseInt(formPrice);
    if (!formName || !price) return;
    setItems(prev => [...prev, { id: `pw${Date.now()}`, name: formName, price, category: formCategory, url: "", addedDate: "2026-03-08", cooldownDays: parseInt(formCooldown) || 7, notes: formNotes, status: "waiting", priceHistory: [{ date: "2026-03-08", price }] }]);
    setShowForm(false); setFormName(""); setFormPrice(""); setFormNotes("");
  };
  const updateStatus = (id: string, status: "approved" | "rejected") => setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-5 gap-3">
        {[
          { label: "Monthly Surplus", value: fmt(ctx.monthlySurplus), accent: "text-emerald-600 dark:text-emerald-400" },
          { label: "Shopping Left", value: fmt(ctx.shoppingRemaining), accent: ctx.shoppingRemaining < 5000 ? "text-rose-500" : "text-primary" },
          { label: "Total Debt", value: fmt(ctx.totalDebt), accent: ctx.totalDebt > 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400" },
          { label: "Emergency", value: `${ctx.monthsOfExpenses.toFixed(1)}mo`, accent: ctx.monthsOfExpenses < 3 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400" },
          { label: "Savings Rate", value: `${ctx.savingsRate}%`, accent: ctx.savingsRate >= 30 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-card border border-border shadow-sm rounded-lg p-3">
            <div className="relative z-10">
              <div className="text-xs text-muted-foreground mb-0.5">{card.label}</div>
              <div className={`text-sm font-semibold ${card.accent}`}>{card.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Items Waiting", value: String(waitingItems.length), sub: `${fmt(totalWaiting)} total value`, accent: "text-amber-600 dark:text-amber-400" },
          { label: "Saved by Saying No", value: fmt(savedByRejecting), sub: `${items.filter(i => i.status === "rejected").length} items rejected`, accent: "text-emerald-600 dark:text-emerald-400" },
          { label: "Impulse Score", value: `${Math.max(0, 100 - waitingItems.length * 12)}%`, sub: "self-control rating", accent: waitingItems.length <= 3 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
            className="bg-card border border-border shadow-sm rounded-lg p-4">
            <div className="relative z-10">
              <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
              <div className={`text-lg font-semibold ${card.accent}`}>{card.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-md text-xs flex items-center gap-1.5 px-3 py-1.5">
          <Plus className="w-3 h-3" /> Add to Waitlist
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border shadow-sm rounded-lg p-5">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">New Waitlist Item</h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Item Name</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Sony WH-1000XM5" className="w-full h-8 rounded-md bg-card border border-border shadow-sm px-2 text-xs text-foreground bg-transparent focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Price (₹)</label>
                  <input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="24990" className="w-full h-8 rounded-md bg-card border border-border shadow-sm px-2 text-xs text-foreground bg-transparent focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Category</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full h-8 rounded-md bg-card border border-border shadow-sm px-2 text-xs text-foreground bg-transparent focus:outline-none">
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Cooldown (Days)</label>
                  <input type="number" value={formCooldown} onChange={e => setFormCooldown(e.target.value)} placeholder="7" className="w-full h-8 rounded-md bg-card border border-border shadow-sm px-2 text-xs text-foreground bg-transparent focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Why do you want this? (Be honest)</label>
                <input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Justification..." className="w-full h-8 rounded-md bg-card border border-border shadow-sm px-2 text-xs text-foreground bg-transparent focus:outline-none" />
              </div>
              <button onClick={addItem} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-md text-xs flex items-center gap-1.5 px-3 py-1.5">
                <Timer className="w-3 h-3" /> Start Cooldown
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {items.map((item, i) => {
          const verdict = generateVerdict(item);
          const isExpanded = expandedId === item.id;
          const waited = daysSince(item.addedDate);
          const lowestPrice = Math.min(...item.priceHistory.map(p => p.price));
          const highestPrice = Math.max(...item.priceHistory.map(p => p.price));
          const atLowest = item.price <= lowestPrice;
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
              className={`bg-card border border-border shadow-sm rounded-lg overflow-hidden ${item.status === "rejected" ? "opacity-50" : ""}`}>
              <div className="relative z-10">
                <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors text-left">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center shrink-0 ${item.status === "approved" ? "border-emerald-500/30" : item.status === "rejected" ? "border-destructive/30" : ""}`}>
                      {item.status === "approved" ? <ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : item.status === "rejected" ? <ThumbsDown className="w-4 h-4 text-rose-500" /> : <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-foreground">{item.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">{item.category}</span>
                        {item.status === "waiting" && !verdict.cooldownMet && <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><Timer className="w-2.5 h-2.5" /> {item.cooldownDays - waited}d left</span>}
                        {verdict.cooldownMet && item.status === "waiting" && <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">READY</span>}
                        {atLowest && <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-0.5"><TrendingDown className="w-2.5 h-2.5" /> LOWEST</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">Added {waited} days ago • {item.notes}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-primary flex items-center gap-0.5 justify-end"><IndianRupee className="w-3 h-3" />{item.price.toLocaleString("en-IN")}</div>
                      <div className={`text-xs ${verdict.score >= 60 ? "text-emerald-600 dark:text-emerald-400" : verdict.score >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-500"}`}>Score: {verdict.score}/100</div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
                      <div className="p-4 space-y-4">
                        <div className="grid sm:grid-cols-4 gap-3">
                          {[
                            { label: "% of Income", value: `${(item.price / ctx.monthlyIncome * 100).toFixed(1)}%`, accent: item.price / ctx.monthlyIncome < 0.05 ? "text-emerald-600 dark:text-emerald-400" : item.price / ctx.monthlyIncome < 0.15 ? "text-amber-600 dark:text-amber-400" : "text-rose-500" },
                            { label: "% of Surplus", value: `${(item.price / ctx.monthlySurplus * 100).toFixed(0)}%`, accent: item.price / ctx.monthlySurplus < 0.3 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500" },
                            { label: "Days to Save", value: String(Math.ceil(item.price / (ctx.monthlySurplus / 30))), accent: "text-primary" },
                            { label: "EMI (6mo)", value: fmt(Math.round(item.price * 1.12 / 6)), accent: "text-amber-600 dark:text-amber-400" },
                          ].map(m => (
                            <div key={m.label} className="bg-muted/50 rounded-lg p-2.5 border border-border">
                              <div className="text-xs text-muted-foreground mb-0.5">{m.label}</div>
                              <div className={`text-sm font-semibold ${m.accent}`}>{m.value}</div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 border border-border">
                          <div className="flex items-center gap-1.5 mb-2"><Tag className="w-3 h-3 text-primary" /><span className="text-sm font-medium text-foreground">Price History</span></div>
                          <div className="flex items-end gap-1 h-12">
                            {item.priceHistory.map((p, pi) => {
                              const range = highestPrice - lowestPrice || 1;
                              const h = Math.max(15, ((p.price - lowestPrice) / range) * 100);
                              return (
                                <div key={pi} className="flex-1 flex flex-col items-center gap-0.5">
                                  <span className="text-xs text-muted-foreground">{fmt(p.price)}</span>
                                  <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.1 + pi * 0.05 }}
                                    className="w-full rounded-md min-h-[4px]"
                                    style={{ background: pi === item.priceHistory.length - 1 ? "hsl(175 100% 50%)" : "hsl(220 20% 25%)", boxShadow: pi === item.priceHistory.length - 1 ? "0 0 6px hsl(175 100% 50% / 0.4)" : "none" }} />
                                  <span className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                                </div>
                              );
                            })}
                          </div>
                          {verdict.priceDropped && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1"><TrendingDown className="w-2.5 h-2.5" /> Price dropped {verdict.priceDrop}% since tracking</div>}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 border border-[hsl(var(--primary))]/20">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="text-sm font-medium text-primary">Purchase Verdict</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md ml-auto uppercase ${verdict.score >= 60 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : verdict.score >= 40 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-destructive/10 text-rose-500"}`}>
                              {verdict.score >= 60 ? "LIKELY SAFE" : verdict.score >= 40 ? "CAUTION" : "NOT RECOMMENDED"}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {verdict.reasons.map((r, ri) => (
                              <div key={ri} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                                <span className={`shrink-0 mt-0.5 ${r.type === "pro" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>{r.type === "pro" ? "✓" : "✗"}</span>{r.text}
                              </div>
                            ))}
                          </div>
                        </div>
                        {ctx.totalDebt > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3 border border-destructive/20">
                            <div className="flex items-start gap-2">
                              <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                              <div>
                                <div className="text-xs font-bold text-destructive mb-1">DEBT WARNING</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">You have {fmt(ctx.totalDebt)} in credit card debt. Purchasing this item adds {fmt(item.price)} to potential debt. Interest at 3.5%/month means this {fmt(item.price)} item would cost {fmt(Math.round(item.price * 1.42))} if paid via revolving credit over 12 months.</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {item.status === "waiting" && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateStatus(item.id, "approved")} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-md text-xs flex items-center gap-1 px-3 py-1.5" disabled={!verdict.cooldownMet}>
                              <Check className="w-3 h-3" /> {verdict.cooldownMet ? "Approve Purchase" : `Wait ${item.cooldownDays - waited}d`}
                            </button>
                            <button onClick={() => updateStatus(item.id, "rejected")} className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-1">
                              <ThumbsDown className="w-3 h-3" /> I Don't Need This
                            </button>
                            <button onClick={() => removeItem(item.id)} className="text-xs px-2 py-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors ml-auto"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        )}
                        {item.status !== "waiting" && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${item.status === "approved" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                              {item.status === "approved" ? "✓ PURCHASE APPROVED" : "✗ REJECTED — SAVED " + fmt(item.price)}
                            </span>
                            <button onClick={() => removeItem(item.id)} className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-destructive transition-colors ml-auto"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default WaitlistPage;
