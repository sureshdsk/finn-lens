import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { DEMO_TOKEN } from '@/lib/demo'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  TrendingUp, BarChart3, Bell, Mail,
  ArrowRight, Shield, Zap, Layers, Github,
  Copy, Check, Key, Globe, Lock, ExternalLink, ChevronDown,
  Sparkles, Play, Code2, Container, Rocket,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const features = [
  { icon: Layers, title: 'Unified Dashboard', desc: 'Bank accounts, credit cards, and investments in one place. No more switching between 10 different apps.', gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-50 dark:bg-teal-950/30' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'AI-powered spending insights, category breakdowns, and monthly trends to understand your money habits.', gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { icon: Mail, title: 'Email Automation', desc: 'Automatically extract transactions, credit card bills, and investment data from your Gmail. Zero manual entry.', gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { icon: Bell, title: 'Bill Alerts', desc: 'Never miss a credit card payment. Upcoming bills, subscription renewals, and SIP dates at a glance.', gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  { icon: Shield, title: 'Hidden Charge Detection', desc: 'Automatically detect annual fees, late penalties, forex markups, and other charges you might be missing.', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { icon: Zap, title: 'Instant Setup', desc: 'Connect your Gmail and everything syncs automatically. Start tracking in under 2 minutes.', gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
]

const howItWorksSteps = [
  { num: '1', title: 'Pull signals from financial email', desc: 'Transactions, statements, bills, subscriptions, and holdings get normalized into one timeline.', gradient: 'from-teal-500 to-cyan-500' },
  { num: '2', title: 'Structure and classify automatically', desc: 'FinnLens groups merchants, categories, due dates, and balances without manual spreadsheet cleanup.', gradient: 'from-violet-500 to-purple-500' },
  { num: '3', title: 'Review one unified money system', desc: 'Daily spending, card liabilities, cash flow, and investment snapshots live in one place.', gradient: 'from-amber-500 to-orange-500' },
]

const demoStats = [
  { label: 'Accounts tracked', value: '12', color: 'text-teal-600 dark:text-teal-400' },
  { label: 'Bills detected', value: '18', color: 'text-violet-600 dark:text-violet-400' },
  { label: 'Messages parsed', value: '1,248', color: 'text-amber-600 dark:text-amber-400' },
]

const previewSignals = [
  { title: 'Statement sync complete', detail: 'HDFC, ICICI, Axis, AMEX', tone: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30', dot: 'bg-emerald-500' },
  { title: 'Upcoming card due', detail: 'AMEX Platinum due in 3 days', tone: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30', dot: 'bg-amber-500' },
  { title: 'Subscription spike', detail: '3 renewals detected this week', tone: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30', dot: 'bg-rose-500' },
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
      className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
    <div className="border border-blue-200 dark:border-blue-800 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 w-full px-4 py-3.5 text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center shrink-0">
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
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-blue-200/50 dark:border-blue-800/30">
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
                                <div className="bg-white/80 dark:bg-black/20 rounded-lg px-2.5 py-1 font-mono text-[10px] text-foreground overflow-x-auto pr-7 border border-black/5 dark:border-white/5">
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
    icon: Container,
    desc: 'One command to spin up everything — backend, frontend, worker, database, and cache.',
    color: 'text-teal-600 dark:text-teal-400',
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
    icon: Code2,
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
    label: 'Demo Mode',
    icon: Play,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/favicon-32x32.png" alt="FinnLens" className="h-8 w-8 rounded-lg" />
          <span className="block text-lg font-bold tracking-tight text-foreground">FinnLens</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href="https://github.com/sureshdsk/finn-lens" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg px-3 py-2">
            <Github className="w-4 h-4" /> Star on GitHub
          </a>
          <Button size="sm" className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-500/20 border-0" onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
            Try Demo
          </Button>
        </div>
      </nav>

      <section className="px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40 border border-teal-200/60 dark:border-teal-800/40 px-4 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Open source personal finance
            </div>
            <h1 className="max-w-xl text-[2.75rem] md:text-[3.5rem] font-bold tracking-[-0.035em] leading-[1.1] text-foreground">
              Your inbox already knows{' '}
              <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 dark:from-teal-400 dark:via-cyan-400 dark:to-teal-300 bg-clip-text text-transparent">where your money went.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              FinnLens turns bank alerts, card statements, investment emails, and renewals into one calm financial command center.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-500/25 border-0 text-white" onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Try Demo <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" size="lg" className="rounded-xl" onClick={() => document.getElementById('setup-section')?.scrollIntoView({ behavior: 'smooth' })}>
                <Rocket className="w-4 h-4 mr-2" /> Setup Instructions
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {demoStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white dark:bg-slate-900/80 border border-border/50 px-4 py-4 shadow-sm">
                  <div className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }} className="relative">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-teal-200/40 to-cyan-200/40 dark:from-teal-500/10 dark:to-cyan-500/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-gradient-to-br from-violet-200/30 to-pink-200/30 dark:from-violet-500/10 dark:to-pink-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border border-border/50 shadow-2xl shadow-black/8 dark:shadow-black/30">
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-3 py-0.5 text-[10px] font-semibold text-white tracking-wide">
                  WORKSPACE
                </div>
              </div>

              <div className="p-5 grid gap-4">
                <div className="rounded-2xl bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-teal-950/30 dark:via-cyan-950/30 dark:to-blue-950/30 p-5 border border-teal-100/60 dark:border-teal-800/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-teal-600 dark:text-teal-400">Net worth snapshot</p>
                      <h2 className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">₹14,82,900</h2>
                      <p className="mt-1.5 text-xs text-muted-foreground">Cash, cards, liabilities & investments.</p>
                    </div>
                    <div className="rounded-xl bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-right shadow-sm border border-border/30">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Month</div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+8.4%</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[
                      { label: 'Income', value: '2.79L', gradient: 'from-emerald-400 to-teal-400' },
                      { label: 'Spend', value: '1.95L', gradient: 'from-rose-400 to-pink-400' },
                      { label: 'SIP', value: '48k', gradient: 'from-teal-400 to-cyan-400' },
                      { label: 'Bills', value: '22k', gradient: 'from-amber-400 to-orange-400' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-white/70 dark:bg-slate-900/50 p-2.5 border border-border/20">
                        <div className={`h-1.5 w-8 rounded-full bg-gradient-to-r ${item.gradient}`} />
                        <div className="mt-2.5 text-base font-bold tabular-nums text-foreground">{item.value}</div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/40 bg-white/60 dark:bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-foreground">Categories</p>
                      <BarChart3 className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Housing', width: '84%', color: 'bg-gradient-to-r from-teal-400 to-cyan-400' },
                        { label: 'Food', width: '58%', color: 'bg-gradient-to-r from-amber-400 to-orange-400' },
                        { label: 'Transport', width: '42%', color: 'bg-gradient-to-r from-violet-400 to-purple-400' },
                        { label: 'Shopping', width: '36%', color: 'bg-gradient-to-r from-rose-400 to-pink-400' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground font-medium">{item.label}</span>
                            <span className="tabular-nums font-semibold text-foreground">{item.width}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-white/60 dark:bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-foreground">Signal queue</p>
                      <Bell className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="space-y-2">
                      {previewSignals.map((signal) => (
                        <div key={signal.title} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${signal.dot}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{signal.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{signal.detail}</p>
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

      <section id="features-section" className="px-6 py-24 bg-white/50 dark:bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-teal-600 dark:text-teal-400 mb-3">What the demo proves</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">A finance tool that feels operational,{' '}<span className="bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">not ornamental.</span></h2>
            <p className="mt-4 text-muted-foreground">
              The demo shows the product model clearly: structured extraction from messy financial inputs, a unified dashboard, and the useful follow-through around renewals, due dates, and trends.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`group bg-white dark:bg-slate-900/60 border border-border/50 rounded-2xl p-6 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-300 ${f.bg}`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} text-white flex items-center justify-center mb-4 shadow-md`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-teal-600 dark:text-teal-400 mb-3">System flow</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">From raw alerts to a usable money model</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {howItWorksSteps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border/50 bg-white dark:bg-slate-900/60 p-6 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center text-sm font-bold shrink-0 mb-4 shadow-md`}>
                  {s.num}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="setup-section" className="px-6 py-24 bg-white/50 dark:bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-teal-600 dark:text-teal-400 mb-3">Run it your way</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">Getting started without guesswork</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Demo mode is instant. Docker is the most complete path. Local development stays available when you want tighter iteration loops.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {setupModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveSetupTab(mode.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeSetupTab === mode.id
                    ? 'bg-white dark:bg-slate-900 border border-border text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-slate-900/40'
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
              <div className="bg-white dark:bg-slate-900/60 border border-border/50 rounded-2xl p-6 shadow-sm">
                <div className="mb-5">
                  <h3 className={`text-base font-bold ${mode.color} mb-1`}>{mode.label}</h3>
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
                            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl px-4 py-2.5 font-mono text-sm text-foreground overflow-x-auto border border-border/30">
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
                  <div className="mt-5 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Services will be available at:</p>
                    <div className="flex flex-wrap gap-3 text-xs font-mono">
                      {mode.ports.map((p) => (
                        <span key={p.addr} className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-foreground border border-border/30">{p.addr} <span className="text-muted-foreground">({p.label})</span></span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="login-section" className="px-6 py-24">
        <div className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-start">
          <div className="lg:pr-8">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-teal-600 dark:text-teal-400 mb-3">Enter the sandbox</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">The fastest path is one click.</h2>
            <p className="text-muted-foreground leading-7">
              This session uses fully mocked API responses, so you can inspect dashboards, categories, subscriptions, and sync flows without touching any real account.
            </p>
            <div className="mt-6 rounded-2xl border border-border/50 bg-white dark:bg-slate-900/60 p-5 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">Demo credentials</p>
              <div className="flex flex-wrap gap-3">
                <code className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm font-mono text-foreground border border-border/30">username: finnlens</code>
                <code className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm font-mono text-foreground border border-border/30">password: finnlens</code>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/90 border border-border/50 rounded-2xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">FinnLens</span>
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
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 border-0 shadow-lg shadow-teal-500/20">
                {loading ? 'Signing in...' : 'Open Demo Workspace'}
              </Button>
              <Button type="button" variant="outline" onClick={tryDemo} className="w-full rounded-xl">
                Quick Login as Demo User
              </Button>
            </form>

            <p className="text-[11px] text-muted-foreground text-center mt-4">
              Demo mode uses realistic mock data. No real API calls are made.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 px-6 py-8 text-center space-y-3 bg-white/30 dark:bg-slate-950/30">
        <p className="text-sm font-bold text-foreground">FinnLens | Personal Finance Intelligence</p>
        <div className="flex items-center justify-center gap-4">
          <a href="https://github.com/sureshdsk/finn-lens" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Github className="w-3.5 h-3.5" /> GitHub
          </a>
          <span className="text-xs text-muted-foreground">Open source under the MIT License</span>
        </div>
      </footer>
    </div>
  )
}
