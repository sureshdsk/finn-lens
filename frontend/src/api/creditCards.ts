import { API_URL, authHeaders, apiFetch } from './client'

export interface CreditCard {
  id: number
  issuer: string
  card_last4: string
  card_name: string
  billing_day: number | null
  credit_limit: string | null
  currency: string
  transaction_count: number
  last_bill_total: string | null
  last_bill_date: string | null
}

export interface CreditCardBill {
  id: number
  statement_date: string
  due_date: string | null
  total_due: string | null
  min_due: string | null
  billing_period_start: string | null
  billing_period_end: string | null
  is_paid: boolean
  paid_date: string | null
  transaction_count: number
  transactions_total: string | null
  gmail_message_id: string | null
}

export interface CreditCardTransaction {
  id: number
  transaction_date: string
  transaction_time: string | null
  amount: string
  currency: string
  description: string
  merchant_name: string
  category: string
  category_confidence: number
  is_user_categorized: boolean
  source_type: string
}

export interface CCTransactionList {
  items: CreditCardTransaction[]
  total: number
  page: number
  page_size: number
}

export interface MaterializeResult {
  cards: number
  bills: number
  transactions: number
}

export async function getCardsApi(): Promise<CreditCard[]> {
  const res = await apiFetch(`${API_URL}/api/banking/cards/`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch cards')
  return res.json()
}

export async function createCardApi(data: {
  issuer: string
  card_last4: string
  card_name?: string
  billing_day?: number
  credit_limit?: string
  currency?: string
}): Promise<CreditCard> {
  const res = await apiFetch(`${API_URL}/api/banking/cards/`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Failed to create card')
  }
  return res.json()
}

export async function getCardBillsApi(cardId: number): Promise<CreditCardBill[]> {
  const res = await apiFetch(`${API_URL}/api/banking/cards/${cardId}/bills/`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch bills')
  return res.json()
}

export async function getCardTransactionsApi(
  cardId: number,
  params: {
    page?: number
    page_size?: number
    year?: number
    month?: number
    category?: string
    search?: string
    sort?: string
    bill_id?: number | 'unbilled'
  } = {}
): Promise<CCTransactionList> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  })
  const res = await apiFetch(`${API_URL}/api/banking/cards/${cardId}/transactions?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

export async function materializeCardsApi(): Promise<MaterializeResult> {
  const res = await apiFetch(`${API_URL}/api/banking/cards/materialize/`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to materialize card data')
  return res.json()
}

export async function classifyCardTransactionsApi(cardId: number): Promise<{ classified: number }> {
  const res = await apiFetch(`${API_URL}/api/banking/cards/${cardId}/classify/`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to classify transactions')
  return res.json()
}
