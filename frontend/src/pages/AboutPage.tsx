import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, Heart, Sparkles, Zap, Eye, Layers,
  BarChart3, Mail, Bot, Calendar, Gift,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const timeline = [
  {
    date: 'December 2024',
    title: 'The Spark',
    description: 'Spotify Wrapped drops. Everyone shares their year in music. I wonder — what if you could do this for your spending? A "Year in Payments" Wrapped.',
    icon: Sparkles,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    date: 'January 2025',
    title: 'FinnLens v1 — Payments Wrapped',
    description: 'Built a browser-only React app that processes Google Pay Takeout CSVs. Zero backend, zero API calls — everything runs locally with JSZip and PapaParse. You upload your Takeout zip, and it generates 8-10 personalized financial insights in a story-mode format with swipe navigation. Shareable 1080x1080 images for social media.',
    icon: Gift,
    color: 'text-primary',
    bg: 'bg-primary/10',
    link: { label: 'finnlens.com', url: 'https://finnlens.com' },
  },
  {
    date: 'February 2025',
    title: 'Deployed & Shared',
    description: 'Deployed on Cloudflare Pages. People loved the concept — a privacy-first way to look back at their spending. But the feedback was clear: "This is cool, but I want to see ALL my finances, not just Google Pay."',
    icon: Zap,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    date: 'March 2025',
    title: 'The Realization',
    description: 'Google Pay is just one piece. People have 5+ bank accounts, 3 credit cards, SIPs on Groww, subscriptions on everything. The real problem is not analytics — it\'s aggregation. All your financial data lives in email. Gmail is the universal bank statement.',
    icon: Mail,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    date: 'March 2026',
    title: 'FinnLens 2.0 — Building Begins',
    description: 'Started building a real backend. Django + Django Bolt (Rust-powered API). Added Gmail OAuth for read-only email access. Built parsers for credit card statements, SIP confirmations, subscription receipts. Integrated GLiNER and GLiClass ML models for transaction classification. Added PDF statement parsing with pdfplumber. All of this in the span of a month.',
    icon: Layers,
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
  },
  {
    date: 'March 2026',
    title: 'FOSShack 2026 — The Reveal',
    description: 'FinnLens 2.0 debuts at FOSShack 2026. A full personal finance dashboard: unified transactions from banks and credit cards, investment portfolio tracking, subscription management, bill alerts, spending analytics, and a simulated Gmail sync pipeline. Built with Django, React 19, Tailwind CSS v4, and shadcn/ui.',
    icon: Calendar,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    highlight: true,
  },
]

const principles = [
  { icon: Eye, title: 'Privacy First', desc: 'Self-hosted — your data never leaves your machine. No third-party data brokers, no telemetry, no tracking.' },
  { icon: Zap, title: 'Zero Manual Entry', desc: 'Upload a PDF statement or connect Gmail. That\'s it. No manual transaction logging, no credential sharing with banks.' },
  { icon: BarChart3, title: 'Real Insights', desc: 'Spending trends, category breakdowns, bill alerts, subscription tracking. Work in progress — a lot more to build.' },
  { icon: Bot, title: 'ML-Powered', desc: 'GLiNER for entity extraction, GLiClass for transaction classification. Getting better with every iteration.' },
]

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
          {/* Hero */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Built for FOSShack 2026</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              The Story of FinnLens
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              What started as a fun weekend project — a Spotify Wrapped for your Google Pay transactions —
              became a full-blown personal finance platform. This is how it happened.
            </p>
          </div>

          {/* Timeline */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-8">Timeline</h2>
            <div className="relative">
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-8">
                {timeline.map((item, i) => (
                  <motion.div
                    key={item.date}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="relative flex gap-5"
                  >
                    <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center shrink-0 relative z-10 border border-background`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className={`flex-1 ${item.highlight ? 'bg-muted/50 border border-border rounded-xl p-5' : 'pt-1'}`}>
                      <div className="text-xs text-muted-foreground mb-1">{item.date}</div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                      {item.link && (
                        <a
                          href={item.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          {item.link.label} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Principles */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-6">Design Principles</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {principles.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <p.icon className="w-5 h-5 text-primary mb-2" />
                  <h3 className="text-sm font-semibold text-foreground mb-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* V1 → V2 comparison */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-6">v1 vs v2</h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground"></th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">v1 — Wrapped</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">v2 — Dashboard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ['Data source', 'Google Pay Takeout CSV', 'Gmail (auto-sync)'],
                    ['Processing', 'Client-side JS', 'Django + ML pipeline'],
                    ['Coverage', 'Google Pay only', 'Banks, CCs, SIPs, Subs'],
                    ['Backend', 'None', 'Django Bolt (Rust)'],
                    ['ML', 'None', 'GLiNER + GLiClass'],
                    ['Auth', 'None', 'JWT + Google OAuth'],
                    ['PDF parsing', 'None', 'pdfplumber'],
                    ['UI', 'Story mode (swipe)', 'Full dashboard + analytics'],
                    ['Deployment', 'Cloudflare Pages', 'Self-hosted'],
                  ].map(([label, v1, v2]) => (
                    <tr key={label}>
                      <td className="py-2.5 px-4 text-muted-foreground">{label}</td>
                      <td className="py-2.5 px-4 text-center text-foreground">{v1}</td>
                      <td className="py-2.5 px-4 text-center text-primary font-medium">{v2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tech stack */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {[
                'React 19', 'Vite', 'Tailwind CSS v4', 'shadcn/ui', 'TanStack Query',
                'Django 6', 'Django Bolt', 'GLiNER', 'GLiClass', 'pdfplumber',
                'Python 3.12', 'TypeScript', 'Zustand', 'Framer Motion',
                'Google OAuth 2.0', 'PostgreSQL',
              ].map(tech => (
                <span key={tech} className="px-2.5 py-1 bg-muted text-xs font-medium text-foreground rounded-full">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Made with <Heart className="w-3.5 h-3.5 inline text-rose-500" /> by{' '}
              <a
                href="https://x.com/sureshdsk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                @sureshdsk
              </a>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Chennai, India</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
