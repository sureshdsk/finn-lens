import { useQuery } from '@tanstack/react-query'
import { getSpendingSummaryApi } from '@/api/unified'
import { Skeleton } from '@/components/ui/skeleton'

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f97316',
  groceries: '#22c55e',
  clothing: '#ec4899',
  entertainment: '#a855f7',
  ecommerce: '#3b82f6',
  travel_transport: '#06b6d4',
  bills_utilities: '#eab308',
  healthcare: '#ef4444',
  education: '#6366f1',
  investment_finance: '#10b981',
  services_misc: '#64748b',
  transfers_payments: '#9ca3af',
  uncategorized: '#6b7280',
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  groceries: 'Groceries',
  clothing: 'Clothing',
  entertainment: 'Entertainment',
  ecommerce: 'E-commerce',
  travel_transport: 'Travel',
  bills_utilities: 'Bills',
  healthcare: 'Health',
  education: 'Education',
  investment_finance: 'Investment',
  services_misc: 'Services',
  transfers_payments: 'Transfers',
  uncategorized: 'Other',
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const SpendingBreakdown = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['spending-summary-overview'],
    queryFn: () => getSpendingSummaryApi({}),
  })

  const cats = data?.categories ?? []
  const total = cats.reduce((s, c) => s + Number(c.total), 0)

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-5">Breakdown</h3>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      ) : (
        <>
          {/* Donut */}
          <div className="flex justify-center mb-5">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {cats.reduce((acc, cat, i) => {
                  const pct = total > 0 ? (Number(cat.total) / total) * 100 : 0
                  const offset = cats.slice(0, i).reduce((s, c) => s + (total > 0 ? (Number(c.total) / total) * 100 : 0), 0)
                  const color = CATEGORY_COLORS[cat.category] ?? '#6b7280'
                  acc.push(
                    <circle key={cat.category} cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3.5"
                      strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-offset} />
                  )
                  return acc
                }, [] as React.ReactElement[])}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground tabular-nums privacy-mask">{fmt(total)}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2.5">
            {cats.filter(c => c.category !== 'transfers_payments').slice(0, 8).map((cat) => {
              const pct = total > 0 ? Math.round((Number(cat.total) / total) * 100) : 0
              const color = CATEGORY_COLORS[cat.category] ?? '#6b7280'
              return (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-foreground">
                      {CATEGORY_LABELS[cat.category] ?? cat.category}
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground tabular-nums privacy-mask">{fmt(Number(cat.total))}</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default SpendingBreakdown
