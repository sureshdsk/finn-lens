import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAccountsApi, getMonthlySummaryApi, type BankAccount } from '@/api/banking'
import { getCardsApi, getCardBillsApi, type CreditCard, type CreditCardBill } from '@/api/creditCards'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard as CreditCardIcon, Landmark, Plus, RefreshCw, ChevronRight } from 'lucide-react'
import { useSyncJob, useStartSync } from '@/hooks/useSync'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: string | number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}

const ISSUER_LABELS: Record<string, string> = {
  HDFC: 'HDFC Bank', ICICI: 'ICICI Bank', AXIS: 'Axis Bank', SBI: 'SBI Card',
  KOTAK: 'Kotak Mahindra', INDUSIND: 'IndusInd', RBL: 'RBL Bank', YES: 'Yes Bank',
  AMEX: 'Amex', CITI: 'Citibank', SC: 'Standard Chartered', HSBC: 'HSBC', OTHER: 'Other',
}

function daysUntil(date: string | null) {
  if (!date) return 999
  const diff = new Date(date).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

type Filter = 'all' | 'bank' | 'credit'

export default function AccountsPage() {
  const navigate = useNavigate()
  const { syncing } = useSyncJob()
  const { startSync } = useStartSync()
  const [filter, setFilter] = useState<Filter>('all')
  const year = new Date().getFullYear()

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['banking-accounts'],
    queryFn: getAccountsApi,
  })

  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: getCardsApi,
  })

  const { data: summary = [], isLoading: loadingSummary } = useQuery({
    queryKey: ['banking-summary', year],
    queryFn: () => getMonthlySummaryApi(year),
  })

  // Fetch unpaid bills for due indicators
  const cardIds = cards.map(c => c.id)
  const { data: cardBillsMap = {} } = useQuery({
    queryKey: ['card-bills-accounts', cardIds],
    queryFn: async () => {
      if (!cards.length) return {} as Record<number, CreditCardBill | null>
      const results = await Promise.all(
        cards.map(async (card) => {
          try {
            const bills = await getCardBillsApi(card.id)
            const unpaid = bills.find(b => !b.is_paid && b.due_date)
            return [card.id, unpaid ?? null] as const
          } catch { return [card.id, null] as const }
        })
      )
      return Object.fromEntries(results) as Record<number, CreditCardBill | null>
    },
    enabled: cards.length > 0,
  })

  const isLoading = loadingAccounts || loadingCards

  // Build unified list
  type AccountItem =
    | { type: 'bank'; data: BankAccount }
    | { type: 'credit'; data: CreditCard }

  const allItems: AccountItem[] = [
    ...accounts.map(a => ({ type: 'bank' as const, data: a })),
    ...cards.map(c => ({ type: 'credit' as const, data: c })),
  ]

  const filtered = filter === 'all' ? allItems : allItems.filter(i => i.type === filter)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {accounts.length} bank account{accounts.length !== 1 ? 's' : ''} · {cards.length} credit card{cards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startSync()}
            disabled={syncing}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button size="sm" onClick={() => navigate('/accounts/new')}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Account
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {([
          { key: 'all', label: 'All', count: allItems.length },
          { key: 'bank', label: 'Bank Accounts', count: accounts.length },
          { key: 'credit', label: 'Credit Cards', count: cards.length },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 ${filter === f.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Due status legend */}
      {cards.some(c => cardBillsMap[c.id]) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Overdue
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Due within 5 days
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Payment pending
          </div>
        </div>
      )}

      {/* Unified list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {filter === 'credit' ? <CreditCardIcon className="w-5 h-5 text-muted-foreground" /> : <Landmark className="w-5 h-5 text-muted-foreground" />}
          </div>
          <p className="font-medium">No {filter === 'credit' ? 'credit cards' : filter === 'bank' ? 'bank accounts' : 'accounts'} found</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {filter === 'credit'
              ? 'Sync your Gmail to discover credit cards from email statements'
              : 'Add a bank account to start tracking your finances'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {filtered.map((item) => {
            if (item.type === 'bank') {
              const acc = item.data
              return (
                <button
                  key={`bank-${acc.id}`}
                  onClick={() => navigate(`/accounts/${acc.id}`)}
                  className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 text-left hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                    <Landmark className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{acc.bank_name} Bank</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 hidden sm:inline-flex">Bank</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {acc.account_holder_name || 'Account'}
                      {acc.account_number && <> · ••••{acc.account_number.slice(-4)}</>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-sm font-medium text-foreground tabular-nums">
                      {acc.transaction_count.toLocaleString()} txns
                    </div>
                    <div className="text-xs text-muted-foreground">{acc.currency}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              )
            } else {
              const card = item.data
              const pendingBill = cardBillsMap[card.id] ?? null
              const days = pendingBill ? daysUntil(pendingBill.due_date) : null
              const overdue = days !== null && days <= 0
              const dueSoon = days !== null && days > 0 && days <= 5
              return (
                <button
                  key={`card-${card.id}`}
                  onClick={() => navigate(`/accounts/cards/${card.id}`)}
                  className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 text-left hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 relative ${
                    overdue ? 'bg-rose-50 dark:bg-rose-950/30' : dueSoon ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-violet-50 dark:bg-violet-950/30'
                  }`}>
                    <CreditCardIcon className={`w-4.5 h-4.5 ${
                      overdue ? 'text-rose-500' : dueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-violet-600 dark:text-violet-400'
                    }`} />
                    {pendingBill && (
                      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-card ${
                        overdue ? 'bg-rose-500' : dueSoon ? 'bg-amber-500' : 'bg-primary'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {ISSUER_LABELS[card.issuer] ?? card.issuer}
                      </span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 hidden sm:inline-flex">Credit</Badge>
                      {pendingBill && (
                        <Badge
                          variant="secondary"
                          className={`text-xs px-1.5 py-0 ${
                            overdue
                              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              : dueSoon
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : ''
                          }`}
                        >
                          {overdue ? 'Overdue' : `Due in ${days}d`}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ••••{card.card_last4}
                      {card.card_name && <> · {card.card_name}</>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    {pendingBill?.total_due ? (
                      <>
                        <div className={`text-sm font-medium tabular-nums ${overdue ? 'text-rose-500' : dueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                          {fmt(pendingBill.total_due)}
                        </div>
                        <div className="text-xs text-muted-foreground">due</div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium text-foreground tabular-nums">
                          {card.transaction_count.toLocaleString()} txns
                        </div>
                        {card.last_bill_total ? (
                          <div className="text-xs text-muted-foreground tabular-nums">Last bill {fmt(card.last_bill_total)}</div>
                        ) : (
                          <div className="text-xs text-muted-foreground">{card.currency}</div>
                        )}
                      </>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              )
            }
          })}
        </div>
      )}

      {/* Monthly Summary */}
      {(summary.length > 0 || loadingSummary) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{year} Monthly Summary</h2>
          <Card>
            <CardContent className="p-0">
              {loadingSummary ? (
                <div className="flex flex-col gap-0">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-3 w-24 ml-auto" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-3 px-4 font-medium">Month</th>
                        <th className="text-right py-3 px-4 font-medium">Debit</th>
                        <th className="text-right py-3 px-4 font-medium">Credit</th>
                        <th className="text-right py-3 px-4 font-medium">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((s) => (
                        <tr key={`${s.year}-${s.month}`} className="border-b last:border-0">
                          <td className="py-2.5 px-4">{MONTHS[s.month - 1]}</td>
                          <td className="text-right py-2.5 px-4 text-red-500 tabular-nums">{fmt(s.total_debit)}</td>
                          <td className="text-right py-2.5 px-4 text-emerald-600 tabular-nums">{fmt(s.total_credit)}</td>
                          <td className={`text-right py-2.5 px-4 font-medium tabular-nums ${Number(s.net) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {fmt(s.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
