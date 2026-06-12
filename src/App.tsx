import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/layout/Layout'
import { BackendStatus } from './components/ui/BackendStatus'
import { Skeleton } from './components/ui/Skeleton'
import { ToastContainer } from './components/ui/Toast'
import { AuthProvider } from './contexts/AuthContext'
import { useTheme } from './hooks/useTheme'
import { ThemeContext } from './hooks/useThemeContext'
import { useToast } from './hooks/useToast'
import { ToastContext } from './hooks/useToastContext'
import { IS_DEV } from './lib/config'

// Pages export named functions; the .then(...) shim adapts them to React.lazy's default-export contract.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const UploadPage = lazy(() => import('./pages/UploadPage').then((m) => ({ default: m.UploadPage })))
const BudgetPage = lazy(() => import('./pages/BudgetPage').then((m) => ({ default: m.BudgetPage })))
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const TransactionsPage = lazy(() =>
  import('./pages/TransactionsPage').then((m) => ({ default: m.TransactionsPage }))
)
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function RouteFallback() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton className="mb-4 h-10 w-72" />
      <Skeleton className="mb-2 h-5 w-full" />
      <Skeleton className="mb-2 h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  )
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  // A second ErrorBoundary inside each route prevents one crashed page from
  // blanking the whole app — only that route's content is replaced.
  return <ErrorBoundary>{children}</ErrorBoundary>
}

function AppWithProviders() {
  const { toasts, toast, dismiss } = useToast()
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ToastContext.Provider value={toast}>
        <div data-theme={theme}>
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedPage>
                            <DashboardPage />
                          </ProtectedPage>
                        }
                      />
                      <Route
                        path="/upload"
                        element={
                          <ProtectedPage>
                            <UploadPage />
                          </ProtectedPage>
                        }
                      />
                      <Route path="/review" element={<Navigate to="/transactions" replace />} />
                      <Route
                        path="/budget"
                        element={
                          <ProtectedPage>
                            <BudgetPage />
                          </ProtectedPage>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <ProtectedPage>
                            <SettingsPage />
                          </ProtectedPage>
                        }
                      />
                      <Route
                        path="/transactions"
                        element={
                          <ProtectedPage>
                            <TransactionsPage />
                          </ProtectedPage>
                        }
                      />
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
          <ToastContainer toasts={toasts} onDismiss={dismiss} />
          <BackendStatus />
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
      {IS_DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
