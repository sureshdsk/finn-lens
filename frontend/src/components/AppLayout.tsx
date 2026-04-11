import { useState } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { getProfileApi } from '@/api/auth'
import { isDemoMode } from '@/lib/demo'
import { Search, Eye, Menu, X, TrendingUp } from 'lucide-react'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import PrivacyToggle from './PrivacyToggle'
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
  const [drawerOpen, setDrawerOpen] = useState(false)
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
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-64 z-50 shadow-xl">
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-3 right-3 z-50 w-8 h-8 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-3 md:px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden w-9 h-9 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted/80 transition-all"
              >
                <Menu className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary md:hidden" />
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SyncIndicator />
              <PrivacyToggle />
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

          <main className="flex-1 overflow-y-auto p-3 md:p-6">
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
