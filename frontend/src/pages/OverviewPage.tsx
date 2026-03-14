import OverviewCards from "@/components/overview/OverviewCards";
import SpendingChart from "@/components/overview/SpendingChart";
import SpendingBreakdown from "@/components/overview/SpendingBreakdown";
import RecentTransactions from "@/components/overview/RecentTransactions";
import BudgetTracker from "@/components/overview/BudgetTracker";
import QuickAlerts from "@/components/overview/QuickAlerts";
import InvestmentPanel from "@/components/overview/InvestmentPanel";

const OverviewPage = () => {
  return (
    <div className="space-y-5">
      <OverviewCards />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><SpendingChart /></div>
        <SpendingBreakdown />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><RecentTransactions /></div>
        <div className="space-y-5">
          <BudgetTracker />
          <QuickAlerts />
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <InvestmentPanel />
        <div className="terminal-glow rounded-sm p-5 crt-overlay">
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center py-8">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground mb-2">Financial Goals</h3>
            <p className="text-[10px] text-muted-foreground font-mono mb-5 max-w-xs">
              {'>'} Set savings targets, track progress, and stay on course with goal-lock friction.
            </p>
            <button className="retro-button-solid rounded-sm text-[10px]">Initialize Goal</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
