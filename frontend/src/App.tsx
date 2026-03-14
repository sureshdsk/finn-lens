import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { StyleThemeProvider } from '@/contexts/StyleThemeContext'
import { DarkModeProvider } from '@/contexts/DarkModeContext'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import BankingDashboard from '@/pages/banking/BankingDashboard'
import AddAccountPage from '@/pages/banking/AddAccountPage'
import AccountDetailPage from '@/pages/banking/AccountDetailPage'
import OverviewPage from '@/pages/OverviewPage'
import TransactionsPage from '@/pages/TransactionsPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import CreditCardsPage from '@/pages/CreditCardsPage'
import BudgetsPage from '@/pages/BudgetsPage'
import SubscriptionsPage from '@/pages/SubscriptionsPage'
import InvestmentsPage from '@/pages/InvestmentsPage'
import AssetsPage from '@/pages/AssetsPage'
import LifeEventsPage from '@/pages/LifeEventsPage'
import WaitlistPage from '@/pages/WaitlistPage'
import NotificationsPage from '@/pages/NotificationsPage'
import SettingsPage from '@/pages/SettingsPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <StyleThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route path="/overview" element={<OverviewPage />} />
                <Route path="/banking" element={<BankingDashboard />} />
                <Route path="/banking/accounts/new" element={<AddAccountPage />} />
                <Route path="/banking/accounts/:id" element={<AccountDetailPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/credit-cards" element={<CreditCardsPage />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/investments" element={<InvestmentsPage />} />
                <Route path="/assets" element={<AssetsPage />} />
                <Route path="/life-events" element={<LifeEventsPage />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </StyleThemeProvider>
      </DarkModeProvider>
    </QueryClientProvider>
  )
}
