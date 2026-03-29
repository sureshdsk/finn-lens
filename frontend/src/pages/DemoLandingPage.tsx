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
  Terminal, Copy, Check, Key, Globe, Lock, ExternalLink, ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const features = [
  { icon: Layers, title: 'Unified Dashboard', desc: 'Bank accounts, credit cards, and investments in one place. No more switching between 10 different apps.', color: 'text-primary bg-primary/10' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'AI-powered spending insights, category breakdowns, and monthly trends to understand your money habits.', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30' },
  { icon: Mail, title: 'Email Automation', desc: 'Automatically extract transactions, credit card bills, and investment data from your Gmail. Zero manual entry.', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30' },
  { icon: Bell, title: 'Bill Alerts', desc: 'Never miss a credit card payment. Upcoming bills, subscription renewals, and SIP dates at a glance.', color: 'text-rose-500 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30' },
  { icon: Shield, title: 'Hidden Charge Detection', desc: 'Automatically detect annual fees, late penalties, forex markups, and other charges you might be missing.', color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30' },
  { icon: Zap, title: 'Instant Setup', desc: 'Connect your Gmail and everything syncs automatically. Start tracking in under 2 minutes.', color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30' },
]

const howItWorksSteps = [
  { num: '1', title: 'Pull signals from financial email', desc: 'Transactions, statements, bills, subscriptions, and holdings get normalized into one timeline.' },
  { num: '2', title: 'Structure and classify automatically', desc: 'FinnLens groups merchants, categories, due dates, and balances without manual spreadsheet cleanup.' },
  { num: '3', title: 'Review one unified money system', desc: 'Daily spending, card liabilities, cash flow, and investment snapshots live in one place.' },
]

const demoStats = [
  { label: 'Accounts tracked', value: '12' },
  { label: 'Bills detected', value: '18' },
  { label: 'Messages parsed', value: '1,248' },
]

const previewSignals = [
  { title: 'Statement sync complete', detail: 'HDFC, ICICI, Axis, AMEX', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  { title: 'Upcoming card due', detail: 'AMEX Platinum due in 3 days', tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  { title: 'Subscription spike', detail: '3 renewals detected this week', tone: 'text-rose-500 dark:text-rose-400 bg-rose-500/10' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

type CmdStep = { kind: 'cmd'; cmd: string; hint: string }
type OAuthStep = { kind: 'oauth' }
type SetupStep = CmdStep | OAuthStep

const oauthSubSteps = [
  {
    icon: Globe,
    title: 'Create a GCP Project',
    desc: 'Go to Google Cloud Console and create a new project (or select an existing one).',
    url: 'https://console.cloud.google.com',
  },
  {
    icon: Layers,
    title: 'Enable Gmail API',
    desc: 'Navigate to APIs & Services > Library, search for "Gmail API", and enable it.',
  },
  {
    icon: Shield,
    title: 'Configure OAuth Consent Screen',
    desc: 'Go to APIs & Services > OAuth consent screen. Choose "External" and add scopes: email, profile, gmail.readonly.',
  },
  {
    icon: Key,
    title: 'Create OAuth Credentials',
    desc: 'Under APIs & Services > Credentials, create a new "OAuth client ID" (Web application).',
    origins: ['http://localhost:5174', 'http://localhost', 'https://your-domain.com'],
    redirectUris: ['http://localhost:5174/oauth/google/callback', 'http://localhost/oauth/google/callback', 'https://your-domain.com/oauth/google/callback'],
  },
  {
    icon: Lock,
    title: 'Add credentials to backend/.env',
    desc: 'Append these variables to the .env file you created in the previous step.',
    envVars: [
      { key: 'GOOGLE_CLIENT_ID', desc: 'Your OAuth client ID' },
      { key: 'GOOGLE_CLIENT_SECRET', desc: 'Your OAuth client secret' },
      { key: 'GOOGLE_REDIRECT_URI', desc: 'http://localhost:5174/oauth/google/callback', value: 'http://localhost:5174/oauth/google/callback' },
      { key: 'GMAIL_TOKEN_ENCRYPTION_KEY', desc: 'Generate with:', value: 'uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"' },
    ],
  },
]

function OAuthAccordion() {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-dashed border-blue-300 dark:border-blue-800 rounded-lg bg-blue-50/30 dark:bg-blue-950/10">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 w-full px-4 py-3 text-left"
      >
        <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Mail className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">Configure Gmail Sync</span>

        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-blue-200/50 dark:border-blue-800/30 mt-0">
              <p className="text-xs text-muted-foreground pt-2">
                Set up Google OAuth to auto-extract transactions, bills, and investment data from your Gmail.
              </p>
              {oauthSubSteps.map((step, i) => (
                <div key={step.title} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{step.title}</span>
                      {step.url && (
                        <a href={step.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline">
                          Open Console <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
                    {'origins' in step && step.origins && (
                      <div className="mt-1.5 space-y-1">
                        <div>
                          <span className="text-[10px] font-medium text-foreground">Authorized origins: </span>
                          <span className="text-[10px] font-mono text-muted-foreground">{step.origins.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-foreground">Redirect URIs: </span>
                          <span className="text-[10px] font-mono text-muted-foreground">{step.redirectUris!.join(', ')}</span>
                        </div>
                      </div>
                    )}
                    {'envVars' in step && step.envVars && (
                      <div className="mt-2 space-y-1.5">
                        {step.envVars.map((v) => (
                          <div key={v.key}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <code className="text-[10px] font-semibold text-foreground">{v.key}</code>
                              <span className="text-[10px] text-muted-foreground">{v.desc}</span>
                            </div>
                            {v.value && (
                              <div className="relative mt-0.5">
                                <div className="bg-white/60 dark:bg-black/20 rounded px-2.5 py-1 font-mono text-[10px] text-foreground overflow-x-auto pr-7">
                                  {v.value}
                                </div>
                                <CopyButton text={v.value} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const setupModes = [
  {
    id: 'docker',
    label: 'Docker (Recommended)',
    icon: Terminal,
    desc: 'One command to spin up everything — backend, frontend, worker, database, and cache.',
    color: 'text-primary',
    steps: [
      { kind: 'cmd' as const, cmd: 'cp backend/.env.example backend/.env', hint: 'Copy the env template' },
      { kind: 'oauth' as const },
      { kind: 'cmd' as const, cmd: 'make docker-build', hint: 'Build all Docker images' },
      { kind: 'cmd' as const, cmd: 'make docker-up', hint: 'Start all services' },
      { kind: 'cmd' as const, cmd: 'make docker-migrate', hint: 'Run database migrations' },
      { kind: 'cmd' as const, cmd: 'make docker-createsuperuser', hint: 'Create your admin account' },
    ] as SetupStep[],
    ports: [
      { addr: 'localhost:5174', label: 'frontend' },
      { addr: 'localhost:8000', label: 'backend' },
    ],
  },
  {
    id: 'local',
    label: 'Local Development',
    icon: Terminal,
    desc: 'Run each service manually for maximum control and faster iteration.',
    color: 'text-amber-600 dark:text-amber-400',
    steps: [
      { kind: 'cmd' as const, cmd: 'cd backend && uv sync && cp .env.example .env', hint: 'Install deps and copy env template' },
      { kind: 'oauth' as const },
      { kind: 'cmd' as const, cmd: 'uv run python manage.py migrate', hint: 'Run database migrations' },
      { kind: 'cmd' as const, cmd: 'uv run python manage.py createsuperuser', hint: 'Create your admin account' },
      { kind: 'cmd' as const, cmd: 'cd frontend && pnpm install', hint: 'Install frontend dependencies' },
      { kind: 'cmd' as const, cmd: 'make -j4 up', hint: 'Start all services (redis, backend, worker, frontend)' },
    ] as SetupStep[],
  },
  {
    id: 'demo',
    label: 'Demo Mode (No Backend)',
    icon: Zap,
    desc: 'Zero-config mode with realistic mock data. No backend, database, or Redis needed.',
    color: 'text-violet-600 dark:text-violet-400',
    steps: [
      { kind: 'cmd' as const, cmd: 'cd frontend && pnpm install', hint: 'Install frontend dependencies' },
      { kind: 'cmd' as const, cmd: 'pnpm dev:demo', hint: 'Start dev server with demo mode enabled' },
      { kind: 'cmd' as const, cmd: 'Login with finnlens / finnlens', hint: 'Or click "Quick Login as Demo User"' },
    ] as SetupStep[],
  },
]

export default function DemoLandingPage() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSetupTab, setActiveSetupTab] = useState('docker')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    await new Promise(r => setTimeout(r, 600))

    if (username === 'finnlens' && password === 'finnlens') {
      setToken(DEMO_TOKEN)
      navigate('/overview')
      toast.success('Welcome to Demo Mode')
    } else {
      setError('Use finnlens:finnlens to enter demo mode')
    }
    setLoading(false)
  }

  function tryDemo() {
    setUsername('finnlens')
    setPassword('finnlens')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(26,166,153,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.14),_transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <nav className="border-b border-border/70 bg-background/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xl font-bold tracking-tight text-foreground">FinnLens</span>
            <span className="block text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Demo environment</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
            Enter Demo
          </Button>
        </div>
      </nav>

      <section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/75 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm mb-6">
              <Eye className="w-3.5 h-3.5 text-primary" />
              Live sandbox with zero signup
            </div>
            <h1 className="max-w-xl text-5xl md:text-6xl font-semibold tracking-[-0.04em] text-foreground">
              Your inbox already knows
              <span className="block text-primary">where your money went.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              FinnLens turns bank alerts, card statements, investment emails, and renewals into one calm financial command center. This demo runs on mocked data, but the product flow is real.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="shadow-lg shadow-primary/20" onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Try Demo <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById('setup-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Setup Instructions
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
              {demoStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm backdrop-blur">
                  <div className="text-2xl font-semibold tabular-nums text-foreground">{stat.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }} className="relative">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute -bottom-10 -left-6 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card/90 p-5 shadow-2xl shadow-black/10 backdrop-blur">
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                  Demo workspace
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-3xl bg-[linear-gradient(135deg,rgba(20,184,166,0.18),rgba(244,114,182,0.14))] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Net worth snapshot</p>
                      <h2 className="mt-2 text-3xl font-semibold tabular-nums text-foreground">₹14,82,900</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Cash, cards, liabilities, and investments reconciled from statements and alerts.</p>
                    </div>
                    <div className="rounded-2xl bg-background/75 px-3 py-2 text-right shadow-sm">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Month</div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+8.4%</div>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {[
                      { label: 'Income', value: '2.79L', color: 'bg-emerald-500/75' },
                      { label: 'Spend', value: '1.95L', color: 'bg-rose-500/70' },
                      { label: 'SIP', value: '48k', color: 'bg-primary/80' },
                      { label: 'Bills', value: '22k', color: 'bg-amber-500/75' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-background/70 p-3">
                        <div className={`h-1.5 w-10 rounded-full ${item.color}`} />
                        <div className="mt-3 text-lg font-semibold tabular-nums text-foreground">{item.value}</div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Detected categories</p>
                      <BarChart3 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: 'Housing', width: '84%' },
                        { label: 'Food', width: '58%' },
                        { label: 'Transport', width: '42%' },
                        { label: 'Shopping', width: '36%' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="tabular-nums text-foreground">{item.width}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary/80" style={{ width: item.width }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Financial signal queue</p>
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {previewSignals.map((signal) => (
                        <div key={signal.title} className="flex items-start gap-3 rounded-2xl bg-card px-3 py-3 shadow-sm">
                          <div className={`mt-0.5 h-9 w-9 shrink-0 rounded-2xl flex items-center justify-center ${signal.tone}`}>
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{signal.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{signal.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features-section" className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr] md:items-start mb-12">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-primary mb-3">What the demo proves</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">A finance tool that feels operational, not ornamental.</h2>
            </div>
            <p className="text-muted-foreground md:pt-1">
              The demo is built to show the product model clearly: structured extraction from messy financial inputs, a unified dashboard, and the useful follow-through around renewals, due dates, and trends.
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
                <div className={`w-11 h-11 rounded-2xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.22em] text-primary mb-3">System flow</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">From raw alerts to a usable money model</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
          {howItWorksSteps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl border border-border bg-card p-6 text-left shadow-sm"
            >
              <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 mb-4">
                {s.num}
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        </div>
      </section>

      <section id="setup-section" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.22em] text-primary mb-3">Run it your way</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-3">Getting started without guesswork</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Demo mode is instant. Docker is the most complete path. Local development stays available when you want tighter iteration loops.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {setupModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveSetupTab(mode.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSetupTab === mode.id
                    ? 'bg-card border border-border text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>

          {setupModes.map((mode) => (
            <motion.div
              key={mode.id}
              initial={false}
              animate={{ opacity: activeSetupTab === mode.id ? 1 : 0, y: activeSetupTab === mode.id ? 0 : 8 }}
              className={activeSetupTab === mode.id ? 'block' : 'hidden'}
            >
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className={`text-base font-semibold ${mode.color} mb-1`}>{mode.label}</h3>
                  <p className="text-sm text-muted-foreground">{mode.desc}</p>
                </div>
                <div className="space-y-4">
                  {mode.steps.map((step, i) => {
                    if (step.kind === 'oauth') {
                      return <OAuthAccordion key={`oauth-${i}`} />
                    }
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">{step.hint}</p>
                          <div className="relative">
                            <div className="bg-muted/80 rounded-lg px-4 py-2.5 font-mono text-sm text-foreground overflow-x-auto">
                              {step.cmd}
                            </div>
                            <CopyButton text={step.cmd} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {'ports' in mode && mode.ports && (
                  <div className="mt-5 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Services will be available at:</p>
                    <div className="flex flex-wrap gap-3 text-xs font-mono">
                      {mode.ports.map((p) => (
                        <span key={p.addr} className="px-2 py-1 rounded bg-muted text-foreground">{p.addr} <span className="text-muted-foreground">({p.label})</span></span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="login-section" className="px-6 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[0.9fr_1.1fr] items-start">
          <div className="lg:pr-8">
            <p className="text-xs uppercase tracking-[0.22em] text-primary mb-3">Enter the sandbox</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-4">The fastest path is one click.</h2>
            <p className="text-muted-foreground leading-7">
              This session uses fully mocked API responses, so you can inspect dashboards, categories, subscriptions, and sync flows without touching any real account.
            </p>
            <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">Demo credentials</p>
              <div className="flex flex-wrap gap-3">
                <code className="rounded-xl bg-muted px-3 py-2 text-sm font-mono text-foreground">username: finnlens</code>
                <code className="rounded-xl bg-muted px-3 py-2 text-sm font-mono text-foreground">password: finnlens</code>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Use the quick-login button to prefill the form, then enter the app and inspect the mocked workflow end to end.
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[28px] p-6 shadow-lg">
            <div className="flex items-center gap-2.5 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-lg font-bold tracking-tight text-primary">FinnLens</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-username">Username</Label>
                <Input id="demo-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="finnlens" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-password">Password</Label>
                <Input id="demo-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="finnlens" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Open Demo Workspace'}
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

      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">FinnLens demo</p>
      </footer>
    </div>
  )
}
