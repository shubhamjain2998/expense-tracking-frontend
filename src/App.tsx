import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { ToastContainer } from './components/ui/Toast'
import { ToastContext } from './hooks/useToastContext'
import { ThemeContext } from './hooks/useThemeContext'
import { useToast } from './hooks/useToast'
import { useTheme } from './hooks/useTheme'
import { DashboardPage } from './pages/DashboardPage'
import { UploadPage } from './pages/UploadPage'
import { ReviewPage } from './pages/ReviewPage'
import { BudgetPage } from './pages/BudgetPage'
import { SettingsPage } from './pages/SettingsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { NotFoundPage } from './pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function AppWithProviders() {
  const { toasts, toast, dismiss } = useToast()
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ToastContext.Provider value={toast}>
        <div data-theme={theme}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/review" element={<ReviewPage />} />
                  <Route path="/budget" element={<BudgetPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
          <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </div>
      </ToastContext.Provider>
    </ThemeContext.Provider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppWithProviders />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
