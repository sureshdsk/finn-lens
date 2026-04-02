import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'
import {
  LayoutDashboard, Wallet, ArrowDownUp, BarChart3,
  LineChart, Settings, LogOut, TrendingUp,
  ChevronLeft, ChevronRight, CalendarDays, Bell
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", route: "/overview" },
  { icon: Wallet, label: "Accounts", route: "/accounts" },
  { icon: ArrowDownUp, label: "Transactions", route: "/transactions" },
  { icon: BarChart3, label: "Analytics", route: "/analytics" },
  { icon: CalendarDays, label: "Calendar", route: "/calendar" },
  { icon: Bell, label: "Subscriptions", route: "/subscriptions" },
  { icon: LineChart, label: "Investments", route: "/investments" },
]

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`${collapsed ? "w-16" : "w-60"} h-full bg-muted/40 border-r border-border flex flex-col transition-all duration-300 shrink-0`}>
      <div className="p-4 flex items-center gap-2.5 border-b border-border">
        <TrendingUp className="w-5 h-5 text-primary shrink-0" />
        {!collapsed && <span className="font-semibold text-sm text-primary tracking-wide">FINNLENS</span>}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            onClick={onNavigate}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-border space-y-1">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`
          }
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 transition-all"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-full items-center justify-center py-2 text-muted-foreground hover:text-primary transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
