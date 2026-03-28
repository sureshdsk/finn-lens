import { useRef, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAccountsApi, getTransactionsApi, uploadStatementApi, type Transaction } from '@/api/banking'
import { classifyAccountApi, overrideCategoryApi } from '@/api/classifier'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, XIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

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

function fmt(n: string | number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}

function formatDate(d: string) {
  const date = new Date(d)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function dateToIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Category Badge (inline-editable) ────────────────────────────────────

function CategoryBadge({ txn, onOverride }: { txn: Transaction; onOverride: (id: number, cat: string) => void }) {
  const cat = CATEGORIES[txn.category] ?? CATEGORIES.uncategorized
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <Select
        defaultValue={txn.category}
        onValueChange={(val) => {
          if (val) onOverride(txn.id, val)
          setEditing(false)
        }}
      >
        <SelectTrigger size="sm" className="h-5 w-24 text-xs rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CATEGORIES)
            .filter(([k]) => k !== 'uncategorized')
            .map(([slug, { label }]) => (
              <SelectItem key={slug} value={slug} className="text-xs">
                {label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-70 transition-opacity ${cat.color}`}
      title="Click to change category"
    >
      {cat.label}
      {txn.is_user_categorized && <span className="opacity-60">*</span>}
    </button>
  )
}

// ── Date Range Picker ───────────────────────────────────────────────────

function DateRangePicker({
  dateRange,
  onChange,
}: {
  dateRange: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 h-8 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
      >
        <CalendarIcon className="size-3.5" />
        {dateRange?.from ? (
          <span className="text-foreground">
            {formatDate(dateToIso(dateRange.from))}
            {dateRange.to && ` - ${formatDate(dateToIso(dateRange.to))}`}
          </span>
        ) : (
          'Date range'
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

// ── Filter Bar ──────────────────────────────────────────────────────────

interface Filters {
  search: string
  txnType: 'all' | 'debit' | 'credit'
  category: string
  year: number | null
  month: number | null
  dateRange: DateRange | undefined
}

const defaultFilters: Filters = {
  search: '',
  txnType: 'all',
  category: '',
  year: null,
  month: null,
  dateRange: undefined,
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
    if (filters.txnType !== 'all') n++
    if (filters.category) n++
    if (filters.year) n++
    if (filters.month) n++
    if (filters.dateRange?.from) n++
    return n
  }, [filters])

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Search + quick filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search remarks..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-64 h-8 text-sm pl-8"
          />
        </div>

        {/* Debit / Credit toggle */}
        <div className="flex rounded-lg border overflow-hidden text-xs">
          {(['all', 'debit', 'credit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onChange({ ...filters, txnType: t })}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                filters.txnType === t
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Category */}
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
                <SelectItem key={slug} value={slug} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            <SelectItem value="uncategorized" className="text-xs">Uncategorized</SelectItem>
          </SelectContent>
        </Select>

        {/* Year */}
        <Select
          value={filters.year?.toString() ?? undefined}
          onValueChange={(val) =>
            onChange({ ...filters, year: val === '__all__' ? null : Number(val) })
          }
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

        {/* Month */}
        <Select
          value={filters.month?.toString() ?? undefined}
          onValueChange={(val) =>
            onChange({ ...filters, month: val === '__all__' ? null : Number(val) })
          }
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

        {/* Date range */}
        <DateRangePicker
          dateRange={filters.dateRange}
          onChange={(range) => onChange({ ...filters, dateRange: range })}
        />

        {/* Clear all + result count */}
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
    </div>
  )
}

// ── Table Skeleton ──────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b last:border-0">
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-4 w-16 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="h-3 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const accountId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters })
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc')
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const { data: accounts = [] } = useQuery({
    queryKey: ['banking-accounts'],
    queryFn: getAccountsApi,
  })
  const account = accounts.find((a) => a.id === accountId)

  const { data: txnData, isLoading } = useQuery({
    queryKey: ['banking-transactions', accountId, page, filters, dateSort],
    queryFn: () =>
      getTransactionsApi(accountId, {
        page,
        page_size: PAGE_SIZE,
        type: filters.txnType === 'all' ? undefined : filters.txnType,
        search: filters.search || undefined,
        category: filters.category || undefined,
        year: filters.year ?? undefined,
        month: filters.month ?? undefined,
        date_from: filters.dateRange?.from ? dateToIso(filters.dateRange.from) : undefined,
        date_to: filters.dateRange?.to ? dateToIso(filters.dateRange.to) : undefined,
        sort: dateSort === 'desc' ? '-transaction_date' : 'transaction_date',
      }),
    enabled: !!accountId,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadStatementApi(accountId, file),
    onSuccess: (result) => {
      const parts = [`${result.imported} imported`]
      if (result.classified > 0) parts.push(`${result.classified} classified`)
      setUploadMsg({ text: parts.join(', '), ok: true })
      qc.invalidateQueries({ queryKey: ['banking-accounts'] })
      qc.invalidateQueries({ queryKey: ['banking-transactions', accountId] })
      qc.invalidateQueries({ queryKey: ['banking-summary'] })
    },
    onError: (err) => setUploadMsg({ text: (err as Error).message, ok: false }),
  })

  const classifyMutation = useMutation({
    mutationFn: () => classifyAccountApi(accountId),
    onSuccess: (result) => {
      setUploadMsg({ text: `${result.classified} transactions classified`, ok: true })
      qc.invalidateQueries({ queryKey: ['banking-transactions', accountId] })
    },
    onError: (err) => setUploadMsg({ text: (err as Error).message, ok: false }),
  })

  const overrideMutation = useMutation({
    mutationFn: ({ txnId, category }: { txnId: number; category: string }) =>
      overrideCategoryApi(txnId, category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banking-transactions', accountId] })
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadMsg(null)
    uploadMutation.mutate(file)
    e.target.value = ''
  }

  function handleOverride(txnId: number, category: string) {
    overrideMutation.mutate({ txnId, category })
  }

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
            onClick={() => navigate('/accounts')}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            ← Banking
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {account ? `${account.bank_name} Bank` : 'Account'}
            </h1>
            {account && <Badge variant="secondary">{account.currency}</Badge>}
          </div>
          {account && (
            <p className="text-sm text-muted-foreground mt-1">
              {account.account_holder_name || 'Unknown holder'}
              {account.account_number && <> · ••••{account.account_number.slice(-4)}</>}
              {' · '}{account.transaction_count.toLocaleString()} transactions
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleFileChange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => classifyMutation.mutate()}
            disabled={classifyMutation.isPending}
          >
            {classifyMutation.isPending ? 'Classifying...' : 'Classify'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Statement'}
          </Button>
        </div>
      </div>

      {uploadMsg && (
        <p className={`text-sm ${uploadMsg.ok ? 'text-emerald-600' : 'text-destructive'}`}>
          {uploadMsg.ok ? '✓ ' : '✗ '}{uploadMsg.text}
        </p>
      )}

      <Separator />

      {/* Filters */}
      <FilterBar filters={filters} onChange={handleFilterChange} total={total} />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : txns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <p className="font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground">
                {filters.search || filters.txnType !== 'all' || filters.category || filters.year || filters.dateRange?.from
                  ? 'Try adjusting your filters'
                  : 'Upload a statement to import transactions'}
              </p>
              {!filters.search && filters.txnType === 'all' && !filters.category && (
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Upload Statement
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px]">
                    <button
                      onClick={() => setDateSort((s) => s === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                    >
                      Date
                      {dateSort === 'desc'
                        ? <ArrowDownIcon className="size-3" />
                        : <ArrowUpIcon className="size-3" />
                      }
                    </button>
                  </TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-[100px]">Category</TableHead>
                  <TableHead className="text-right w-[110px]">Debit</TableHead>
                  <TableHead className="text-right w-[110px]">Credit</TableHead>
                  <TableHead className="text-right w-[120px]">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t) => {
                  const isExpanded = expandedRow === t.id
                  return (
                    <TableRow
                      key={t.id}
                      className="group cursor-pointer"
                      onClick={() => setExpandedRow(isExpanded ? null : t.id)}
                    >
                      <TableCell className="text-muted-foreground tabular-nums text-xs align-top pt-3">
                        {formatDate(t.transaction_date)}
                      </TableCell>
                      <TableCell className="align-top pt-3 max-w-md">
                        {/* Merchant / primary line */}
                        {t.merchant_name ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{t.merchant_name}</span>
                            {t.payment_channel && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {t.payment_channel}
                              </span>
                            )}
                          </div>
                        ) : (
                          t.payment_channel && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded inline-block mb-1">
                              {t.payment_channel}
                            </span>
                          )
                        )}
                        {/* Full description — always visible */}
                        <p className={`text-xs text-muted-foreground mt-0.5 ${isExpanded ? 'whitespace-pre-wrap break-all' : 'line-clamp-2'}`}>
                          {t.description}
                        </p>
                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {t.upi_handle && <span>UPI: {t.upi_handle}</span>}
                            {t.recipient_name && <span>To: {t.recipient_name}</span>}
                            {t.cheque_number && <span>Chq: {t.cheque_number}</span>}
                            <span>Value date: {formatDate(t.value_date)}</span>
                            {t.category_confidence > 0 && (
                              <span>Confidence: {(t.category_confidence * 100).toFixed(0)}%</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top pt-3" onClick={(e) => e.stopPropagation()}>
                        <CategoryBadge txn={t} onOverride={handleOverride} />
                      </TableCell>
                      <TableCell className="text-right align-top pt-3 text-red-500 tabular-nums">
                        {t.debit ? fmt(t.debit) : ''}
                      </TableCell>
                      <TableCell className="text-right align-top pt-3 text-emerald-600 tabular-nums">
                        {t.credit ? fmt(t.credit) : ''}
                      </TableCell>
                      <TableCell className="text-right align-top pt-3 font-medium tabular-nums">
                        {fmt(t.balance)}
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
    </div>
  )
}
