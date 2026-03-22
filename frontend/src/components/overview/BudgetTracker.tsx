import { mockBudgets, CURRENT_MONTH } from "@/data/mockData"

const budgets = mockBudgets.slice(0, 5)

const BudgetTracker = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Budget</h3>
        <span className="text-xs text-muted-foreground">{CURRENT_MONTH}</span>
      </div>
      <div className="space-y-3.5">
        {budgets.map((b) => {
          const pct = Math.min((b.spent / b.budget) * 100, 100)
          const over = b.spent > b.budget
          return (
            <div key={b.category}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-foreground">{b.category}</span>
                <span className={`text-xs tabular-nums font-medium ${over ? "text-rose-500" : "text-muted-foreground"}`}>
                  {(b.spent / 1000).toFixed(0)}K / {(b.budget / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: over
                      ? 'linear-gradient(90deg, hsl(var(--accent)), hsl(var(--destructive)))'
                      : b.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BudgetTracker
