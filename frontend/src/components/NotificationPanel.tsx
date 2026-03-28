import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bell, AlertTriangle, CreditCard, ShoppingCart, TrendingUp,
  DollarSign, Clock, CheckCircle2, ChevronRight,
  Zap, Shield, Milestone, Maximize2, RefreshCw,
} from "lucide-react";

type NotifPriority = "critical" | "warning" | "info" | "success";
type NotifModule = "budgets" | "subscriptions" | "creditcards" | "investments" | "lifeevents" | "waitlist" | "transactions" | "system";

interface Notification {
  id: string;
  module: NotifModule;
  priority: NotifPriority;
  title: string;
  description: string;
  timestamp: string;
  actionLabel?: string;
  actionRoute?: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: "n1", module: "creditcards", priority: "critical", title: "Payment Due in 5 Days", description: "Platinum Card minimum due ₹4,235 by Mar 20. Late fee: ₹950.", timestamp: "2m ago", actionLabel: "View Card", actionRoute: "/credit-cards", read: false },
  { id: "n2", module: "budgets", priority: "critical", title: "Food Budget Exceeded", description: "Spent ₹22,000 of ₹20,000 budget. Over by ₹2,000 (110%).", timestamp: "1h ago", actionLabel: "View Budgets", actionRoute: "/budgets", read: false },
  { id: "n3", module: "subscriptions", priority: "warning", title: "3 Subscriptions Renewing Soon", description: "YouTube Premium (Mar 18), iCloud+ (Mar 12), ChatGPT Plus (Mar 22). Total: ₹2,018.", timestamp: "3h ago", actionLabel: "Review Subs", actionRoute: "/subscriptions", read: false },
  { id: "n4", module: "waitlist", priority: "warning", title: "Cooldown Expired: Sony WH-1000XM5", description: "16-day wait complete. Price at ₹24,990 (lowest tracked). Purchase verdict: 65/100.", timestamp: "5h ago", actionLabel: "Review Item", actionRoute: "/waitlist", read: false },
  { id: "n5", module: "creditcards", priority: "warning", title: "Hidden Charges Detected", description: "₹4,773 in fees/interest on Platinum Card this cycle. Annual fee + late penalty included.", timestamp: "6h ago", actionLabel: "View Charges", actionRoute: "/credit-cards", read: false },
  { id: "n6", module: "investments", priority: "warning", title: "HDFC Bank Below Avg Price", description: "Trading 4.9% below your avg. Averaging down opportunity — buy 15 shares at ₹1,540.", timestamp: "8h ago", actionLabel: "View Suggestion", actionRoute: "/investments", read: false },
  { id: "n7", module: "investments", priority: "info", title: "BTC-ETF Up 21.4%", description: "Consider booking partial profit. Sell 2 units to lock ₹1,800 gain.", timestamp: "10h ago", actionLabel: "View Holdings", actionRoute: "/investments", read: true },
  { id: "n8", module: "lifeevents", priority: "info", title: "House Goal: 14 Months to Down Payment", description: "At current savings rate, you'll reach ₹16L by May 2027. Build ₹3L buffer first.", timestamp: "12h ago", actionLabel: "View Goal", actionRoute: "/life-events", read: true },
  { id: "n9", module: "waitlist", priority: "info", title: "Price Drop: Nike Air Max 90", description: "Dropped from ₹11,495 to ₹10,995 (-4.3%). Item was rejected — saved ₹10,995.", timestamp: "1d ago", actionLabel: "View Waitlist", actionRoute: "/waitlist", read: true },
  { id: "n10", module: "transactions", priority: "info", title: "Salary Credited", description: "₹2,40,000 received in Primary Checking on Mar 1.", timestamp: "7d ago", read: true },
  { id: "n11", module: "system", priority: "success", title: "Emergency Fund Target Met", description: "You have 2.97 months of expenses saved. Close to the 3-month goal!", timestamp: "2d ago", read: true },
  { id: "n12", module: "budgets", priority: "success", title: "Transport Budget On Track", description: "Spent ₹8,500 of ₹12,000. 29% remaining with 23 days left.", timestamp: "3d ago", read: true },
];

const moduleIcons: Record<NotifModule, React.ComponentType<{ className?: string }>> = {
  budgets: DollarSign, subscriptions: RefreshCw, creditcards: CreditCard, investments: TrendingUp, lifeevents: Milestone, waitlist: ShoppingCart, transactions: Zap, system: Shield,
};
const moduleLabels: Record<NotifModule, string> = {
  budgets: "Budgets", subscriptions: "Subscriptions", creditcards: "Credit Cards", investments: "Investments", lifeevents: "Life Events", waitlist: "Waitlist", transactions: "Transactions", system: "System",
};
const priorityConfig: Record<NotifPriority, { color: string; border: string; bg: string; badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  critical: { color: "text-destructive", border: "border-destructive/40", bg: "bg-destructive/5", badge: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  warning: { color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400", icon: AlertTriangle },
  info: { color: "text-primary", border: "border-border", bg: "bg-transparent", badge: "bg-secondary text-muted-foreground", icon: Bell },
  success: { color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
};

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onExpand?: () => void;
  mode?: "panel" | "fullpage";
}

const NotificationCenter = ({ open, onClose, onNavigate, onExpand, mode = "panel" }: Props) => {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread" | NotifPriority>("all");
  const [moduleFilter, setModuleFilter] = useState<"all" | NotifModule>("all");

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.priority === "critical" && !n.read).length;
  const filtered = notifications.filter(n => {
    if (filter === "unread" && n.read) return false;
    if (filter !== "all" && filter !== "unread" && n.priority !== filter) return false;
    if (moduleFilter !== "all" && n.module !== moduleFilter) return false;
    return true;
  });
  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const handleAction = (n: Notification) => { markRead(n.id); if (n.actionRoute) { onNavigate(n.actionRoute); onClose(); } };

  const grouped = {
    critical: notifications.filter(n => n.priority === "critical" && !n.read).length,
    warning: notifications.filter(n => n.priority === "warning" && !n.read).length,
    info: notifications.filter(n => n.priority === "info" && !n.read).length,
    success: notifications.filter(n => n.priority === "success" && !n.read).length,
  };

  const renderHeader = () => (
    <div className={`${mode === "fullpage" ? "p-6 pb-4" : "p-4"} border-b border-border shrink-0`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center relative">
            <Bell className="w-4 h-4 text-primary" />
            {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center"><span className="text-[10px] font-bold text-white">{unreadCount}</span></div>}
          </div>
          <div>
            <h2 className={`${mode === "fullpage" ? "text-base" : "text-sm"} font-semibold text-foreground`}>Notifications</h2>
            <p className="text-xs text-muted-foreground">{unreadCount} unread · {notifications.length} total</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && <button onClick={markAllRead} className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/80 transition-all">Mark all read</button>}
          {mode === "panel" && onExpand && <button onClick={onExpand} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/80 transition-all" title="Expand to full page"><Maximize2 className="w-4 h-4" /></button>}
          {mode === "panel" && <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        {(["critical", "warning", "info", "success"] as NotifPriority[]).map(p => {
          const cfg = priorityConfig[p]; const count = grouped[p];
          return (<button key={p} onClick={() => setFilter(filter === p ? "all" : p)} className={`flex-1 rounded-lg py-2 px-2 bg-muted/50 border transition-all ${filter === p ? `${cfg.border} ${cfg.bg}` : "border-border hover:border-muted-foreground/30"}`}><div className={`text-sm font-semibold ${count > 0 ? cfg.color : "text-muted-foreground"}`}>{count}</div><div className="text-xs text-muted-foreground capitalize">{p}</div></button>);
        })}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilter(filter === "unread" ? "all" : "unread")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === "unread" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>Unread ({unreadCount})</button>
        <span className="text-border self-center">|</span>
        {(["all", "budgets", "creditcards", "subscriptions", "investments", "waitlist", "lifeevents"] as const).map(m => (
          <button key={m} onClick={() => setModuleFilter(moduleFilter === m ? "all" : m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${moduleFilter === m && m !== "all" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>{m === "all" ? "All" : moduleLabels[m as NotifModule]}</button>
        ))}
      </div>
    </div>
  );

  const renderNotifCard = (n: Notification, i: number) => {
    const cfg = priorityConfig[n.priority]; const PriorityIcon = cfg.icon; const ModIcon = moduleIcons[n.module];
    return (
      <motion.div key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60, scale: 0.95 }} transition={{ delay: i * 0.03 }}
        className={`rounded-lg border transition-all group ${cfg.border} ${!n.read ? cfg.bg : "bg-transparent opacity-60"}`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg bg-muted/50 border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}><PriorityIcon className={`w-3.5 h-3.5 ${cfg.color}`} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</span>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md ${cfg.badge} capitalize`}>{n.priority}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><ModIcon className="w-3 h-3" /> {moduleLabels[n.module]}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {n.timestamp}</span>
                  </div>
                </div>
                <button onClick={() => dismiss(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{n.description}</p>
              <div className="flex items-center gap-2 mt-3">
                {n.actionLabel && <button onClick={() => handleAction(n)} className="text-xs px-3 py-1.5 rounded-lg text-primary border border-border bg-muted/50 hover:bg-primary/5 transition-all flex items-center gap-1">{n.actionLabel} <ChevronRight className="w-3 h-3" /></button>}
                {!n.read && <button onClick={() => markRead(n.id)} className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">Mark read</button>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderNotifications = () => (
    <div className={`flex-1 overflow-y-auto ${mode === "fullpage" ? "p-6" : "p-4"} space-y-2`}>
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12"><CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-3 opacity-40" /><p className="text-sm text-muted-foreground">All clear. No notifications match this filter.</p></motion.div>
        ) : mode === "fullpage" ? (
          <div className="grid sm:grid-cols-2 gap-3">{filtered.map((n, i) => renderNotifCard(n, i))}</div>
        ) : filtered.map((n, i) => renderNotifCard(n, i))}
      </AnimatePresence>
    </div>
  );

  const renderFooter = () => (
    <div className={`${mode === "fullpage" ? "px-6 py-3" : "p-4"} border-t border-border shrink-0`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{criticalCount > 0 ? <span className="text-destructive font-semibold">{criticalCount} critical action{criticalCount > 1 ? "s" : ""} required</span> : "All systems nominal"}</div>
        <div className="text-xs text-muted-foreground">Showing {filtered.length} of {notifications.length}</div>
      </div>
    </div>
  );

  if (mode === "fullpage") {
    return <div className="flex flex-col min-h-[60vh]">{renderHeader()}{renderNotifications()}{renderFooter()}</div>;
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: "100%", opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border flex flex-col overflow-hidden">
            {renderHeader()}{renderNotifications()}{renderFooter()}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
