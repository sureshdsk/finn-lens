import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { isDemoMode } from '@/lib/demo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp } from 'lucide-react'
import DemoLandingPage from '@/pages/DemoLandingPage'

function LoginForm() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await loginApi(username, password)
      setToken(res.token)
      navigate('/overview')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 border rounded-xl shadow-lg flex flex-col gap-6 bg-card">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">FinnLens</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sign in to your account</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  if (isDemoMode()) {
    return <DemoLandingPage />
  }

  return <LoginForm />
}
