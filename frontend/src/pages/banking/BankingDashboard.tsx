import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAccountsApi, getMonthlySummaryApi } from '@/api/banking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n: string | number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}

export default function BankingDashboard() {
  const navigate = useNavigate()
  const year = new Date().getFullYear()
  const [summaryYear] = useState(year)

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['banking-accounts'],
    queryFn: getAccountsApi,
  })

  const { data: summary = [], isLoading: loadingSummary } = useQuery({
    queryKey: ['banking-summary', summaryYear],
    queryFn: () => getMonthlySummaryApi(summaryYear),
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your bank accounts and transactions</p>
        </div>
        <Button onClick={() => navigate('/banking/accounts/new')}>Add Account</Button>
      </div>

      {/* Accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingAccounts
          ? Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5 flex flex-col gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-20" />
              </CardContent></Card>
            ))
          : accounts.map((acc) => (
              <Card
                key={acc.id}
                className="cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={() => navigate(`/banking/accounts/${acc.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{acc.bank_name} Bank</CardTitle>
                    <Badge variant="secondary">{acc.currency}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {acc.account_holder_name || 'Unknown holder'}
                  </p>
                  {acc.account_number && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ••••{acc.account_number.slice(-4)}
                    </p>
                  )}
                  <p className="text-sm font-medium mt-3">
                    {acc.transaction_count.toLocaleString()} transactions
                  </p>
                </CardContent>
              </Card>
            ))}
        {!loadingAccounts && accounts.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="font-medium">No accounts yet</p>
            <p className="text-sm text-muted-foreground">Add a bank account to get started</p>
            <Button variant="outline" onClick={() => navigate('/banking/accounts/new')}>Add Account</Button>
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      {(summary.length > 0 || loadingSummary) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{summaryYear} Summary</h2>
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
                  <table className="w-full text-sm">
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
