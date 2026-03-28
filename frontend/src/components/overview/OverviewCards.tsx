import { useQuery } from '@tanstack/react-query'
import { getSpendingSummaryApi } from '@/api/unified'
import { Wallet, TrendingUp, CreditCard } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function fmt(n: string | number) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const OverviewCards = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['spending-summary-overview'],
    queryFn: () => getSpendingSummaryApi({}),
  })

  const cards = [
    { label: 'Total Spending', value: data ? fmt(data.total_spending) : '—', icon: Wallet },
    { label: 'Total Income', value: data ? fmt(data.total_income) : '—', icon: TrendingUp },
    { label: 'Transactions', value: data?.transaction_count.toLocaleString() ?? '—', icon: CreditCard },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-card border border-border shadow-sm rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {card.label}
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <div className="text-base font-semibold text-primary">{card.value}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default OverviewCards
