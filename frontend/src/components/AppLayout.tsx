import { useState } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { getProfileApi } from '@/api/auth'
import { isDemoMode } from '@/lib/demo'
import { Search, Eye } from 'lucide-react'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import NotificationCenter from './NotificationPanel'
import SyncIndicator from './SyncIndicator'

const viewLabels: Record<string, string> = {
  '/overview': 'Overview',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/calendar': 'Calendar',
  '/subscriptions': 'Subscriptions',
  '/investments': 'Investments',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const token = useAuthStore((s) => s.token)
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getProfileApi,
    enabled: !!token,
  })

  if (!token) return <Navigate to="/login" replace />

  const currentPath = '/' + location.pathname.split('/')[1]
  const title = viewLabels[currentPath] || 'FinnLens'

  const avatarUrl = profile?.avatar_url
  const initials = (profile?.display_name || profile?.username || "JD").slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {isDemoMode() && (
        <div className="shrink-0 bg-primary/10 text-primary text-xs font-medium px-4 py-1 text-center flex items-center justify-center gap-1.5">
          <Eye className="w-3 h-3" />
          Demo Mode — all data is mocked
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-2">
            <SyncIndicator />
            <ThemeToggle />
            <button className="w-9 h-9 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted/80 transition-all">
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-lg border border-border object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
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
    </div>
  )
}
