import { useAuthStore } from '@/stores/authStore'

const API_URL = import.meta.env.VITE_API_URL ?? ''

function authHeaders() {
  const token = useAuthStore.getState().token
  return {
    Authorization: `Bearer ${token}`,
  }
}

export interface BankAccount {
  id: number
  bank_name: string
  account_number: string
  account_holder_name: string
  currency: string
  transaction_count: number
}

export interface Transaction {
  id: number
  transaction_date: string
  value_date: string
  description: string
  cheque_number: string | null
  debit: string | null
  credit: string | null
  balance: string
  category: string
  category_confidence: number
  merchant_name: string
  payment_channel: string
  recipient_name: string
  upi_handle: string
  is_user_categorized: boolean
}

export interface TransactionList {
  items: Transaction[]
  total: number
  page: number
  page_size: number
}

export interface MonthlySummary {
  year: number
  month: number
  total_debit: string
  total_credit: string
  net: string
}

export interface UploadResult {
  imported: number
  classified: number
  account_id: number
}

export async function getAccountsApi(): Promise<BankAccount[]> {
  const res = await fetch(`${API_URL}/api/banking/accounts/`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch accounts')
  return res.json()
}

export async function createAccountApi(data: {
  bank_name: string
  account_number?: string
  account_holder_name?: string
  currency?: string
}): Promise<BankAccount> {
  const res = await fetch(`${API_URL}/api/banking/accounts/`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Failed to create account')
  }
  return res.json()
}

export async function getTransactionsApi(
  accountId: number,
  params: {
    page?: number
    page_size?: number
    year?: number
    month?: number
    type?: 'debit' | 'credit'
    search?: string
    category?: string
    date_from?: string
    date_to?: string
    sort?: string
  } = {}
): Promise<TransactionList> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  })
  const res = await fetch(`${API_URL}/api/banking/accounts/${accountId}/transactions/?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

export async function uploadStatementApi(accountId: number, file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_URL}/api/banking/accounts/${accountId}/upload/`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Upload failed')
  }
  return res.json()
}

export async function getMonthlySummaryApi(year: number): Promise<MonthlySummary[]> {
  const res = await fetch(`${API_URL}/api/banking/summary/?year=${year}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch summary')
  return res.json()
}
