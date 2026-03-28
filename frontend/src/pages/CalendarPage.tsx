import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'

import { getUnifiedTransactionsApi, type UnifiedTransaction } from '@/api/unified'
import { getCardsApi, getCardBillsApi, type CreditCard } from '@/api/creditCards'
import { getSubscriptionsApi, type Subscription } from '@/api/subscriptions'

import FinancialCalendar from '@/components/calendar/FinancialCalendar'
import DayDetailPanel from '@/components/calendar/DayDetailPanel'
import CalendarLegend from '@/components/calendar/CalendarLegend'
import type { CalendarEventsMap } from '@/components/calendar/types'

function addBillToMap(map: CalendarEventsMap, dateKey: string, bill: { id: number; cardLabel: string; dueDate: string; totalDue: number; isPaid: boolean; paidDate: string | null; statementDate: string }, kind: 'due' | 'paid') {
  let existing = map.get(dateKey)
  if (!existing) {
    existing = { transactions: null, ccBills: [], subscriptions: [] }
    map.set(dateKey, existing)
  }
  existing.ccBills.push({
    id: bill.id,
    cardLabel: bill.cardLabel,
    dueDate: bill.dueDate,
    totalDue: bill.totalDue,
    isPaid: bill.isPaid,
    paidDate: bill.paidDate,
    statementDate: bill.statementDate,
    kind,
  })
}

function buildEventsMap(
  transactions: UnifiedTransaction[],
  cards: CreditCard[],
  billsMap: Map<number, { statement_date: string; due_date: string | null; total_due: string | null; is_paid: boolean; paid_date: string | null; transaction_count: number }[]>,
  subs: Subscription[],
): CalendarEventsMap {
  const map: CalendarEventsMap = new Map()

  for (const tx of transactions) {
    const dateKey = tx.transaction_date.slice(0, 10)
    let existing = map.get(dateKey)
    if (!existing) {
      existing = { transactions: null, ccBills: [], subscriptions: [] }
      map.set(dateKey, existing)
    }

    if (!existing.transactions) {
      existing.transactions = { date: dateKey, debits: [], credits: [], totalDebits: 0, totalCredits: 0 }
    }
    const amount = parseFloat(tx.amount)
    if (amount > 0) {
      existing.transactions.debits.push({
        id: tx.id,
        merchant: tx.merchant_name,
        amount,
        category: tx.category,
        description: tx.description,
      })
      existing.transactions.totalDebits += amount
    } else {
      existing.transactions.credits.push({
        id: tx.id,
        merchant: tx.merchant_name,
        amount: Math.abs(amount),
        category: tx.category,
        description: tx.description,
      })
      existing.transactions.totalCredits += Math.abs(amount)
    }
  }

  for (const card of cards) {
    const bills = billsMap.get(card.id) ?? []
    for (const bill of bills) {
      const billData = {
        id: bill.transaction_count,
        cardLabel: `${card.issuer} *${card.card_last4}`,
        dueDate: bill.due_date!,
        totalDue: parseFloat(bill.total_due ?? '0'),
        isPaid: bill.is_paid,
        paidDate: bill.paid_date,
        statementDate: bill.statement_date,
      }

      const dueDate = bill.due_date?.slice(0, 10)
      const paidDate = bill.paid_date?.slice(0, 10)

      if (bill.is_paid && paidDate) {
        addBillToMap(map, paidDate, billData, 'paid')
      } else if (dueDate) {
        addBillToMap(map, dueDate, billData, 'due')
      }
    }
  }

  for (const sub of subs) {
    if (!sub.renew_date) continue
    const renewDate = sub.renew_date.slice(0, 10)
    let existing = map.get(renewDate)
    if (!existing) {
      existing = { transactions: null, ccBills: [], subscriptions: [] }
      map.set(renewDate, existing)
    }
    existing.subscriptions.push({
      id: sub.id,
      name: sub.name,
      cost: parseFloat(sub.cost),
      cycle: sub.cycle,
      renewDate: sub.renew_date,
      category: sub.category,
      icon: sub.icon,
      color: sub.color,
    })
  }

  return map
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['calendar-transactions', year, month],
    queryFn: () => getUnifiedTransactionsApi({ year, month, page_size: 500 }),
  })

  const { data: cardsData } = useQuery({
    queryKey: ['calendar-cards'],
    queryFn: getCardsApi,
  })

  const { data: subsData } = useQuery({
    queryKey: ['calendar-subs'],
    queryFn: () => getSubscriptionsApi({ status: 'active' }),
  })

  const cardIdsKey = (cardsData ?? []).map((c) => c.id).sort().join(',')

  const { data: billsData } = useQuery({
    queryKey: ['calendar-bills', cardIdsKey],
    queryFn: async () => {
      if (!cardsData || cardsData.length === 0) return new Map<number, Awaited<ReturnType<typeof getCardBillsApi>>>()
      const map = new Map<number, Awaited<ReturnType<typeof getCardBillsApi>>>()
      await Promise.all(
        cardsData.map(async (card) => {
          try {
            const bills = await getCardBillsApi(card.id)
            map.set(card.id, bills)
          } catch {
            map.set(card.id, [])
          }
        }),
      )
      return map
    },
    enabled: !!cardsData && cardsData.length > 0,
  })

  const eventsMap = useMemo(
    () => buildEventsMap(
      txData?.items ?? [],
      cardsData ?? [],
      billsData ?? new Map(),
      subsData?.items ?? [],
    ),
    [txData, cardsData, billsData, subsData],
  )

  const maxDailySpend = useMemo(() => {
    let max = 0
    for (const [, events] of eventsMap) {
      if (events.transactions && events.transactions.totalDebits > max) {
        max = events.transactions.totalDebits
      }
    }
    return max
  }, [eventsMap])

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return undefined
    return eventsMap.get(format(selectedDate, 'yyyy-MM-dd'))
  }, [selectedDate, eventsMap])

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((m) => subMonths(m, 1))
    setSelectedDate(null)
  }, [])

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((m) => addMonths(m, 1))
    setSelectedDate(null)
  }, [])

  const handleToday = useCallback(() => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }, [])

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-0">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground leading-tight tracking-tight">
                  {format(currentMonth, 'MMMM')}
                  <span className="text-muted-foreground font-normal ml-1.5">{format(currentMonth, 'yyyy')}</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 h-8 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <CalendarLegend />
        </div>

        {txLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <FinancialCalendar
            currentMonth={currentMonth}
            eventsMap={eventsMap}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            maxDailySpend={maxDailySpend}
          />
        )}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="shrink-0 overflow-hidden"
          >
            <DayDetailPanel
              date={selectedDate}
              events={selectedEvents}
              onClose={() => setSelectedDate(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
