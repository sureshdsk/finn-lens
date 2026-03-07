import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAccountsApi, getTransactionsApi, uploadStatementApi } from '@/api/banking'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

const PAGE_SIZE = 50

function fmt(n: string | number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="h-3 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const accountId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [txnType, setTxnType] = useState<'all' | 'debit' | 'credit'>('all')
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const { data: accounts = [] } = useQuery({
    queryKey: ['banking-accounts'],
    queryFn: getAccountsApi,
  })
  const account = accounts.find((a) => a.id === accountId)

  const { data: txnData, isLoading } = useQuery({
    queryKey: ['banking-transactions', accountId, page, search, txnType],
    queryFn: () =>
      getTransactionsApi(accountId, {
        page,
        page_size: PAGE_SIZE,
        type: txnType === 'all' ? undefined : txnType,
        search: search || undefined,
      }),
    enabled: !!accountId,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadStatementApi(accountId, file),
    onSuccess: (result) => {
      setUploadMsg({ text: `${result.imported} new transactions imported`, ok: true })
      qc.invalidateQueries({ queryKey: ['banking-accounts'] })
      qc.invalidateQueries({ queryKey: ['banking-transactions', accountId] })
      qc.invalidateQueries({ queryKey: ['banking-summary'] })
    },
    onError: (err) => setUploadMsg({ text: (err as Error).message, ok: false }),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadMsg(null)
    uploadMutation.mutate(file)
    e.target.value = ''
  }

  const txns = txnData?.items ?? []
  const total = txnData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/banking')}
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
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading…' : 'Upload Statement'}
          </Button>
        </div>
      </div>

      {uploadMsg && (
        <p className={`text-sm ${uploadMsg.ok ? 'text-emerald-600' : 'text-destructive'}`}>
          {uploadMsg.ok ? '✓ ' : '✗ '}{uploadMsg.text}
        </p>
      )}

      <Separator />

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-56 h-8 text-sm"
        />
        <div className="flex rounded-md border overflow-hidden text-xs">
          {(['all', 'debit', 'credit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTxnType(t); setPage(1) }}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                txnType === t
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {total.toLocaleString()} result{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : txns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <span className="text-4xl">📭</span>
              <p className="font-medium">No transactions found</p>
              <p className="text-sm text-muted-foreground">
                {search || txnType !== 'all'
                  ? 'Try clearing your filters'
                  : 'Upload a statement to import transactions'}
              </p>
              {!search && txnType === 'all' && (
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Upload Statement
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Description</th>
                    <th className="text-right py-3 px-4 font-medium">Debit</th>
                    <th className="text-right py-3 px-4 font-medium">Credit</th>
                    <th className="text-right py-3 px-4 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-accent/10 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground tabular-nums text-xs">
                        {t.transaction_date}
                      </td>
                      <td className="py-2.5 px-4 max-w-xs">
                        <span className="truncate block">{t.description}</span>
                        {t.cheque_number && (
                          <span className="text-xs text-muted-foreground">Chq: {t.cheque_number}</span>
                        )}
                      </td>
                      <td className="text-right py-2.5 px-4 text-red-500 tabular-nums">
                        {t.debit ? fmt(t.debit) : ''}
                      </td>
                      <td className="text-right py-2.5 px-4 text-emerald-600 tabular-nums">
                        {t.credit ? fmt(t.credit) : ''}
                      </td>
                      <td className="text-right py-2.5 px-4 font-medium tabular-nums">
                        {fmt(t.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
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
