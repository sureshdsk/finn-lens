import { useState } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Bell, Search } from 'lucide-react'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import NotificationCenter from './NotificationPanel'
import SyncIndicator from './SyncIndicator'

const viewLabels: Record<string, string> = {
  '/overview': 'Dashboard',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/calendar': 'Calendar',
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
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-sm font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-2">
            <SyncIndicator />
            <ThemeToggle />
            <button className="w-8 h-8 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center hover:bg-primary/[0.05] transition-all">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setNotifOpen(true)}
              className="w-8 h-8 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center hover:bg-primary/[0.05] transition-all relative"
            >
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
            </button>
            <div className="w-8 h-8 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">JD</span>
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
