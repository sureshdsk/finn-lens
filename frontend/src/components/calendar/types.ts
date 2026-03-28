export interface DayTransactions {
  date: string
  debits: { id: number; merchant: string; amount: number; category: string; description: string }[]
  credits: { id: number; merchant: string; amount: number; category: string; description: string }[]
  totalDebits: number
  totalCredits: number
}

export interface DayCCBill {
  id: number
  cardLabel: string
  dueDate: string
  totalDue: number
  isPaid: boolean
  paidDate: string | null
  statementDate: string
  kind: 'due' | 'paid'
}

export interface DaySubscription {
  id: number
  name: string
  cost: number
  cycle: string
  renewDate: string
  category: string
  icon: string
  color: string
}

export interface CalendarDayEvents {
  transactions: DayTransactions | null
  ccBills: DayCCBill[]
  subscriptions: DaySubscription[]
}

export type CalendarEventsMap = Map<string, CalendarDayEvents>
