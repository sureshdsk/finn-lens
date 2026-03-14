import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, CreditCard, ArrowUpRight, ArrowDownLeft, AlertTriangle } from "lucide-react";
import { mockCreditCards, mockTransactions, fmt, daysUntil } from "@/data/mockData";

const chargeTypeStyles: Record<string, { label: string; accent: string }> = {
  fee: { label: "FEE", accent: "text-[hsl(var(--neon-amber))]" },
  interest: { label: "INT", accent: "neon-magenta" },
  penalty: { label: "PEN", accent: "text-destructive" },
  surcharge: { label: "SUR", accent: "text-[hsl(var(--neon-amber))]" },
};

const CreditCardsPage = () => {
  const [selectedCard, setSelectedCard] = useState(mockCreditCards[0].id);
  const [showDetails, setShowDetails] = useState(false);

  const card = mockCreditCards.find((c) => c.id === selectedCard)!;
  const utilPct = (card.outstanding / card.limit) * 100;
  const days = daysUntil(card.dueDate);

  const cardTxns = mockTransactions
    .filter((t) => t.accountId === selectedCard)
    .slice(0, 8);

  const totalOutstanding = mockCreditCards.reduce((s, c) => s + c.outstanding, 0);
  const totalLimit = mockCreditCards.reduce((s, c) => s + c.limit, 0);
  const totalRewards = mockCreditCards.reduce((s, c) => s + c.rewardPoints, 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Total Outstanding", value: fmt(totalOutstanding), accent: "neon-magenta" },
          { label: "Total Credit Limit", value: fmt(totalLimit), accent: "neon-text" },
          { label: "Reward Points", value: totalRewards.toLocaleString("en-IN"), accent: "neon-green" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="terminal neon-border rounded-sm p-4 crt-overlay">
            <div className="relative z-10">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-lg font-display font-bold ${s.accent}`}>{s.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Card selector */}
      <div className="flex gap-3">
        {mockCreditCards.map((c) => (
          <button key={c.id} onClick={() => setSelectedCard(c.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-all ${
              selectedCard === c.id ? "neon-text neon-border border terminal" : "text-muted-foreground hover:text-foreground"
            }`}>
            <CreditCard className="w-3 h-3" /> {c.name}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Card visual */}
        <motion.div key={card.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-2">
          <div className="rounded-sm p-5 aspect-[1.6/1] flex flex-col justify-between border border-border relative overflow-hidden"
            style={{ background: card.gradient }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)" }} />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-foreground/60">{card.bank}</div>
                <div className="text-[11px] font-display font-bold text-foreground mt-0.5">{card.name}</div>
              </div>
              <button onClick={() => setShowDetails(!showDetails)} className="text-foreground/50 hover:text-foreground transition-colors">
                {showDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="relative z-10">
              <div className="text-sm font-mono tracking-[0.15em] text-foreground mb-3">
                {showDetails ? card.number.replace(/••••/g, "1234") : card.number}
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[8px] font-mono uppercase text-foreground/40">Exp</div>
                  <div className="text-[10px] font-mono text-foreground">{card.expiry}</div>
                </div>
                <div>
                  <div className="text-[8px] font-mono uppercase text-foreground/40">CVV</div>
                  <div className="text-[10px] font-mono text-foreground">{showDetails ? "482" : "•••"}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card details */}
        <div className="lg:col-span-3 space-y-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="terminal neon-border rounded-sm p-4 crt-overlay">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">Credit Utilization</span>
                <span className={`text-[10px] font-mono font-bold ${utilPct > 75 ? "neon-magenta" : utilPct > 50 ? "text-[hsl(var(--neon-amber))]" : "neon-green"}`}>
                  {utilPct.toFixed(1)}%
                </span>
              </div>
              <div className="terminal rounded-sm h-2.5 overflow-hidden mb-2">
                <motion.div initial={{ width: 0 }} animate={{ width: `${utilPct}%` }} transition={{ duration: 0.6 }}
                  className="h-full rounded-sm"
                  style={{
                    background: `linear-gradient(90deg, ${card.color}, ${card.color})`,
                    boxShadow: `0 0 6px ${card.color.replace(")", " / 0.4)")}`,
                  }} />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                <span>{fmt(card.outstanding)} used</span>
                <span>{fmt(card.limit - card.outstanding)} available</span>
              </div>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "Due Date", value: new Date(card.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                sub: `${days} days left`, accent: days <= 5 ? "neon-magenta" : "neon-text" },
              { label: "Min Due", value: fmt(card.minDue), sub: "minimum payment", accent: "text-[hsl(var(--neon-amber))]" },
              { label: "Rewards", value: card.rewardPoints.toLocaleString("en-IN"), sub: "points earned", accent: "neon-green" },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                className="terminal neon-border rounded-sm p-3 crt-overlay">
                <div className="relative z-10">
                  <div className="text-[8px] text-muted-foreground font-mono uppercase tracking-widest mb-1">{item.label}</div>
                  <div className={`text-sm font-display font-bold ${item.accent}`}>{item.value}</div>
                  <div className="text-[8px] text-muted-foreground font-mono mt-0.5">{item.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden charges */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="terminal neon-border rounded-sm p-5 crt-overlay border-destructive/30">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground">Hidden Charges</h3>
            </div>
            <span className="text-[10px] font-mono font-bold neon-magenta">
              Total: {fmt(card.hiddenCharges.reduce((s, c) => s + c.amount, 0))}
            </span>
          </div>
          {card.hiddenCharges.length === 0 ? (
            <p className="text-[10px] text-muted-foreground font-mono text-center py-4">No hidden charges detected.</p>
          ) : (
            <div className="space-y-2">
              {card.hiddenCharges.map((charge, i) => {
                const style = chargeTypeStyles[charge.type];
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-sm terminal neon-border ${style.accent}`}>
                        {style.label}
                      </span>
                      <div>
                        <div className="text-[10px] font-mono text-foreground">{charge.label}</div>
                        <div className="text-[8px] text-muted-foreground font-mono">{charge.date}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold neon-magenta">-{fmt(charge.amount)}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Card transactions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="terminal neon-border rounded-sm p-5 crt-overlay">
        <div className="relative z-10">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-4">
            {'>'} Recent Card Transactions
          </h3>
          {cardTxns.length === 0 ? (
            <p className="text-[10px] text-muted-foreground font-mono text-center py-6">No transactions found for this card.</p>
          ) : (
            <div className="space-y-2">
              {cardTxns.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-sm flex items-center justify-center ${t.type === "credit" ? "bg-[hsl(var(--neon-green))]/10" : "bg-[hsl(var(--neon-magenta))]/10"}`}>
                      {t.type === "credit" ? <ArrowDownLeft className="w-3 h-3 neon-green" /> : <ArrowUpRight className="w-3 h-3 neon-magenta" />}
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-foreground">{t.label}</div>
                      <div className="text-[8px] text-muted-foreground font-mono">{t.category} • {t.date}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${t.type === "credit" ? "neon-green" : "neon-magenta"}`}>
                    {t.type === "credit" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CreditCardsPage;
