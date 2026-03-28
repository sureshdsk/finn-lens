import { useQuery } from '@tanstack/react-query'
import { getSpendingSummaryApi } from '@/api/unified'
import { getCardsApi, getCardBillsApi } from '@/api/creditCards'
import { getSubscriptionsApi } from '@/api/subscriptions'
import { getInvestmentSummary } from '@/api/gmail'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, Wallet, TrendingUp, CreditCard as CreditCardIcon,
  Receipt, ArrowDownToLine, ChevronRight,
} from 'lucide-react'
import SpendingChart from '@/components/overview/SpendingChart'
import SpendingBreakdown from '@/components/overview/SpendingBreakdown'
import RecentTransactions from '@/components/overview/RecentTransactions'
import InvestmentPanel from '@/components/overview/InvestmentPanel'

function fmt(n: string | number) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function daysUntil(date: string | null) {
  if (!date) return 999
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// --- Stat Cards ---
function StatCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['spending-summary-overview'],
    queryFn: () => getSpendingSummaryApi({}),
  })

  const spending = Number(data?.total_spending ?? 0)
  const income = Number(data?.total_income ?? 0)
  const savingsRate = income > 0 ? Math.round(((income - spending) / income) * 100) : 0

  const cards = [
    { label: 'Income', value: data ? fmt(income) : '—', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Spending', value: data ? fmt(spending) : '—', icon: Wallet, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-950/30' },
    { label: 'Savings Rate', value: data ? `${savingsRate}%` : '—', icon: ArrowUpRight, color: savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400', bgColor: savingsRate >= 20 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Transactions', value: data?.transaction_count.toLocaleString() ?? '—', icon: Receipt, color: 'text-primary', bgColor: 'bg-primary/5' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-20 mb-1" />
          ) : (
            <div className="text-xl font-semibold tracking-tight text-foreground">{card.value}</div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
        </div>
      ))}
    </div>
  )
}

// --- Upcoming Timeline ---
function UpcomingTimeline() {
  const navigate = useNavigate()

  const { data: cards } = useQuery({
    queryKey: ['cards-overview'],
    queryFn: getCardsApi,
  })

  const { data: subs } = useQuery({
    queryKey: ['subscriptions-overview'],
    queryFn: () => getSubscriptionsApi({ status: 'active' }),
  })

  const { data: investmentData } = useQuery({
    queryKey: ['investment-summary-overview'],
    queryFn: getInvestmentSummary,
  })

  const cardIds = cards?.map(c => c.id) ?? []
  const billQueries = useQuery({
    queryKey: ['card-bills-overview', cardIds],
    queryFn: async () => {
      if (!cards?.length) return []
      const results = await Promise.all(
        cards.map(async (card) => {
          try {
            const bills = await getCardBillsApi(card.id)
            const unpaid = bills.filter(b => !b.is_paid && b.due_date)
            return unpaid.map(b => ({ card, bill: b }))
          } catch { return [] }
        })
      )
      return results.flat()
    },
    enabled: !!cards?.length,
  })

  const unpaidBills = (billQueries.data ?? [])
    .filter(({ bill }) => daysUntil(bill.due_date) <= 15)
    .sort((a, b) => daysUntil(a.bill.due_date) - daysUntil(b.bill.due_date))

  const upcomingSubs = (subs?.items ?? [])
    .filter(s => s.renew_date && daysUntil(s.renew_date) <= 10 && daysUntil(s.renew_date) >= 0)
    .sort((a, b) => daysUntil(a.renew_date) - daysUntil(b.renew_date))

  const upcomingSIPs = (investmentData?.upcoming_sips ?? [])
    .filter(s => s.due_date && daysUntil(s.due_date) >= 0)
    .sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date))
    .slice(0, 3)

  type TimelineItem = {
    id: string
    type: 'cc_bill' | 'subscription' | 'sip'
    label: string
    sublabel: string
    amount: string
    days: number
    icon: React.ReactNode
    urgent: boolean
    onClick: () => void
  }

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const fmtDate = (d: string) => {
    const dt = new Date(d)
    return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`
  }

  const items: TimelineItem[] = [
    ...unpaidBills.map(({ card, bill }) => {
      const days = daysUntil(bill.due_date)
      return {
        id: `bill-${bill.id}`,
        type: 'cc_bill' as const,
        label: card.card_name || `${card.issuer} ••${card.card_last4}`,
        sublabel: `Credit card bill · ${fmtDate(bill.due_date!)}`,
        amount: bill.total_due ? fmt(bill.total_due) : '—',
        days,
        icon: <CreditCardIcon className={`w-4 h-4 ${days <= 3 ? 'text-rose-500' : 'text-muted-foreground'}`} />,
        urgent: days <= 3,
        onClick: () => navigate(`/accounts/cards/${card.id}`),
      }
    }),
    ...upcomingSIPs.map((sip, i) => {
      const days = daysUntil(sip.due_date)
      return {
        id: `sip-${i}-${sip.scheme_name}`,
        type: 'sip' as const,
        label: sip.scheme_name,
        sublabel: `SIP debit · ${fmtDate(sip.due_date)}`,
        amount: sip.amount ? fmt(sip.amount) : '—',
        days,
        icon: <ArrowDownToLine className="w-4 h-4 text-primary" />,
        urgent: false,
        onClick: () => navigate('/investments'),
      }
    }),
    ...upcomingSubs.map(sub => {
      const days = daysUntil(sub.renew_date)
      return {
        id: `sub-${sub.id}`,
        type: 'subscription' as const,
        label: sub.name,
        sublabel: `${sub.cycle === 'monthly' ? 'Monthly' : 'Annual'} renewal · ${fmtDate(sub.renew_date!)}`,
        amount: fmt(sub.cost),
        days,
        icon: <span className="text-base leading-none">{sub.icon || '📄'}</span>,
        urgent: false,
        onClick: () => navigate('/subscriptions'),
      }
    }),
  ].sort((a, b) => a.days - b.days)

  if (items.length === 0) return null

  const totalUpcoming = items.reduce((s, i) => s + Number(i.amount.replace(/[₹,]/g, '')), 0)

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Next 15 days</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-foreground tabular-nums">{fmt(totalUpcoming)}</div>
          <p className="text-xs text-muted-foreground">total outflow</p>
        </div>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/50 group ${item.urgent ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.urgent ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-muted'}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.sublabel}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-medium text-foreground tabular-nums">{item.amount}</div>
              <div className={`text-xs tabular-nums ${item.urgent ? 'text-rose-500 font-medium' : 'text-muted-foreground'}`}>
                {item.days <= 0 ? 'Overdue' : item.days === 1 ? 'Tomorrow' : `${item.days} days`}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// --- Active Subscriptions Summary ---
function SubscriptionsSummary() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions-overview'],
    queryFn: () => getSubscriptionsApi({ status: 'active' }),
  })

  const activeSubs = data?.items ?? []
  const monthlyTotal = activeSubs
    .filter(s => s.cycle === 'monthly')
    .reduce((s, sub) => s + Number(sub.cost), 0)
  const yearlyTotal = activeSubs
    .filter(s => s.cycle === 'yearly')
    .reduce((s, sub) => s + Number(sub.cost), 0)
  const effectiveMonthly = monthlyTotal + (yearlyTotal / 12)

  return (
    <div className="bg-card border border-border rounded-lg p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Subscriptions</h3>
        <button onClick={() => navigate('/subscriptions')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : activeSubs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No active subscriptions</p>
      ) : (
        <>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-xl font-semibold text-foreground tabular-nums">{fmt(effectiveMonthly)}</span>
            <span className="text-xs text-muted-foreground">/month</span>
          </div>

          <div className="space-y-0">
            {activeSubs.slice(0, 5).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base leading-none shrink-0">{sub.icon || '📄'}</span>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{sub.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{sub.cycle}</div>
                  </div>
                </div>
                <span className="text-sm font-medium text-foreground tabular-nums shrink-0">{fmt(sub.cost)}</span>
              </div>
            ))}
          </div>

          {activeSubs.length > 5 && (
            <div className="mt-3 text-xs text-muted-foreground text-center">
              +{activeSubs.length - 5} more
            </div>
          )}
        </>
      )}
    </div>
  )
}

// --- Main Page ---
const OverviewPage = () => {
  return (
    <div className="space-y-5">
      <StatCards />
      <UpcomingTimeline />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><SpendingChart /></div>
        <SpendingBreakdown />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1"><InvestmentPanel /></div>
        <div className="lg:col-span-1"><RecentTransactions /></div>
        <div className="lg:col-span-1"><SubscriptionsSummary /></div>
      </div>
    </div>
  )
}

export default OverviewPage
