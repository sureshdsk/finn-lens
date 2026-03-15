import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCardsApi,
  getCardBillsApi,
  getCardTransactionsApi,
  classifyCardTransactionsApi,
  type CreditCardTransaction,
} from '@/api/creditCards'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CreditCard as CreditCardIcon, SearchIcon, XIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { toast } from 'sonner'

const PAGE_SIZE = 50
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEARS = [2023, 2024, 2025, 2026]

const CATEGORIES: Record<string, { label: string; color: string }> = {
  food: { label: 'Food', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  groceries: { label: 'Groceries', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  clothing: { label: 'Clothing', color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
  entertainment: { label: 'Entertainment', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  ecommerce: { label: 'E-commerce', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  travel_transport: { label: 'Travel', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
  bills_utilities: { label: 'Bills', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
  healthcare: { label: 'Health', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  education: { label: 'Education', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  investment_finance: { label: 'Investment', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  services_misc: { label: 'Services', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  transfers_payments: { label: 'Transfer', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  uncategorized: { label: 'Uncategorized', color: 'bg-gray-50 text-gray-400 dark:bg-gray-900 dark:text-gray-500' },
}

const ISSUER_LABELS: Record<string, string> = {
  HDFC: 'HDFC Bank', ICICI: 'ICICI Bank', AXIS: 'Axis Bank', SBI: 'SBI Card',
  KOTAK: 'Kotak Mahindra', INDUSIND: 'IndusInd', RBL: 'RBL Bank', YES: 'Yes Bank',
  AMEX: 'Amex', CITI: 'Citibank', SC: 'Standard Chartered', HSBC: 'HSBC', OTHER: 'Other',
}

const SOURCE_LABELS: Record<string, string> = {
  alert: 'Alert', statement: 'Statement', manual: 'Manual',
}

const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$' }

function fmt(n: string | number, currency = 'INR') {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' '
  return `${symbol}${Number(n).toLocaleString('en-IN')}`
}

function formatDate(d: string) {
  const date = new Date(d)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// ── Filter bar ───────────────────────────────────────────────────────────

interface Filters {
  search: string
  category: string
  year: number | null
  month: number | null
}

const defaultFilters: Filters = {
  search: '',
  category: '',
  year: null,
  month: null,
}

function FilterBar({
  filters,
  onChange,
  total,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  total: number
}) {
  const activeCount = useMemo(() => {
    let n = 0
    if (filters.search) n++
    if (filters.category) n++
    if (filters.year) n++
    if (filters.month) n++
    return n
  }, [filters])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search description..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-64 h-8 text-sm pl-8"
        />
      </div>

      <Select
        value={filters.category ?? undefined}
        onValueChange={(val) => onChange({ ...filters, category: val === '__all__' ? '' : (val ?? '') })}
      >
        <SelectTrigger size="sm" className="h-8 min-w-28 text-xs">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" className="text-xs">All categories</SelectItem>
          {Object.entries(CATEGORIES)
            .filter(([k]) => k !== 'uncategorized')
            .map(([slug, { label }]) => (
              <SelectItem key={slug} value={slug} className="text-xs">{label}</SelectItem>
            ))}
          <SelectItem value="uncategorized" className="text-xs">Uncategorized</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.year?.toString() ?? undefined}
        onValueChange={(val) => onChange({ ...filters, year: val === '__all__' ? null : Number(val) })}
      >
        <SelectTrigger size="sm" className="h-8 w-20 text-xs">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" className="text-xs">All years</SelectItem>
          {YEARS.map((y) => (
            <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.month?.toString() ?? undefined}
        onValueChange={(val) => onChange({ ...filters, month: val === '__all__' ? null : Number(val) })}
      >
        <SelectTrigger size="sm" className="h-8 w-20 text-xs">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" className="text-xs">All months</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={i} value={(i + 1).toString()} className="text-xs">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 ml-auto">
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => onChange({ ...defaultFilters })}
          >
            <XIcon className="size-3 mr-1" />
            Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
          </Button>
        )}
        {total > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {total.toLocaleString()} result{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b last:border-0">
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-4 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const cardId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'transactions' | 'bills'>('transactions')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters })
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const { data: cards = [] } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: getCardsApi,
  })
  const card = cards.find((c) => c.id === cardId)

  const { data: txnData, isLoading: loadingTxns } = useQuery({
    queryKey: ['cc-transactions', cardId, page, filters, dateSort],
    queryFn: () =>
      getCardTransactionsApi(cardId, {
        page,
        page_size: PAGE_SIZE,
        search: filters.search || undefined,
        category: filters.category || undefined,
        year: filters.year ?? undefined,
        month: filters.month ?? undefined,
        sort: dateSort === 'desc' ? '-transaction_date' : 'transaction_date',
      }),
    enabled: tab === 'transactions',
  })

  const { data: bills = [], isLoading: loadingBills } = useQuery({
    queryKey: ['cc-bills', cardId],
    queryFn: () => getCardBillsApi(cardId),
    enabled: tab === 'bills',
  })

  const classifyMutation = useMutation({
    mutationFn: () => classifyCardTransactionsApi(cardId),
    onSuccess: (result) => {
      toast.success(`${result.classified} transactions classified`)
      qc.invalidateQueries({ queryKey: ['cc-transactions', cardId] })
    },
    onError: (err) => toast.error((err as Error).message),
  })

  function handleFilterChange(f: Filters) {
    setFilters(f)
    setPage(1)
  }

  const txns = txnData?.items ?? []
  const total = txnData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/credit-cards')}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            ← Credit Cards
          </button>
          <div className="flex items-center gap-3">
            <CreditCardIcon className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">
              {card ? `${ISSUER_LABELS[card.issuer] ?? card.issuer} ••••${card.card_last4}` : 'Card'}
            </h1>
            {card && <Badge variant="secondary">{card.currency}</Badge>}
          </div>
          {card && (
            <p className="text-sm text-muted-foreground mt-1">
              {card.card_name && <>{card.card_name} · </>}
              {card.transaction_count.toLocaleString()} transactions
              {card.last_bill_total && <> · Last bill: {fmt(card.last_bill_total)}</>}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => classifyMutation.mutate()}
          disabled={classifyMutation.isPending}
        >
          {classifyMutation.isPending ? 'Classifying...' : 'Classify'}
        </Button>
      </div>

      <Separator />

      {/* Tab toggle */}
      <div className="flex rounded-lg border overflow-hidden text-xs w-fit">
        {(['transactions', 'bills'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <>
          <FilterBar filters={filters} onChange={handleFilterChange} total={total} />

          <Card>
            <CardContent className="p-0">
              {loadingTxns ? (
                <TableSkeleton />
              ) : txns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <p className="font-medium">No transactions found</p>
                  <p className="text-sm text-muted-foreground">
                    {filters.search || filters.category || filters.year
                      ? 'Try adjusting your filters'
                      : 'Sync your Gmail to discover transactions'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[100px]">
                        <button
                          onClick={() => setDateSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                        >
                          Date
                          {dateSort === 'desc' ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
                        </button>
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px]">Category</TableHead>
                      <TableHead className="w-[70px]">Source</TableHead>
                      <TableHead className="text-right w-[110px]">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txns.map((t) => {
                      const isExpanded = expandedRow === t.id
                      const cat = CATEGORIES[t.category] ?? CATEGORIES.uncategorized
                      return (
                        <TableRow
                          key={t.id}
                          className="group cursor-pointer"
                          onClick={() => setExpandedRow(isExpanded ? null : t.id)}
                        >
                          <TableCell className="text-muted-foreground tabular-nums text-xs align-top pt-3">
                            <div>{formatDate(t.transaction_date)}</div>
                            {t.transaction_time && (
                              <div className="text-[10px] opacity-60">{t.transaction_time.slice(0, 5)}</div>
                            )}
                          </TableCell>
                          <TableCell className="align-top pt-3 max-w-md">
                            {t.merchant_name && (
                              <span className="font-medium text-sm block">{t.merchant_name}</span>
                            )}
                            <p className={`text-xs text-muted-foreground mt-0.5 ${isExpanded ? 'whitespace-pre-wrap break-all' : 'line-clamp-2'}`}>
                              {t.description}
                            </p>
                            {isExpanded && t.category_confidence > 0 && (
                              <div className="mt-2 text-[11px] text-muted-foreground">
                                Confidence: {(t.category_confidence * 100).toFixed(0)}%
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top pt-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.color}`}>
                              {cat.label}
                            </span>
                          </TableCell>
                          <TableCell className="align-top pt-3 text-xs text-muted-foreground">
                            {SOURCE_LABELS[t.source_type] ?? t.source_type}
                          </TableCell>
                          <TableCell className="text-right align-top pt-3 tabular-nums font-medium">
                            <span className={Number(t.amount) < 0 ? 'text-emerald-600' : 'text-red-500'}>
                              {fmt(Math.abs(Number(t.amount)), t.currency)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bills tab */}
      {tab === 'bills' && (
        <Card>
          <CardContent className="p-0">
            {loadingBills ? (
              <TableSkeleton />
            ) : bills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="font-medium">No bills found</p>
                <p className="text-sm text-muted-foreground">
                  Statement emails with bill details will appear here
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Statement Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total Due</TableHead>
                    <TableHead className="text-right">Min Due</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="tabular-nums text-sm">{formatDate(b.statement_date)}</TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">
                        {b.due_date ? formatDate(b.due_date) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {b.total_due ? fmt(b.total_due) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {b.min_due ? fmt(b.min_due) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.billing_period_start && b.billing_period_end
                          ? `${formatDate(b.billing_period_start)} – ${formatDate(b.billing_period_end)}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.is_paid ? 'default' : 'destructive'}>
                          {b.is_paid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
