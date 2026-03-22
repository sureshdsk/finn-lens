import { TrendingUp, TrendingDown } from "lucide-react"
import { mockHoldings, fmt } from "@/data/mockData"

const holdings = mockHoldings.slice(0, 5)
const totalValue = holdings.reduce((s, h) => s + h.current, 0)
const totalInvested = holdings.reduce((s, h) => s + h.invested, 0)
const totalChange = ((totalValue - totalInvested) / totalInvested * 100).toFixed(1)

const InvestmentPanel = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">Portfolio</h3>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground tabular-nums">{fmt(totalValue)}</div>
          <div className={`text-xs tabular-nums ${Number(totalChange) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {Number(totalChange) >= 0 ? '+' : ''}{totalChange}%
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-0">
        {holdings.map((h) => (
          <div key={h.ticker} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
            <div>
              <div className="text-sm text-foreground">{h.name}</div>
              <div className="text-xs text-muted-foreground">{h.ticker} · {h.qty} shares</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground tabular-nums">{fmt(h.current)}</div>
              <div className={`text-xs tabular-nums flex items-center gap-0.5 justify-end ${h.dayChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                {h.dayChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {h.dayChange >= 0 ? "+" : ""}{h.dayChange}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default InvestmentPanel
