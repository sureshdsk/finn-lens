import { API_URL, authHeaders, apiFetch } from './client'

export interface Subscription {
  id: number
  name: string
  category: string
  cost: string
  currency: string
  cycle: 'monthly' | 'yearly'
  renew_date: string | null
  status: 'active' | 'cancelled' | 'paused'
  icon: string
  color: string
  description: string
  start_date: string | null
  payment_method: string
  plan: string
  total_spent: string | null
  last_billed: string | null
  auto_renew: boolean
  source: string
  confidence: number
  payment_count: number
}

export interface SubscriptionList {
  items: Subscription[]
  total: number
}

export interface DetectResult {
  detected: number
  created: number
  payments_linked: number
}

export async function getSubscriptionsApi(params?: {
  status?: string
  category?: string
}): Promise<SubscriptionList> {
  const qs = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) qs.set(k, v)
    })
  }
  const res = await apiFetch(`${API_URL}/api/banking/subscriptions/?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch subscriptions')
  return res.json()
}

export async function updateSubscriptionApi(
  id: number,
  data: { status?: string; auto_renew?: boolean; category?: string; name?: string }
): Promise<Subscription> {
  const res = await apiFetch(`${API_URL}/api/banking/subscriptions/${id}/`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update subscription')
  return res.json()
}

export async function detectSubscriptionsApi(): Promise<DetectResult> {
  const res = await apiFetch(`${API_URL}/api/banking/subscriptions/detect/`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to detect subscriptions')
  return res.json()
}
