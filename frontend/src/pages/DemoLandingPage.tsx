import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { DEMO_TOKEN } from '@/lib/demo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  TrendingUp, BarChart3, Bell, Mail,
  ArrowRight, Shield, Zap, Eye, Layers,
} from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  { icon: Layers, title: 'Unified Dashboard', desc: 'Bank accounts, credit cards, and investments in one place. No more switching between 10 different apps.', color: 'text-primary bg-primary/10' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'AI-powered spending insights, category breakdowns, and monthly trends to understand your money habits.', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30' },
  { icon: Mail, title: 'Email Automation', desc: 'Automatically extract transactions, credit card bills, and investment data from your Gmail. Zero manual entry.', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30' },
  { icon: Bell, title: 'Bill Alerts', desc: 'Never miss a credit card payment. Upcoming bills, subscription renewals, and SIP dates at a glance.', color: 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30' },
  { icon: Shield, title: 'Hidden Charge Detection', desc: 'Automatically detect annual fees, late penalties, forex markups, and other charges you might be missing.', color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30' },
  { icon: Zap, title: 'Instant Setup', desc: 'Connect your Gmail and everything syncs automatically. Start tracking in under 2 minutes.', color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30' },
]

const steps = [
  { num: '1', title: 'Connect Gmail', desc: 'Secure OAuth flow — we only read financial emails.' },
  { num: '2', title: 'Auto-Extract', desc: 'AI parses bank statements, credit card bills, and investment emails.' },
  { num: '3', title: 'Track Everything', desc: 'Unified view of spending, investments, subscriptions, and more.' },
]

export default function DemoLandingPage() {
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

    await new Promise(r => setTimeout(r, 600))

    if (username === 'demo' && password === 'demo') {
      setToken(DEMO_TOKEN)
      navigate('/overview')
      toast.success('Welcome to Demo Mode')
    } else {
      setError('Use demo:demo to enter demo mode')
    }
    setLoading(false)
  }

  function tryDemo() {
    setUsername('demo')
    setPassword('demo')
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">FinnLens</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">Personal finance tracker</span>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 md:py-28 max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Eye className="w-3.5 h-3.5" />
            Try the live demo — no signup required
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Your finances,<br />
            <span className="text-primary">finally unified</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            FinnLens automatically extracts financial data from your email — bank transactions,
            credit card statements, investment holdings, and subscriptions — all in one dashboard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button size="lg" onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
              Try Demo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}>
              Learn More
            </Button>
          </div>
        </motion.div>

        {/* Dashboard preview mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-16 relative">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 text-left overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs text-muted-foreground ml-2">finnlens.com — Dashboard</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Income', value: '₹2,79,200', color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Spending', value: '₹1,95,000', color: 'text-rose-500' },
                { label: 'Savings', value: '₹84,200', color: 'text-primary' },
                { label: 'Investments', value: '₹4,29,750', color: 'text-amber-600 dark:text-amber-400' },
              ].map(c => (
                <div key={c.label} className="bg-muted/30 rounded-lg p-3">
                  <div className={`text-lg font-semibold ${c.color}`}>{c.value}</div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 h-32 flex flex-col justify-end gap-1">
            {[
              { label: 'Housing', width: '80%' },
              { label: 'Food', width: '55%' },
              { label: 'Transport', width: '40%' },
            ].map(({ label, width }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width }} />
                </div>
              </div>
                ))}
              </div>
              <div className="bg-muted/30 rounded-lg p-3 h-32 flex items-end gap-1">
                {[40, 65, 50, 80, 55, 35].map((h, i) => (
                  <div key={i} className="flex-1 flex gap-[2px] items-end">
                    <div className="w-[45%] bg-primary/50 rounded-t" style={{ height: `${h}%` }} />
                    <div className="w-[45%] bg-accent/50 rounded-t" style={{ height: `${h * 0.7}%` }} />
                  </div>
                ))}
              </div>
              <div className="bg-muted/30 rounded-lg p-3 h-32">
                <div className="text-xs text-muted-foreground mb-2">Recent</div>
                {['Amazon', 'Swiggy', 'Netflix'].map(t => (
                  <div key={t} className="flex items-center justify-between text-xs py-1">
                    <span className="text-foreground">{t}</span>
                    <span className="text-muted-foreground">•••</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -inset-px bg-gradient-to-b from-primary/20 to-transparent rounded-xl -z-10 blur-sm" />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features-section" className="px-6 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">Everything you need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Stop juggling between banking apps, email, and spreadsheets. FinnLens brings it all together.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center mb-3`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-12 text-center">How it works</h2>
        <div className="space-y-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-5"
            >
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                {s.num}
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA / Login */}
      <section id="login-section" className="px-6 py-20 bg-muted/30">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Try the demo</h2>
            <p className="text-sm text-muted-foreground">Enter <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">demo</code> / <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">demo</code> or click below</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2.5 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-lg font-bold tracking-tight text-primary">FinnLens</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-username">Username</Label>
                <Input id="demo-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="demo" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-password">Password</Label>
                <Input id="demo-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <Button type="button" variant="outline" onClick={tryDemo} className="w-full">
                Quick Login as Demo User
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Demo mode uses realistic mock data. No real API calls are made.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">FinnLens — Personal finance tracker built for India</p>
      </footer>
    </div>
  )
}
