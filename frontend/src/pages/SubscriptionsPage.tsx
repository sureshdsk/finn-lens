import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, XCircle, AlertTriangle, Calendar, IndianRupee, CreditCard, Users, Clock, ToggleRight, Tag, Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getSubscriptionsApi,
  updateSubscriptionApi,
  detectSubscriptionsApi,
  type Subscription,
} from "@/api/subscriptions";

const fmt = (n: number, currency = "INR") =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(Math.abs(n));

const daysUntil = (date: string | null) => {
  if (!date) return 999;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const SubscriptionsPage = () => {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "cancelled">("all");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const fetchSubs = useCallback(async () => {
    try {
      const data = await getSubscriptionsApi();
      setSubs(data.items);
    } catch {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const activeSubs = subs.filter((s) => s.status === "active");
  const monthlyCost = activeSubs.reduce((sum, s) => {
    const cost = parseFloat(s.cost);
    return sum + (s.cycle === "monthly" ? cost : Math.round(cost / 12));
  }, 0);
  const yearlyCost = monthlyCost * 12;
  const upcomingCount = activeSubs.filter((s) => {
    const d = daysUntil(s.renew_date);
    return d <= 7 && d > 0;
  }).length;

  const filtered = subs.filter((s) => filter === "all" || s.status === filter);

  const cancelSub = async (id: number) => {
    try {
      const updated = await updateSubscriptionApi(id, { status: "cancelled" });
      setSubs((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast.success("Subscription cancelled");
    } catch {
      toast.error("Failed to cancel subscription");
    }
    setConfirmId(null);
  };

  const reactivate = async (id: number) => {
    try {
      const updated = await updateSubscriptionApi(id, { status: "active" });
      setSubs((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast.success("Subscription reactivated");
    } catch {
      toast.error("Failed to reactivate subscription");
    }
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const result = await detectSubscriptionsApi();
      toast.success(`Detected ${result.detected} subscriptions, ${result.created} new, ${result.payments_linked} payments linked`);
      await fetchSubs();
    } catch {
      toast.error("Failed to detect subscriptions");
    } finally {
      setDetecting(false);
    }
  };

  const monthsSince = (dateStr?: string | null) => {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Monthly Cost", value: fmt(monthlyCost), sub: `${activeSubs.length} active`, accent: "text-primary" },
          { label: "Yearly Projection", value: fmt(yearlyCost), sub: "estimated annual", accent: "text-[hsl(var(--text-amber-600 dark:text-amber-400))]" },
          { label: "Renewing Soon", value: String(upcomingCount), sub: "within 7 days", accent: upcomingCount > 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400" },
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

      {/* Actions + Filter tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "active", "cancelled"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-sm text-[10px] uppercase tracking-wider transition-all ${
                filter === f ? "text-primary border-border border terminal" : "text-muted-foreground hover:text-foreground"
              }`}>
              {f} ({f === "all" ? subs.length : subs.filter((s) => s.status === f).length})
            </button>
          ))}
        </div>
        <button
          onClick={handleDetect}
          disabled={detecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] uppercase tracking-wider border-border border bg-muted/50 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
        >
          {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          Detect Subscriptions
        </button>
      </div>

      {/* Empty state */}
      {subs.length === 0 && (
        <div className="bg-card border border-border shadow-sm rounded-sm p-8 text-center">
          <div className="relative z-10">
            <div className="text-2xl mb-2">💳</div>
            <div className="text-[11px] text-muted-foreground mb-3">No subscriptions found yet</div>
            <button
              onClick={handleDetect}
              disabled={detecting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-[10px] uppercase tracking-wider border-border border bg-muted/50 text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
            >
              {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Detect from Transactions
            </button>
          </div>
        </div>
      )}

      {/* Subscription list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((sub, i) => {
            const days = daysUntil(sub.renew_date);
            const isSoon = days <= 7 && days > 0 && sub.status === "active";
            const cost = parseFloat(sub.cost);
            const monthlized = sub.cycle === "yearly" ? Math.round(cost / 12) : cost;

            return (
              <motion.div key={sub.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedSub(sub)}
                className={`bg-card border border-border shadow-sm rounded-sm p-4 group cursor-pointer hover:border-primary/40 transition-colors ${sub.status === "cancelled" ? "opacity-60" : ""}`}>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center text-lg shrink-0"
                      style={{ borderColor: sub.color ? sub.color.replace(")", " / 0.3)") : undefined }}>
                      {sub.icon || "💳"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-foreground">{sub.name}</span>
                        {sub.status === "cancelled" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive">CANCELLED</span>
                        )}
                        {isSoon && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-[hsl(var(--text-amber-600 dark:text-amber-400))]/10 text-[hsl(var(--text-amber-600 dark:text-amber-400))] flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> SOON
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[9px] text-muted-foreground">{sub.category}</span>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {sub.status === "active" && sub.renew_date
                            ? `Renews ${new Date(sub.renew_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} (${days}d)`
                            : "—"
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-primary flex items-center gap-0.5 justify-end">
                        {sub.currency === "USD" ? "$" : "₹"}{cost.toLocaleString(sub.currency === "USD" ? "en-US" : "en-IN")}
                      </div>
                      <div className="text-[8px] text-muted-foreground">
                        {sub.cycle === "yearly" ? `~${fmt(monthlized, sub.currency)}/mo` : "/month"}
                      </div>
                    </div>

                    {sub.status === "active" ? (
                      confirmId === sub.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => cancelSub(sub.id)}
                            className="text-[9px] px-2 py-1 rounded-sm bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                            Confirm
                          </button>
                          <button onClick={() => setConfirmId(null)}
                            className="text-[9px] px-2 py-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors">
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
                        className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-sm text-muted-foreground hover:text-emerald-600 dark:text-emerald-400 hover:bg-[hsl(var(--text-emerald-600 dark:text-emerald-400))]/5 transition-colors">
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
        <DialogContent className="bg-card border border-border shadow-sm sm:max-w-md p-0 overflow-hidden z-[100]">
          {selectedSub && (() => {
            const cost = parseFloat(selectedSub.cost);
            const totalSpent = selectedSub.total_spent ? parseFloat(selectedSub.total_spent) : undefined;
            return (
              <div className="relative z-10">
                {/* Header */}
                <div className="p-5 pb-4 border-b border-border/50">
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center text-2xl"
                        style={{ borderColor: selectedSub.color ? selectedSub.color.replace(")", " / 0.4)") : undefined }}>
                        {selectedSub.icon || "💳"}
                      </div>
                      <div>
                        <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-foreground">
                          {selectedSub.name}
                        </DialogTitle>
                        <DialogDescription className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded-sm border border-border/50 bg-muted/30">{selectedSub.category}</span>
                          <span className={`px-1.5 py-0.5 rounded-sm ${selectedSub.status === "active" ? "bg-[hsl(var(--text-emerald-600 dark:text-emerald-400))]/10 text-[hsl(var(--text-emerald-600 dark:text-emerald-400))]" : "bg-destructive/10 text-destructive"}`}>
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
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{selectedSub.description}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={<IndianRupee className="w-3 h-3" />} label="Cost" value={`${fmt(cost, selectedSub.currency)} / ${selectedSub.cycle === "monthly" ? "mo" : "yr"}`} accent />
                    {selectedSub.plan && (
                      <DetailItem icon={<Tag className="w-3 h-3" />} label="Plan" value={selectedSub.plan} />
                    )}
                    {selectedSub.payment_method && (
                      <DetailItem icon={<CreditCard className="w-3 h-3" />} label="Payment" value={selectedSub.payment_method} />
                    )}
                    <DetailItem icon={<Calendar className="w-3 h-3" />} label="Next Renewal"
                      value={selectedSub.status === "active" && selectedSub.renew_date
                        ? `${new Date(selectedSub.renew_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} (${daysUntil(selectedSub.renew_date)}d)`
                        : "—"
                      }
                    />
                    {selectedSub.start_date && (
                      <DetailItem icon={<Clock className="w-3 h-3" />} label="Member Since"
                        value={`${new Date(selectedSub.start_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} (${monthsSince(selectedSub.start_date)} mo)`}
                      />
                    )}
                    {selectedSub.last_billed && (
                      <DetailItem icon={<Calendar className="w-3 h-3" />} label="Last Billed"
                        value={new Date(selectedSub.last_billed).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      />
                    )}
                    {totalSpent !== undefined && (
                      <DetailItem icon={<IndianRupee className="w-3 h-3" />} label="Total Spent" value={fmt(totalSpent, selectedSub.currency)} accent />
                    )}
                    <DetailItem icon={<CreditCard className="w-3 h-3" />} label="Payments" value={`${selectedSub.payment_count} recorded`} />
                  </div>

                  {/* Auto-renew indicator */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <ToggleRight className={`w-3.5 h-3.5 ${selectedSub.auto_renew ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-[9px] text-muted-foreground">
                      Auto-renew: <span className={selectedSub.auto_renew ? "text-primary" : "text-destructive"}>{selectedSub.auto_renew ? "ON" : "OFF"}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailItem = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <div className="space-y-0.5">
    <div className="flex items-center gap-1 text-[8px] text-muted-foreground uppercase tracking-widest">
      {icon} {label}
    </div>
    <div className={`text-[10px] font-semibold ${accent ? "text-primary" : "text-foreground"} truncate`} title={value}>
      {value}
    </div>
  </div>
);

export default SubscriptionsPage;
