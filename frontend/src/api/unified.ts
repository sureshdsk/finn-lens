import { API_URL, authHeaders, apiFetch } from './client'

export interface UnifiedTransaction {
  id: number
  transaction_date: string
  amount: string
  currency: string
  merchant_name: string
  description: string
  category: string
  category_confidence: number
  instrument_type: string
  source_count: number
  credit_card_label: string | null
  bank_account_label: string | null
}

export interface UnifiedTransactionList {
  items: UnifiedTransaction[]
  total: number
  page: number
  page_size: number
}

export interface TransactionSource {
  id: number
  source_type: string
  raw_description: string
  raw_amount: string | null
  raw_currency: string
  priority: number
  email_subject: string | null
  gmail_message_id: string | null
}

export interface UnifiedTransactionDetail extends UnifiedTransaction {
  sources: TransactionSource[]
}

export interface CategoryBreakdown {
  category: string
  total: string
  count: number
}

export interface SpendingSummary {
  total_spending: string
  total_income: string
  transaction_count: number
  categories: CategoryBreakdown[]
}

export async function getUnifiedTransactionsApi(
  params: {
    page?: number
    page_size?: number
    instrument_type?: string
    category?: string
    year?: number
    month?: number
    search?: string
    sort?: string
    exclude_transfers?: boolean
  } = {}
): Promise<UnifiedTransactionList> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  })
  const res = await apiFetch(`${API_URL}/api/banking/transactions/unified/?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

export async function getUnifiedTransactionDetailApi(id: number): Promise<UnifiedTransactionDetail> {
  const res = await apiFetch(`${API_URL}/api/banking/transactions/unified/${id}/`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch transaction detail')
  return res.json()
}

export interface MonthlySpending {
  year: number
  month: number
  month_label: string
  income: string
  expense: string
  savings: string
}

export async function getMonthlySpendingApi(
  params: { year?: number } = {}
): Promise<MonthlySpending[]> {
  const qs = new URLSearchParams()
  if (params.year) qs.set('year', String(params.year))
  const res = await apiFetch(`${API_URL}/api/banking/spending/monthly/?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch monthly spending')
  return res.json()
}

export async function getSpendingSummaryApi(
  params: { year?: number; month?: number } = {}
): Promise<SpendingSummary> {
  const qs = new URLSearchParams()
  if (params.year) qs.set('year', String(params.year))
  if (params.month) qs.set('month', String(params.month))
  const res = await apiFetch(`${API_URL}/api/banking/spending/summary/?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch spending summary')
  return res.json()
}
