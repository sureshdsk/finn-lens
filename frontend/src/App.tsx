import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import BankingDashboard from '@/pages/banking/BankingDashboard'
import AddAccountPage from '@/pages/banking/AddAccountPage'
import AccountDetailPage from '@/pages/banking/AccountDetailPage'
import ComingSoonPage from '@/pages/ComingSoonPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/banking" element={<BankingDashboard />} />
            <Route path="/banking/accounts/new" element={<AddAccountPage />} />
            <Route path="/banking/accounts/:id" element={<AccountDetailPage />} />
            <Route path="/financial/*" element={<ComingSoonPage />} />
            <Route path="/insights/*" element={<ComingSoonPage />} />
            <Route path="/analytics/*" element={<ComingSoonPage />} />
            <Route path="/life-events/*" element={<ComingSoonPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/banking" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
