import { API_URL, authHeaders, apiFetch } from './client'

export interface LoginResponse {
  token: string
}

export interface UserProfile {
  id: number
  username: string
  email: string
  is_staff: boolean
  display_name: string
  date_of_birth: string | null
  avatar_url: string
  currency: string
}

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

export async function getProfileApi(): Promise<UserProfile> {
  const res = await apiFetch(`${API_URL}/api/auth/me/`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export async function updateProfileApi(data: {
  display_name?: string
  date_of_birth?: string | null
  currency?: string
}): Promise<UserProfile> {
  const res = await apiFetch(`${API_URL}/api/auth/me/`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  return res.json()
}
