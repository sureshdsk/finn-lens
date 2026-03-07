import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  {
    label: 'Account Management',
    children: [
      { label: 'Bank Accounts', route: '/banking' },
    ],
  },
  {
    label: 'Transaction Management',
    children: [
      { label: 'Statement Upload', route: '/banking' },
      { label: 'Filtering & Search', route: '/banking' },
    ],
  },
  {
    label: 'Financial Management',
    children: [
      { label: 'Credit Cards', route: '/financial/credit-cards' },
      { label: 'Budget Planning', route: '/financial/budget' },
      { label: 'Subscriptions', route: '/financial/subscriptions' },
      { label: 'Debt & Loans', route: '/financial/debt' },
    ],
  },
  {
    label: 'Financial Insights',
    children: [
      { label: 'Core Insights', route: '/insights/core' },
      { label: 'Net Worth Tracking', route: '/insights/net-worth' },
      { label: 'Story Mode', route: '/insights/story' },
    ],
  },
  {
    label: 'Analytics & Reports',
    children: [
      { label: 'Trends', route: '/analytics/trends' },
      { label: 'Comparisons', route: '/analytics/comparisons' },
      { label: 'Export Reports', route: '/analytics/export' },
    ],
  },
  {
    label: 'Life-Event Intelligence',
    children: [
      { label: 'Major Decision Portal', route: '/life-events/decisions' },
      { label: 'Goal-Lock Friction', route: '/life-events/goals' },
    ],
  },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <aside className="w-56 shrink-0 border-r flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b">
        <span className="font-bold text-lg tracking-tight">FinnLens</span>
        <p className="text-xs text-muted-foreground mt-0.5">2.0</p>
      </div>
      <nav className="flex-1 flex flex-col gap-4 p-3 pt-4">
        {navItems.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.children.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.route}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
