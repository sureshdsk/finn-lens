import { motion } from "framer-motion";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { quickAlerts } from "@/data/mockData";

const iconMap = { warning: AlertTriangle, info: Clock, success: CheckCircle2 };
const typeClass = { warning: "text-rose-500", info: "text-primary", success: "text-emerald-600 dark:text-emerald-400" };

const QuickAlerts = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
      className="bg-card border border-border shadow-sm rounded-lg p-5">
      <div className="relative z-10">
        <h3 className="text-base font-semibold text-foreground mb-4">Alerts</h3>
        <div className="space-y-2">
          {quickAlerts.slice(0, 4).map((a, i) => {
            const Icon = iconMap[a.type];
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="flex items-start gap-2.5 bg-card border border-border shadow-sm rounded-lg p-2.5">
                <Icon className={`w-3.5 h-3.5 mt-0.5 ${typeClass[a.type]}`} />
                <div className="flex-1">
                  <div className="text-xs text-foreground">{a.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default QuickAlerts;
