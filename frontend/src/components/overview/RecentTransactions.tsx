import { useQuery } from '@tanstack/react-query'
import { getUnifiedTransactionsApi } from '@/api/unified'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCardIcon, LandmarkIcon, ChevronRight } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmt(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const RecentTransactions = () => {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['recent-unified-transactions'],
    queryFn: () => getUnifiedTransactionsApi({
      page_size: 6,
      sort: '-transaction_date',
      exclude_transfers: true,
    }),
  })

  const txns = data?.items ?? []

  return (
    <div className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
        <button
          onClick={() => navigate('/transactions')}
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : txns.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-0">
          {txns.map((tx) => {
            const d = new Date(tx.transaction_date)
            const dateStr = `${d.getDate()} ${MONTHS[d.getMonth()]}`
            const amount = Number(tx.amount)
            const isCredit = amount < 0 || tx.instrument_type === 'bank_credit'
            const Icon = tx.instrument_type === 'credit_card' ? CreditCardIcon : LandmarkIcon

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">
                      {tx.merchant_name || tx.description.slice(0, 40)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dateStr} · {tx.credit_card_label || tx.bank_account_label || tx.instrument_type}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-medium tabular-nums shrink-0 privacy-mask ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                  {isCredit ? '+' : ''}{fmt(amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RecentTransactions
