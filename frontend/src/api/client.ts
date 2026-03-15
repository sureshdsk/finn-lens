import { useAuthStore } from '@/stores/authStore'

export const API_URL = import.meta.env.VITE_API_URL ?? ''

export function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Wrapper around fetch that automatically handles 401s by logging out.
 * All API calls should use this instead of raw fetch.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)

  if (res.status === 401) {
    useAuthStore.getState().logout()
    // Force redirect — the AppLayout guard will handle showing login
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  return res
}
