import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCardsApi,
  getCardBillsApi,
  getCardTransactionsApi,
  classifyCardTransactionsApi,
  type CreditCardBill,
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
import {
  CreditCard as CreditCardIcon,
  SearchIcon,
  XIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ReceiptTextIcon,
  ClockIcon,
} from 'lucide-react'
import { toast } from 'sonner'

const PAGE_SIZE = 50
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$' }

function fmt(n: string | number, currency = 'INR') {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' '
  return `${symbol}${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  const date = new Date(d)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function formatDateShort(d: string) {
  const date = new Date(d)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

// ── Skeleton ─────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-4 w-14 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── Transaction Table (reused in both tabs) ─────────────────────────────

function TransactionTable({
  cardId,
  billId,
}: {
  cardId: number
  billId?: number | 'unbilled'
}) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc')

  const { data: txnData, isLoading } = useQuery({
    queryKey: ['cc-transactions', cardId, String(billId ?? 'all'), page, search, category, dateSort],
    queryFn: () => {
      const apiParams: Parameters<typeof getCardTransactionsApi>[1] = {
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        category: category || undefined,
        sort: dateSort === 'desc' ? '-transaction_date' : 'transaction_date',
      }
      if (billId !== undefined) {
        apiParams.bill_id = billId
      }
      return getCardTransactionsApi(cardId, apiParams)
    },
  })

  const txns = txnData?.items ?? []
  const total = txnData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-3">
      {/* Compact filter row */}
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
        <Select
          value={category || undefined}
          onValueChange={(val) => { setCategory(val === '__all__' ? '' : (val ?? '')); setPage(1) }}
        >
          <SelectTrigger size="sm" className="h-8 min-w-24 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">All</SelectItem>
            {Object.entries(CATEGORIES).map(([slug, { label }]) => (
              <SelectItem key={slug} value={slug} className="text-xs">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          {(search || category) && (
            <Button
              variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
              onClick={() => { setSearch(''); setCategory(''); setPage(1) }}
            >
              <XIcon className="size-3 mr-1" /> Clear
            </Button>
          )}
          {total > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{total.toLocaleString()} transactions</span>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : txns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <p className="text-sm font-medium">No transactions</p>
              <p className="text-xs text-muted-foreground">
                {search || category ? 'Try adjusting filters' : 'No transactions in this period'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[90px]">
                    <button
                      onClick={() => setDateSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                    >
                      Date
                      {dateSort === 'desc' ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />}
                    </button>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[90px]">Category</TableHead>
                  <TableHead className="text-right w-[100px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t) => {
                  const cat = CATEGORIES[t.category] ?? CATEGORIES.uncategorized
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground tabular-nums text-xs align-top pt-3">
                        {formatDateShort(t.transaction_date)}
                      </TableCell>
                      <TableCell className="align-top pt-3">
                        {t.merchant_name && (
                          <span className="font-medium text-sm block">{t.merchant_name}</span>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                      </TableCell>
                      <TableCell className="align-top pt-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cat.color}`}>
                          {cat.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right align-top pt-3 tabular-nums font-medium">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bill Section (expandable) ───────────────────────────────────────────

function BillSection({
  bill: b,
  cardId,
  isExpanded,
  onToggle,
  isUnbilled = false,
}: {
  bill?: CreditCardBill
  cardId: number
  isExpanded: boolean
  onToggle: () => void
  isUnbilled?: boolean
}) {
  const gmailUrl = b?.gmail_message_id
    ? `https://mail.google.com/mail/u/0/#all/${b.gmail_message_id}`
    : null

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <span className="text-muted-foreground shrink-0">
          {isExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        </span>

        {isUnbilled ? (
          <>
            <ClockIcon className="size-3.5 text-amber-500 shrink-0" />
            <span className="text-sm font-medium">Unbilled</span>
            <span className="text-xs text-muted-foreground">Current cycle</span>
            <span className="flex-1" />
          </>
        ) : b ? (
          <>
            <ReceiptTextIcon className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium min-w-[140px]">
              {b.billing_period_start && b.billing_period_end
                ? `${formatDateShort(b.billing_period_start)} – ${formatDateShort(b.billing_period_end)}`
                : formatDate(b.statement_date)}
            </span>
            <span className="tabular-nums text-sm font-semibold min-w-[100px]">
              {b.transactions_total ? fmt(b.transactions_total) : '—'}
            </span>
            {b.total_due && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Due: {fmt(b.total_due)}
              </span>
            )}
            <span className="flex-1" />
            <span className="text-xs text-muted-foreground tabular-nums">{b.transaction_count} txns</span>
            {b.due_date && (
              <span className="text-xs text-muted-foreground">by {formatDateShort(b.due_date)}</span>
            )}
            <Badge variant={b.is_paid ? 'default' : 'destructive'} className="text-xs">
              {b.is_paid ? 'Paid' : 'Due'}
            </Badge>
          </>
        ) : null}

        {gmailUrl && (
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="View in Gmail"
          >
            <ExternalLinkIcon className="size-3.5" />
          </a>
        )}
      </button>

      {isExpanded && (
        <div className="border-t px-4 py-3">
          <TransactionTable
            cardId={cardId}
            billId={isUnbilled ? 'unbilled' : b?.id}
          />
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const cardId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'transactions' | 'bills'>('bills')
  const [selectedBill, setSelectedBill] = useState<number | 'unbilled' | null>('unbilled')

  const { data: cards = [] } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: getCardsApi,
  })
  const card = cards.find((c) => c.id === cardId)

  const { data: bills = [], isLoading: loadingBills } = useQuery({
    queryKey: ['cc-bills', cardId],
    queryFn: () => getCardBillsApi(cardId),
  })

  const classifyMutation = useMutation({
    mutationFn: () => classifyCardTransactionsApi(cardId),
    onSuccess: (result) => {
      toast.success(`${result.classified} transactions classified`)
      qc.invalidateQueries({ queryKey: ['cc-transactions', cardId] })
    },
    onError: (err) => toast.error((err as Error).message),
  })

  function toggleBill(id: number | 'unbilled') {
    setSelectedBill(selectedBill === id ? null : id)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/accounts')}
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
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border overflow-hidden text-xs w-fit">
          {(['bills', 'transactions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 font-medium capitalize transition-colors ${
                tab === t
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {t === 'bills' ? 'Statements' : 'All Transactions'}
            </button>
          ))}
        </div>
      </div>

      {/* Bills / Statements tab (default) */}
      {tab === 'bills' && (
        <div className="flex flex-col gap-2">
          {loadingBills ? (
            <Card><CardContent className="p-0"><TableSkeleton rows={4} /></CardContent></Card>
          ) : (
            <>
              {/* Unbilled / Current cycle */}
              <BillSection
                cardId={cardId}
                isExpanded={selectedBill === 'unbilled'}
                onToggle={() => toggleBill('unbilled')}
                isUnbilled
              />

              {/* Past bills */}
              {bills.map((b) => (
                <BillSection
                  key={b.id}
                  bill={b}
                  cardId={cardId}
                  isExpanded={selectedBill === b.id}
                  onToggle={() => toggleBill(b.id)}
                />
              ))}

              {bills.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No statement bills found. Sync your Gmail to import statements.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* All Transactions tab */}
      {tab === 'transactions' && (
        <TransactionTable cardId={cardId} />
      )}
    </div>
  )
}
