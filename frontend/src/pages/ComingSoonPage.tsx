import { Card, CardContent } from '@/components/ui/card'

const featureCards: Record<string, { title: string; description: string; items: string[] }> = {
  '/financial/credit-cards': {
    title: 'Credit Cards',
    description: 'Track credit card spending, statements, and bill insights.',
    items: ['Statement Processing', 'Bill Insights', 'Gmail Sync'],
  },
  '/financial/budget': {
    title: 'Budget Planning',
    description: 'Set budgets, track spending against limits, and get alerts.',
    items: ['Category Budgets', 'Sleeper Alert', 'Monthly Overview'],
  },
  '/financial/subscriptions': {
    title: 'Subscriptions',
    description: 'Monitor recurring subscriptions and spot unused services.',
    items: ['Auto-detection', 'Renewal Alerts', 'Cost Summary'],
  },
  '/financial/debt': {
    title: 'Debt & Loans',
    description: 'Track loans and optimize repayment strategies.',
    items: ['Loan Overview', 'Payoff Optimizer', 'Interest Calculator'],
  },
  '/insights/core': {
    title: 'Core Insights',
    description: 'AI-powered insights into your spending patterns and financial health.',
    items: ['Spending Patterns', 'Behavioral Analysis', 'Financial Health Score'],
  },
  '/insights/net-worth': {
    title: 'Net Worth Tracking',
    description: 'Track your total net worth across all assets and liabilities.',
    items: ['Portfolio Engine', 'Dual Timeline Viz', 'Asset Management (land, gold)'],
  },
  '/insights/story': {
    title: 'Story Mode',
    description: 'Spotify Wrapped-style annual financial story.',
    items: ['Year in Review', 'Shareable Cards', 'Top Categories'],
  },
  '/analytics/trends': {
    title: 'Trends',
    description: 'Visualize spending and income trends over time.',
    items: ['Monthly Trends', 'Category Breakdown', 'Year-over-Year'],
  },
  '/analytics/comparisons': {
    title: 'Comparisons',
    description: 'Compare spending across time periods and categories.',
    items: ['Period Comparison', 'Category vs Budget', 'Account Comparison'],
  },
  '/analytics/export': {
    title: 'Export Reports',
    description: 'Export your financial data in various formats.',
    items: ['CSV Export', 'PDF Reports', 'Custom Date Ranges'],
  },
  '/life-events/decisions': {
    title: 'Major Decision Portal',
    description: 'Get financial impact analysis for major life decisions.',
    items: ['Buy vs Rent', 'Career Change Impact', 'Investment Scenarios'],
  },
  '/life-events/goals': {
    title: 'Goal-Lock Friction',
    description: 'Set goals and create friction to protect long-term savings.',
    items: ['Goal Setting', 'Lock Periods', 'Progress Tracking'],
  },
}

export default function ComingSoonPage() {
  const path = window.location.pathname
  const feature = featureCards[path]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{feature?.title ?? 'Coming Soon'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {feature?.description ?? 'This feature is under development.'}
        </p>
      </div>

      {feature && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {feature.items.map((item) => (
            <Card key={item} className="opacity-60">
              <CardContent className="p-5">
                <p className="font-medium text-sm">{item}</p>
                <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 p-4 rounded-lg border border-dashed text-center">
        <p className="text-sm text-muted-foreground">This feature is on the roadmap for FinnLens 2.0</p>
      </div>
    </div>
  )
}
