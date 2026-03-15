import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCardsApi, materializeCardsApi, type CreditCard } from '@/api/creditCards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard as CreditCardIcon } from 'lucide-react'
import { toast } from 'sonner'

function fmt(n: string | number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}

const ISSUER_LABELS: Record<string, string> = {
  HDFC: 'HDFC Bank',
  ICICI: 'ICICI Bank',
  AXIS: 'Axis Bank',
  SBI: 'SBI Card',
  KOTAK: 'Kotak Mahindra',
  INDUSIND: 'IndusInd',
  RBL: 'RBL Bank',
  YES: 'Yes Bank',
  AMEX: 'Amex',
  CITI: 'Citibank',
  SC: 'Standard Chartered',
  HSBC: 'HSBC',
  OTHER: 'Other',
}

export default function CreditCardsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: getCardsApi,
  })

  const materializeMutation = useMutation({
    mutationFn: materializeCardsApi,
    onSuccess: (result) => {
      const parts: string[] = []
      if (result.cards > 0) parts.push(`${result.cards} cards`)
      if (result.bills > 0) parts.push(`${result.bills} bills`)
      if (result.transactions > 0) parts.push(`${result.transactions} transactions`)
      toast.success(parts.length > 0 ? `Synced: ${parts.join(', ')}` : 'Already up to date')
      qc.invalidateQueries({ queryKey: ['credit-cards'] })
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const totalTxns = cards.reduce((s, c) => s + c.transaction_count, 0)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credit Cards</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {cards.length} card{cards.length !== 1 ? 's' : ''} · {totalTxns.toLocaleString()} transactions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => materializeMutation.mutate()}
          disabled={materializeMutation.isPending}
        >
          {materializeMutation.isPending ? 'Syncing...' : 'Sync from Email'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 flex flex-col gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : cards.map((card) => (
              <Card
                key={card.id}
                className="cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={() => navigate(`/credit-cards/${card.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCardIcon className="size-4 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {ISSUER_LABELS[card.issuer] ?? card.issuer}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">{card.currency}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    ••••{card.card_last4}
                    {card.card_name && <> · {card.card_name}</>}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-medium">
                      {card.transaction_count.toLocaleString()} transactions
                    </p>
                    {card.last_bill_total && (
                      <p className="text-xs text-muted-foreground">
                        Last bill: {fmt(card.last_bill_total)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        {!isLoading && cards.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3 text-center">
            <CreditCardIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">No credit cards found</p>
            <p className="text-sm text-muted-foreground">
              Sync your Gmail to discover credit cards from email alerts
            </p>
            <Button
              variant="outline"
              onClick={() => materializeMutation.mutate()}
              disabled={materializeMutation.isPending}
            >
              Sync from Email
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
