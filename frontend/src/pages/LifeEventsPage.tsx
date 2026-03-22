import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Car, Heart, Baby, GraduationCap,
  Lock, Unlock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Clock, Target, Sparkles, X,
} from "lucide-react";

interface Milestone {
  label: string;
  amount: number;
  done: boolean;
}

interface LifeEvent {
  id: string;
  title: string;
  icon: typeof Home;
  emoji: string;
  color: string;
  estimatedCost: number;
  savedSoFar: number;
  targetDate: string;
  monthlyRequired: number;
  locked: boolean;
  riskLevel: "low" | "medium" | "high";
  readiness: number; // 0-100
  milestones: Milestone[];
  pros: string[];
  cons: string[];
  aiInsight: string;
  frictionQuestion: string;
}

const lifeEvents: LifeEvent[] = [
  {
    id: "le-house", title: "Buy a House", icon: Home, emoji: "🏠",
    color: "hsl(175 100% 50%)", estimatedCost: 8000000, savedSoFar: 1200000,
    targetDate: "2028-06-01", monthlyRequired: 252000, locked: false,
    riskLevel: "high", readiness: 15,
    milestones: [
      { label: "Emergency fund (6 months)", amount: 500000, done: true },
      { label: "Down payment (20%)", amount: 1600000, done: false },
      { label: "Registration & stamp duty", amount: 480000, done: false },
      { label: "Home furnishing fund", amount: 300000, done: false },
      { label: "Loan pre-approval", amount: 0, done: false },
    ],
    pros: [
      "Build equity instead of paying rent (₹25K/mo saved long-term)",
      "Tax benefits on home loan (Section 24, 80C) up to ₹3.5L/yr",
      "Asset appreciation: avg 8-12% in metro areas",
      "Stability and security for family",
    ],
    cons: [
      "EMI ₹58,000/mo for 20yrs @ 8.5% on ₹64L loan — 24% of income",
      "Liquidity lock: ₹16L+ tied up in down payment",
      "Maintenance, property tax add ₹8-12K/month",
      "Career flexibility reduced — harder to relocate",
      "Market risk: property values can stagnate 5-7 years",
    ],
    aiInsight: "At your current savings rate, you'll hit the down payment target in ~14 months. However, your emergency fund will be depleted. Recommendation: delay by 6 months and build a parallel ₹3L buffer. Your debt-to-income ratio post-purchase will be 24% — within the healthy 28% limit but leaves thin margin.",
    frictionQuestion: "Have you accounted for a potential job change or income disruption in the next 2 years? Locking ₹16L in a down payment means you'll need 8+ months of expenses liquid.",
  },
  {
    id: "le-car", title: "Buy a Car", icon: Car, emoji: "🚗",
    color: "hsl(270 80% 65%)", estimatedCost: 1200000, savedSoFar: 350000,
    targetDate: "2026-12-01", monthlyRequired: 94444, locked: false,
    riskLevel: "medium", readiness: 29,
    milestones: [
      { label: "Research & shortlist models", amount: 0, done: true },
      { label: "Down payment (50%)", amount: 600000, done: false },
      { label: "Insurance (1st year)", amount: 45000, done: false },
      { label: "Accessories & registration", amount: 80000, done: false },
    ],
    pros: [
      "Eliminates ₹8-10K/mo commute costs (Uber/Metro)",
      "Time savings: avg 45min/day on commute",
      "Convenience for family travel and emergencies",
      "Resale value retains 50-60% after 5 years",
    ],
    cons: [
      "Depreciating asset — loses 15-20% value in year 1",
      "EMI ₹12,500/mo for 5yrs @ 9% on ₹6L loan",
      "Fuel + maintenance + insurance: ₹6-8K/month ongoing",
      "Parking costs in metro: ₹2-4K/month",
      "Total cost of ownership over 5 years: ₹18-20L (vs ₹12L purchase)",
    ],
    aiInsight: "Your current commute spend is ₹8.5K/month. A car would cost ₹18.5K/month (EMI + fuel + insurance + parking). Net additional cost: ₹10K/month. Consider if the convenience justifies a 117% increase in transport budget. Alternative: A ₹4L used car saves ₹8K/month.",
    frictionQuestion: "Will you still need this car if you switch to remote work or relocate closer to office? Your current lease ends in 8 months.",
  },
  {
    id: "le-wedding", title: "Get Married", icon: Heart, emoji: "💍",
    color: "hsl(320 100% 60%)", estimatedCost: 2500000, savedSoFar: 400000,
    targetDate: "2027-11-01", monthlyRequired: 105000, locked: true,
    riskLevel: "medium", readiness: 16,
    milestones: [
      { label: "Venue booking advance", amount: 200000, done: false },
      { label: "Wedding fund target", amount: 1500000, done: false },
      { label: "Honeymoon fund", amount: 300000, done: false },
      { label: "New home setup fund", amount: 500000, done: false },
    ],
    pros: [
      "Shared expenses reduce per-person living costs by 30-40%",
      "Combined income potential doubles household earnings",
      "Tax benefits for joint home loans and investments",
      "Insurance and financial planning becomes more efficient",
    ],
    cons: [
      "One-time cost of ₹25L significantly impacts savings trajectory",
      "Delays house purchase goal by ~8-10 months",
      "Lifestyle inflation post-marriage averages 20-30%",
      "Need to rebuild emergency fund post-wedding",
    ],
    aiInsight: "Wedding costs can be optimized. Average Indian wedding costs have risen 18% YoY. Consider phased spending: ₹15L ceremony + ₹5L reception + ₹3L honeymoon (delayed 3 months). This spreads cash flow better. Your joint savings rate post-marriage could increase to 45% if both incomes are managed well.",
    frictionQuestion: "Have you and your partner aligned on a wedding budget? 67% of couples exceed their planned budget by 30-50%. Set a hard ceiling now.",
  },
  {
    id: "le-baby", title: "Have a Child", icon: Baby, emoji: "👶",
    color: "hsl(40 100% 55%)", estimatedCost: 1500000, savedSoFar: 0,
    targetDate: "2029-01-01", monthlyRequired: 44118, locked: true,
    riskLevel: "high", readiness: 0,
    milestones: [
      { label: "Health insurance upgrade", amount: 15000, done: false },
      { label: "Delivery & hospital fund", amount: 300000, done: false },
      { label: "Baby essentials (first year)", amount: 200000, done: false },
      { label: "Childcare/nanny fund (1yr)", amount: 240000, done: false },
      { label: "Education fund kickstart", amount: 500000, done: false },
      { label: "Emergency buffer increase", amount: 200000, done: false },
    ],
    pros: [
      "Section 80C benefits for child education",
      "Starting education fund early: ₹5K/mo SIP grows to ₹35L in 18yrs",
      "Maternity/paternity leave benefits from employer",
      "Life insurance becomes more tax-efficient",
    ],
    cons: [
      "Monthly expenses increase by ₹15-25K (avg first 3 years)",
      "Career impact: potential 6-12 month reduced income period",
      "Childcare costs in metros: ₹15-20K/month",
      "Education costs rising 10-12% annually",
      "Need ₹1.5-2Cr for child's education (birth to graduation)",
    ],
    aiInsight: "Starting a ₹5,000/month SIP now for a child's education fund would grow to approximately ₹35L by age 18 (at 12% returns). Delaying by even 2 years reduces this to ₹27L. However, ensure your own retirement corpus is on track first — don't sacrifice your future for your child's education when education loans exist but retirement loans don't.",
    frictionQuestion: "Is your term insurance coverage at least 10x annual income? Having a child without adequate life cover is the #1 financial risk for young families.",
  },
  {
    id: "le-education", title: "Higher Education", icon: GraduationCap, emoji: "🎓",
    color: "hsl(200 90% 55%)", estimatedCost: 3000000, savedSoFar: 180000,
    targetDate: "2027-08-01", monthlyRequired: 164706, locked: true,
    riskLevel: "medium", readiness: 6,
    milestones: [
      { label: "Entrance exam prep & fees", amount: 50000, done: true },
      { label: "Application fees (5-8 colleges)", amount: 80000, done: false },
      { label: "First year tuition", amount: 1200000, done: false },
      { label: "Living expenses fund (2yrs)", amount: 600000, done: false },
      { label: "Opportunity cost buffer", amount: 500000, done: false },
    ],
    pros: [
      "MBA/MS holders earn 60-150% more within 5 years",
      "Network and career pivot opportunity",
      "Education loan interest: Section 80E deduction (no limit)",
      "ROI typically recovers cost in 3-5 years post-graduation",
    ],
    cons: [
      "2-year income gap: opportunity cost of ₹48-60L",
      "Education loan EMI: ₹35-40K/mo for 7 years",
      "No guarantee of proportional salary increase",
      "Savings and investment momentum disrupted",
    ],
    aiInsight: "Total cost including opportunity cost: ~₹78L. Expected salary uplift: ₹15-20L/year. Break-even in 4-5 years. Consider part-time/executive programs that let you keep earning (cost: ₹18-22L, no opportunity cost). Your current career trajectory suggests a 12% annual raise — higher education accelerates this to 25-30% but with a 2-year gap.",
    frictionQuestion: "Have you spoken to at least 5 alumni from your target program about actual placement outcomes? Published placement stats are often inflated by 20-30%.",
  },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const riskColors = { low: "text-emerald-600 dark:text-emerald-400", medium: "text-[hsl(var(--text-amber-600 dark:text-amber-400))]", high: "text-rose-500" };

const LifeEventsPage = () => {
  const [events, setEvents] = useState(lifeEvents);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unlockConfirm, setUnlockConfirm] = useState<string | null>(null);
  const [frictionShown, setFrictionShown] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  const unlockEvent = (id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, locked: false } : e)));
    setUnlockConfirm(null);
    setFrictionShown((prev) => ({ ...prev, [id]: true }));
  };

  const totalPlanned = events.filter((e) => !e.locked).reduce((s, e) => s + e.estimatedCost, 0);
  const totalSaved = events.filter((e) => !e.locked).reduce((s, e) => s + e.savedSoFar, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Active Goals", value: String(events.filter((e) => !e.locked).length), sub: `of ${events.length} life events`, accent: "text-primary" },
          { label: "Total Planned Cost", value: fmt(totalPlanned), sub: "for unlocked goals", accent: "text-[hsl(var(--text-amber-600 dark:text-amber-400))]" },
          { label: "Total Saved", value: fmt(totalSaved), sub: `${totalPlanned > 0 ? Math.round((totalSaved / totalPlanned) * 100) : 0}% funded`, accent: "text-emerald-600 dark:text-emerald-400" },
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

      {/* Event cards */}
      <div className="space-y-4">
        {events.map((event, i) => {
          const isExpanded = expandedId === event.id;
          const pct = Math.min((event.savedSoFar / event.estimatedCost) * 100, 100);
          const doneCount = event.milestones.filter((m) => m.done).length;

          return (
            <motion.div key={event.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
              className={`bg-card border border-border shadow-sm rounded-sm overflow-hidden ${event.locked ? "opacity-75" : ""}`}>
              <div className="relative z-10">
                {/* Card header */}
                <button onClick={() => !event.locked ? toggleExpand(event.id) : setUnlockConfirm(event.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center text-xl"
                      style={{ borderColor: event.color.replace(")", " / 0.3)") }}>
                      {event.locked ? <Lock className="w-4 h-4 text-muted-foreground" /> : event.emoji}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">{event.title}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-sm bg-card border border-border shadow-sm ${riskColors[event.riskLevel]}`}>
                          {event.riskLevel.toUpperCase()} RISK
                        </span>
                        {event.locked && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground flex items-center gap-0.5">
                            <Lock className="w-2 h-2" /> LOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        {fmt(event.estimatedCost)} • Target: {new Date(event.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                        {!event.locked && ` • ${doneCount}/${event.milestones.length} milestones`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!event.locked && (
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-primary">{pct.toFixed(0)}%</div>
                        <div className="text-[8px] text-muted-foreground">funded</div>
                      </div>
                    )}
                    {!event.locked && (isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />)}
                  </div>
                </button>

                {/* Progress bar */}
                {!event.locked && (
                  <div className="px-4 pb-2">
                    <div className="bg-muted/50 rounded-sm h-1.5 overflow-hidden">
                      <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                        className="h-full rounded-sm"
                        style={{ background: event.color, boxShadow: `0 0 6px ${event.color.replace(")", " / 0.4)")}` }} />
                    </div>
                  </div>
                )}

                {/* Unlock confirmation */}
                <AnimatePresence>
                  {unlockConfirm === event.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-[hsl(var(--text-amber-600 dark:text-amber-400))] shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] font-bold text-foreground mb-1">Goal-Lock Friction Check</div>
                            <p className="text-[9px] text-muted-foreground leading-relaxed">{event.frictionQuestion}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => unlockEvent(event.id)}
                            className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[9px] flex items-center gap-1 px-3 py-1.5">
                            <Unlock className="w-3 h-3" /> Yes, I've considered this
                          </button>
                          <button onClick={() => setUnlockConfirm(null)}
                            className="text-[9px] px-3 py-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors">
                            Not yet
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && !event.locked && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }} className="overflow-hidden border-t border-border">
                      <div className="p-4 space-y-4">
                        {/* Friction warning if just unlocked */}
                        {frictionShown[event.id] && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="bg-muted/50 rounded-sm p-3 border border-[hsl(var(--text-amber-600 dark:text-amber-400))]/30">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--text-amber-600 dark:text-amber-400))] shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[9px] font-bold text-[hsl(var(--text-amber-600 dark:text-amber-400))] mb-1">FRICTION CHECKPOINT</div>
                                <p className="text-[9px] text-muted-foreground leading-relaxed">{event.frictionQuestion}</p>
                              </div>
                              <button onClick={() => setFrictionShown((p) => ({ ...p, [event.id]: false }))} className="text-muted-foreground hover:text-foreground shrink-0">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {/* Key metrics */}
                        <div className="grid sm:grid-cols-4 gap-3">
                          {[
                            { label: "Saved", value: fmt(event.savedSoFar), icon: Target, accent: "text-emerald-600 dark:text-emerald-400" },
                            { label: "Remaining", value: fmt(event.estimatedCost - event.savedSoFar), icon: TrendingDown, accent: "text-rose-500" },
                            { label: "Monthly Needed", value: fmt(event.monthlyRequired), icon: TrendingUp, accent: "text-[hsl(var(--text-amber-600 dark:text-amber-400))]" },
                            { label: "Readiness", value: `${event.readiness}%`, icon: Sparkles, accent: "text-primary" },
                          ].map((m) => (
                            <div key={m.label} className="bg-muted/50 rounded-sm p-2.5 border border-border">
                              <div className="text-[8px] text-muted-foreground uppercase tracking-widest mb-0.5">{m.label}</div>
                              <div className={`text-[11px] font-semibold ${m.accent} flex items-center gap-1`}>
                                <m.icon className="w-3 h-3" /> {m.value}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Milestones */}
                        <div>
                          <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-primary" /> Milestones
                          </div>
                          <div className="space-y-1.5">
                            {event.milestones.map((m, mi) => (
                              <div key={mi} className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-secondary/20">
                                <div className="flex items-center gap-2">
                                  {m.done ? <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <div className="w-3 h-3 rounded-full border border-muted-foreground" />}
                                  <span className={`text-[9px] ${m.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.label}</span>
                                </div>
                                {m.amount > 0 && <span className="text-[9px] text-muted-foreground">{fmt(m.amount)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Pros & Cons */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="bg-muted/50 rounded-sm p-3 border border-[hsl(var(--text-emerald-600 dark:text-emerald-400))]/20">
                            <div className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">✓ Pros</div>
                            <div className="space-y-1.5">
                              {event.pros.map((p, pi) => (
                                <div key={pi} className="text-[9px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                                  <span className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">+</span> {p}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-muted/50 rounded-sm p-3 border border-destructive/20">
                            <div className="text-[9px] font-semibold uppercase tracking-wider text-rose-500 mb-2">✗ Cons</div>
                            <div className="space-y-1.5">
                              {event.cons.map((c, ci) => (
                                <div key={ci} className="text-[9px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                                  <span className="text-rose-500 shrink-0 mt-0.5">−</span> {c}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* AI Insight */}
                        <div className="bg-muted/50 rounded-sm p-3 border border-[hsl(var(--primary))]/20">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">AI Analysis</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground leading-relaxed">{event.aiInsight}</p>
                        </div>
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

export default LifeEventsPage;
