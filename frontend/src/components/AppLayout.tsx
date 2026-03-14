import { useState } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Bell, Search, Terminal } from 'lucide-react'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import NotificationCenter from './NotificationPanel'

const viewLabels: Record<string, string> = {
  '/overview': 'Dashboard',
  '/banking': 'Accounts',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/credit-cards': 'Credit Cards',
  '/budgets': 'Budgets',
  '/subscriptions': 'Subscriptions',
  '/investments': 'Investments',
  '/assets': 'Asset Management',
  '/life-events': 'Life Events',
  '/waitlist': 'Purchase Waitlist',
  '/notifications': 'Control Center',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const token = useAuthStore((s) => s.token)
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  if (!token) return <Navigate to="/login" replace />

  const currentPath = '/' + location.pathname.split('/')[1]
  const title = viewLabels[currentPath] || 'FinnLens'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-10 terminal border-b neon-border px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 neon-text" />
            <div>
              <h1 className="text-xs font-display font-bold uppercase tracking-wider text-foreground">{title}</h1>
              <p className="text-[9px] text-muted-foreground font-mono">{'>'} system status: operational</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="w-8 h-8 rounded-sm terminal neon-border flex items-center justify-center hover:bg-primary/[0.05] transition-all">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setNotifOpen(true)}
              className="w-8 h-8 rounded-sm terminal neon-border flex items-center justify-center hover:bg-primary/[0.05] transition-all relative"
            >
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[hsl(var(--neon-magenta))] shadow-[var(--glow-magenta)] animate-pulse" />
            </button>
            <div className="w-8 h-8 rounded-sm terminal neon-border flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold neon-text">JD</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>

      <NotificationCenter
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onNavigate={(route) => { navigate(route); setNotifOpen(false); }}
        onExpand={() => { setNotifOpen(false); navigate('/notifications'); }}
      />
    </div>
  )
}
