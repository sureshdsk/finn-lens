import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { StyleThemeProvider } from '@/contexts/StyleThemeContext'
import { DarkModeProvider } from '@/contexts/DarkModeContext'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import AddAccountPage from '@/pages/banking/AddAccountPage'
import AccountDetailPage from '@/pages/banking/AccountDetailPage'
import OverviewPage from '@/pages/OverviewPage'
import AccountsPage from '@/pages/AccountsPage'
import TransactionsPage from '@/pages/TransactionsPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import CardDetailPage from '@/pages/CardDetailPage'
import CalendarPage from '@/pages/CalendarPage'
import BudgetsPage from '@/pages/BudgetsPage'
import SubscriptionsPage from '@/pages/SubscriptionsPage'
import InvestmentsPage from '@/pages/InvestmentsPage'
import AssetsPage from '@/pages/AssetsPage'
import LifeEventsPage from '@/pages/LifeEventsPage'
import WaitlistPage from '@/pages/WaitlistPage'
import NotificationsPage from '@/pages/NotificationsPage'
import SettingsPage from '@/pages/SettingsPage'
import OAuthCallbackPage from '@/pages/OAuthCallbackPage'

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
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/accounts/new" element={<AddAccountPage />} />
                <Route path="/accounts/:id" element={<AccountDetailPage />} />
                <Route path="/accounts/cards/:id" element={<CardDetailPage />} />
                {/* Legacy redirects */}
                <Route path="/banking" element={<Navigate to="/accounts" replace />} />
                <Route path="/banking/accounts/new" element={<Navigate to="/accounts/new" replace />} />
                <Route path="/banking/accounts/:id" element={<AccountDetailPage />} />
                <Route path="/credit-cards" element={<Navigate to="/accounts" replace />} />
                <Route path="/credit-cards/:id" element={<CardDetailPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/investments" element={<InvestmentsPage />} />
                <Route path="/assets" element={<AssetsPage />} />
                <Route path="/life-events" element={<LifeEventsPage />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="/oauth/google/callback" element={<OAuthCallbackPage />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </StyleThemeProvider>
      </DarkModeProvider>
    </QueryClientProvider>
  )
}
