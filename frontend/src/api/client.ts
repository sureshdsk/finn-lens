import { useAuthStore } from '@/stores/authStore'
import { isDemoMode } from '@/lib/demo'
import { handleMockRequest } from './mockHandlers'

export const API_URL = import.meta.env.VITE_API_URL ?? ''

export function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (isDemoMode()) {
    return handleMockRequest(input, init)
  }

  const res = await fetch(input, init)

  if (res.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  return res
}
