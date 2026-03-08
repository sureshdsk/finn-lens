import { useAuthStore } from '@/stores/authStore'

const API_URL = import.meta.env.VITE_API_URL ?? ''

function authHeaders() {
  const token = useAuthStore.getState().token
  return {
    Authorization: `Bearer ${token}`,
  }
}

export interface ClassifyResult {
  classified: number
  total: number
  account_id: number
}

export interface Category {
  slug: string
  label: string
}

export async function classifyAccountApi(accountId: number): Promise<ClassifyResult> {
  const res = await fetch(`${API_URL}/api/classifier/accounts/${accountId}/classify/`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Classification failed')
  return res.json()
}

export async function overrideCategoryApi(
  transactionId: number,
  category: string
): Promise<{ id: number; category: string; is_user_categorized: boolean }> {
  const res = await fetch(`${API_URL}/api/classifier/transactions/${transactionId}/category/`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  })
  if (!res.ok) throw new Error('Failed to update category')
  return res.json()
}

export async function getCategoriesApi(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/classifier/categories/`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}
