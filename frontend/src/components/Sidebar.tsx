import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'
import {
  LayoutDashboard, Wallet, ArrowDownUp, BarChart3, CreditCard,
  Calculator, Bell, LineChart, Settings, LogOut, TrendingUp,
  ChevronLeft, ChevronRight, Milestone, ShoppingCart, Radio, Landmark
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", route: "/overview" },
  { icon: Wallet, label: "Accounts", route: "/banking" },
  { icon: ArrowDownUp, label: "Transactions", route: "/transactions" },
  { icon: BarChart3, label: "Analytics", route: "/analytics" },
  { icon: CreditCard, label: "Credit Cards", route: "/credit-cards" },
  { icon: Calculator, label: "Budgets", route: "/budgets" },
  { icon: Bell, label: "Subscriptions", route: "/subscriptions" },
  { icon: LineChart, label: "Investments", route: "/investments" },
  { icon: Landmark, label: "Assets", route: "/assets" },
  { icon: Milestone, label: "Life Events", route: "/life-events" },
  { icon: ShoppingCart, label: "Waitlist", route: "/waitlist" },
  { icon: Radio, label: "Control Center", route: "/notifications" },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`${collapsed ? "w-16" : "w-56"} h-screen terminal border-r neon-border flex flex-col transition-all duration-300 shrink-0`}>
      <div className="p-3 flex items-center gap-2 border-b border-border">
        <TrendingUp className="w-4 h-4 neon-text shrink-0" />
        {!collapsed && <span className="font-display font-bold text-[10px] neon-text tracking-[0.2em]">FINNLENS</span>}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            className={({ isActive }) =>
              `w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-mono uppercase tracking-wider transition-all ${
                isActive
                  ? "neon-text bg-[hsl(var(--neon-cyan))]/[0.08] neon-border border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-border space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-mono uppercase tracking-wider transition-all ${
              isActive
                ? "neon-text bg-primary/[0.08] neon-border border"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-xs font-mono uppercase tracking-wider text-muted-foreground hover:neon-magenta hover:bg-[hsl(var(--neon-magenta))]/[0.05] transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 text-muted-foreground hover:neon-text transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>
    </aside>
  )
}
