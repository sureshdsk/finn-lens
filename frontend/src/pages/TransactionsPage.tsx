import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getUnifiedTransactionsApi,
  getSpendingSummaryApi,
  getUnifiedTransactionDetailApi,
} from '@/api/unified'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SearchIcon,
  XIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CreditCardIcon,
  LandmarkIcon,
  ExternalLinkIcon,
  LayersIcon,
} from 'lucide-react'

const PAGE_SIZE = 50
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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

const INSTRUMENT_LABELS: Record<string, { label: string; icon: typeof CreditCardIcon }> = {
  credit_card: { label: 'Credit Card', icon: CreditCardIcon },
  bank_debit: { label: 'Bank Debit', icon: LandmarkIcon },
  bank_credit: { label: 'Bank Credit', icon: LandmarkIcon },
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  bank_statement: 'Bank Statement',
  cc_alert_email: 'CC Alert Email',
  cc_statement_pdf: 'CC Statement PDF',
  subscription_email: 'Subscription Email',
  ecommerce_email: 'E-commerce Email',
  manual: 'Manual',
}

function fmt(n: string | number, currency = 'INR') {
  const symbols: Record<string, string> = { INR: '₹', USD: '$' }
  return `${symbols[currency] ?? currency}${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  const date = new Date(d)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// ── Transaction Detail Dialog ───────────────────────────────────────────

function TransactionDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['unified-detail', id],
    queryFn: () => getUnifiedTransactionDetailApi(id),
  })

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-lg">{data.merchant_name || data.description.slice(0, 50)}</p>
                <p className="text-sm text-muted-foreground">{formatDate(data.transaction_date)}</p>
              </div>
              <p className={`text-xl font-bold tabular-nums ${Number(data.amount) < 0 ? 'text-emerald-600' : ''}`}>
                {fmt(data.amount, data.currency)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Category</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${(CATEGORIES[data.category] ?? CATEGORIES.uncategorized).color}`}>
                    {(CATEGORIES[data.category] ?? CATEGORIES.uncategorized).label}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Instrument</span>
                <p className="mt-1">{data.credit_card_label || data.bank_account_label || data.instrument_type}</p>
              </div>
            </div>

            {data.description && (
              <div className="text-sm">
                <span className="text-muted-foreground">Description</span>
                <p className="mt-1 text-xs break-all">{data.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Sources ({data.sources.length})
              </p>
              <div className="space-y-2">
                {data.sources.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-sm border rounded-md px-3 py-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {SOURCE_TYPE_LABELS[s.source_type] ?? s.source_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex-1 line-clamp-1">
                      {s.email_subject || s.raw_description}
                    </span>
                    {s.raw_amount && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {s.raw_currency}{s.raw_amount}
                      </span>
                    )}
                    {s.gmail_message_id && (
                      <a
                        href={`https://mail.google.com/mail/u/0/#all/${s.gmail_message_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [instrument, setInstrument] = useState('')
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc')
  const [selectedTxn, setSelectedTxn] = useState<number | null>(null)

  const { data: txnData, isLoading } = useQuery({
    queryKey: ['unified-transactions', page, search, category, year, month, instrument, dateSort],
    queryFn: () =>
      getUnifiedTransactionsApi({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        category: category || undefined,
        year: year ?? undefined,
        month: month ?? undefined,
        instrument_type: instrument || undefined,
        sort: dateSort === 'desc' ? '-transaction_date' : 'transaction_date',
        exclude_transfers: true,
      }),
  })

  const { data: summary } = useQuery({
    queryKey: ['spending-summary', year, month],
    queryFn: () => getSpendingSummaryApi({ year: year ?? undefined, month: month ?? undefined }),
  })

  const txns = txnData?.items ?? []
  const total = txnData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const hasFilters = !!(search || category || year || month || instrument)

  function clearFilters() {
    setSearch('')
    setCategory('')
    setYear(null)
    setMonth(null)
    setInstrument('')
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unified view across all accounts and cards
        </p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Spending</p>
              <p className="text-xl font-bold tabular-nums mt-1">{fmt(summary.total_spending)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-xl font-bold tabular-nums mt-1 text-emerald-600">{fmt(summary.total_income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-xl font-bold tabular-nums mt-1">{summary.transaction_count.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-52 h-8 text-sm pl-8"
          />
        </div>

        <Select value={category || undefined} onValueChange={(v) => { setCategory(v === '__all__' ? '' : (v ?? '')); setPage(1) }}>
          <SelectTrigger size="sm" className="h-8 min-w-24 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All categories</SelectItem>
            {Object.entries(CATEGORIES).map(([k, { label }]) => (
              <SelectItem key={k} value={k} className="text-xs">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={instrument || undefined} onValueChange={(v) => { setInstrument(v === '__all__' ? '' : (v ?? '')); setPage(1) }}>
          <SelectTrigger size="sm" className="h-8 min-w-24 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All sources</SelectItem>
            <SelectItem value="credit_card" className="text-xs">Credit Card</SelectItem>
            <SelectItem value="bank_debit" className="text-xs">Bank Debit</SelectItem>
            <SelectItem value="bank_credit" className="text-xs">Bank Credit</SelectItem>
          </SelectContent>
        </Select>

        <Select value={year?.toString() ?? undefined} onValueChange={(v) => { setYear(v === '__all__' ? null : Number(v)); setPage(1) }}>
          <SelectTrigger size="sm" className="h-8 w-20 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All</SelectItem>
            {YEARS.map((y) => <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={month?.toString() ?? undefined} onValueChange={(v) => { setMonth(v === '__all__' ? null : Number(v)); setPage(1) }}>
          <SelectTrigger size="sm" className="h-8 w-20 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All</SelectItem>
            {MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()} className="text-xs">{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
              <XIcon className="size-3 mr-1" /> Clear
            </Button>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">{total.toLocaleString()} transactions</span>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : txns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="font-medium">No transactions</p>
              <p className="text-sm text-muted-foreground">
                {hasFilters ? 'Try adjusting filters' : 'Import bank statements or sync Gmail to see transactions'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[90px]">
                    <button
                      onClick={() => setDateSort(s => s === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                    >
                      Date
                      {dateSort === 'desc' ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
                    </button>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[90px]">Category</TableHead>
                  <TableHead className="w-[100px]">Account</TableHead>
                  <TableHead className="text-right w-[100px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t) => {
                  const cat = CATEGORIES[t.category] ?? CATEGORIES.uncategorized
                  const inst = INSTRUMENT_LABELS[t.instrument_type]
                  const InstIcon = inst?.icon ?? LandmarkIcon
                  return (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedTxn(t.id)}
                    >
                      <TableCell className="text-muted-foreground tabular-nums text-xs">
                        {formatDate(t.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            {t.merchant_name && (
                              <span className="font-medium text-sm block truncate">{t.merchant_name}</span>
                            )}
                            <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                          </div>
                          {t.source_count > 1 && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" title={`${t.source_count} sources`}>
                              <LayersIcon className="size-3" />{t.source_count}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.color}`}>
                          {cat.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <InstIcon className="size-3" />
                          {t.credit_card_label || t.bank_account_label || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        <span className={Number(t.amount) < 0 ? 'text-emerald-600' : ''}>
                          {Number(t.amount) < 0 ? '–' : ''}{fmt(Math.abs(Number(t.amount)), t.currency)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {selectedTxn && (
        <TransactionDetail id={selectedTxn} onClose={() => setSelectedTxn(null)} />
      )}
    </div>
  )
}
