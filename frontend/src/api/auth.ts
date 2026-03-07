const API_URL = import.meta.env.VITE_API_URL ?? ''

export interface LoginResponse {
  token: string
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
