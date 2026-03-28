import { useQuery } from "@tanstack/react-query"
import { getInvestmentSummary } from "@/api/gmail"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useNavigate } from "react-router-dom"

function fmt(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const InvestmentPanel = () => {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['investment-summary-overview'],
    queryFn: getInvestmentSummary,
  })

  const holdings = data?.holdings?.slice(0, 5) ?? []
  const totalValue = data?.total_current ?? 0
  const totalPnlPct = data?.total_pnl_pct ?? 0

  return (
    <div className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">Portfolio</h3>
        <div className="text-right">
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <>
              <div className="text-sm font-semibold text-foreground tabular-nums">{fmt(totalValue)}</div>
              <div className={`text-xs tabular-nums ${totalPnlPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(1)}%
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-3">
          {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : holdings.length === 0 ? (
        <div className="mt-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">No investments tracked yet</p>
          <button onClick={() => navigate('/settings', { state: { tab: 'integrations' } })} className="text-xs text-primary hover:underline mt-1">
            Connect Gmail to import
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-0">
          {holdings.map((h) => (
            <div key={h.scheme_name} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
              <div className="min-w-0">
                <div className="text-sm text-foreground truncate">{h.scheme_name}</div>
                <div className="text-xs text-muted-foreground">{h.total_units.toFixed(2)} units</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium text-foreground tabular-nums">{fmt(h.current_value)}</div>
                <div className={`text-xs tabular-nums flex items-center gap-0.5 justify-end ${h.pnl_pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                  {h.pnl_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {h.pnl_pct >= 0 ? "+" : ""}{h.pnl_pct.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default InvestmentPanel
