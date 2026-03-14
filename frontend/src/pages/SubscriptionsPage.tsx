import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, XCircle, AlertTriangle, Calendar, IndianRupee, CreditCard, Users, Clock, ToggleRight, Tag } from "lucide-react";
import { mockSubscriptions, fmt, daysUntil, type Subscription } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const SubscriptionsPage = () => {
  const [subs, setSubs] = useState<Subscription[]>(mockSubscriptions);
  const [filter, setFilter] = useState<"all" | "active" | "cancelled">("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const activeSubs = subs.filter((s) => s.status === "active");
  const monthlyCost = activeSubs.reduce((sum, s) => sum + (s.cycle === "monthly" ? s.cost : Math.round(s.cost / 12)), 0);
  const yearlyCost = monthlyCost * 12;
  const upcomingCount = activeSubs.filter((s) => daysUntil(s.renewDate) <= 7).length;

  const filtered = subs.filter((s) => filter === "all" || s.status === filter);

  const cancelSub = (id: string) => {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: "cancelled" as const } : s)));
    setConfirmId(null);
  };

  const reactivate = (id: string) => {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: "active" as const } : s)));
  };

  const monthsSince = (dateStr?: string) => {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Monthly Cost", value: fmt(monthlyCost), sub: `${activeSubs.length} active`, accent: "neon-text" },
          { label: "Yearly Projection", value: fmt(yearlyCost), sub: "estimated annual", accent: "text-[hsl(var(--neon-amber))]" },
          { label: "Renewing Soon", value: String(upcomingCount), sub: "within 7 days", accent: upcomingCount > 0 ? "neon-magenta" : "neon-green" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="terminal neon-border rounded-sm p-4 crt-overlay">
            <div className="relative z-10">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest mb-1">{card.label}</div>
              <div className={`text-lg font-display font-bold ${card.accent}`}>{card.value}</div>
              <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "active", "cancelled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-all ${
              filter === f ? "neon-text neon-border border terminal" : "text-muted-foreground hover:text-foreground"
            }`}>
            {f} ({f === "all" ? subs.length : subs.filter((s) => s.status === f).length})
          </button>
        ))}
      </div>

      {/* Subscription list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((sub, i) => {
            const days = daysUntil(sub.renewDate);
            const isSoon = days <= 7 && days > 0 && sub.status === "active";
            const monthlized = sub.cycle === "yearly" ? Math.round(sub.cost / 12) : sub.cost;

            return (
              <motion.div key={sub.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedSub(sub)}
                className={`terminal neon-border rounded-sm p-4 crt-overlay group cursor-pointer hover:border-primary/40 transition-colors ${sub.status === "cancelled" ? "opacity-60" : ""}`}>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-sm terminal neon-border flex items-center justify-center text-lg shrink-0"
                      style={{ borderColor: sub.color.replace(")", " / 0.3)") }}>
                      {sub.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-foreground">{sub.name}</span>
                        {sub.status === "cancelled" && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive">CANCELLED</span>
                        )}
                        {isSoon && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm bg-[hsl(var(--neon-amber))]/10 text-[hsl(var(--neon-amber))] flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> SOON
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[9px] text-muted-foreground font-mono">{sub.category}</span>
                        <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {sub.status === "active"
                            ? `Renews ${new Date(sub.renewDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} (${days}d)`
                            : "—"
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[11px] font-mono font-bold neon-text flex items-center gap-0.5 justify-end">
                        <IndianRupee className="w-3 h-3" />{sub.cost.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[8px] text-muted-foreground font-mono">
                        {sub.cycle === "yearly" ? `~${fmt(monthlized)}/mo` : "/month"}
                      </div>
                    </div>

                    {sub.status === "active" ? (
                      confirmId === sub.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => cancelSub(sub.id)}
                            className="text-[9px] font-mono px-2 py-1 rounded-sm bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                            Confirm
                          </button>
                          <button onClick={() => setConfirmId(null)}
                            className="text-[9px] font-mono px-2 py-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors">
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmId(sub.id); }}
                          className="w-7 h-7 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); reactivate(sub.id); }}
                        className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-sm text-muted-foreground hover:neon-green hover:bg-[hsl(var(--neon-green))]/5 transition-colors">
                        <RefreshCw className="w-3 h-3" /> Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={(open) => !open && setSelectedSub(null)}>
        <DialogContent className="terminal neon-border sm:max-w-md p-0 overflow-hidden z-[100]">
          {selectedSub && (
            <div className="relative z-10">
              {/* Header */}
              <div className="p-5 pb-4 border-b border-border/50">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-sm terminal neon-border flex items-center justify-center text-2xl"
                      style={{ borderColor: selectedSub.color.replace(")", " / 0.4)") }}>
                      {selectedSub.icon}
                    </div>
                    <div>
                      <DialogTitle className="text-sm font-display font-bold uppercase tracking-wider text-foreground">
                        {selectedSub.name}
                      </DialogTitle>
                      <DialogDescription className="text-[9px] font-mono text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-sm border border-border/50 bg-muted/30">{selectedSub.category}</span>
                        <span className={`px-1.5 py-0.5 rounded-sm ${selectedSub.status === "active" ? "bg-[hsl(var(--neon-green))]/10 text-[hsl(var(--neon-green))]" : "bg-destructive/10 text-destructive"}`}>
                          {selectedSub.status.toUpperCase()}
                        </span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Description */}
              {selectedSub.description && (
                <div className="px-5 py-3 border-b border-border/50">
                  <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{selectedSub.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem icon={<IndianRupee className="w-3 h-3" />} label="Cost" value={`${fmt(selectedSub.cost)} / ${selectedSub.cycle === "monthly" ? "mo" : "yr"}`} accent />
                  {selectedSub.plan && (
                    <DetailItem icon={<Tag className="w-3 h-3" />} label="Plan" value={selectedSub.plan} />
                  )}
                  {selectedSub.paymentMethod && (
                    <DetailItem icon={<CreditCard className="w-3 h-3" />} label="Payment" value={selectedSub.paymentMethod} />
                  )}
                  <DetailItem icon={<Calendar className="w-3 h-3" />} label="Next Renewal"
                    value={selectedSub.status === "active"
                      ? `${new Date(selectedSub.renewDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} (${daysUntil(selectedSub.renewDate)}d)`
                      : "—"
                    }
                  />
                  {selectedSub.startDate && (
                    <DetailItem icon={<Clock className="w-3 h-3" />} label="Member Since"
                      value={`${new Date(selectedSub.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} (${monthsSince(selectedSub.startDate)} mo)`}
                    />
                  )}
                  {selectedSub.lastBilled && (
                    <DetailItem icon={<Calendar className="w-3 h-3" />} label="Last Billed"
                      value={new Date(selectedSub.lastBilled).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    />
                  )}
                  {selectedSub.totalSpent !== undefined && (
                    <DetailItem icon={<IndianRupee className="w-3 h-3" />} label="Total Spent" value={fmt(selectedSub.totalSpent)} accent />
                  )}
                  {selectedSub.sharedWith !== undefined && selectedSub.sharedWith > 0 && (
                    <DetailItem icon={<Users className="w-3 h-3" />} label="Shared With" value={`${selectedSub.sharedWith} ${selectedSub.sharedWith === 1 ? "person" : "people"}`} />
                  )}
                </div>

                {/* Auto-renew indicator */}
                {selectedSub.autoRenew !== undefined && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <ToggleRight className={`w-3.5 h-3.5 ${selectedSub.autoRenew ? "neon-text" : "text-muted-foreground"}`} />
                    <span className="text-[9px] font-mono text-muted-foreground">
                      Auto-renew: <span className={selectedSub.autoRenew ? "neon-text" : "text-destructive"}>{selectedSub.autoRenew ? "ON" : "OFF"}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailItem = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <div className="space-y-0.5">
    <div className="flex items-center gap-1 text-[8px] text-muted-foreground font-mono uppercase tracking-widest">
      {icon} {label}
    </div>
    <div className={`text-[10px] font-mono font-semibold ${accent ? "neon-text" : "text-foreground"} truncate`} title={value}>
      {value}
    </div>
  </div>
);

export default SubscriptionsPage;
