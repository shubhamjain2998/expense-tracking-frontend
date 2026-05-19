import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { ToastContainer } from '@/components/ui/Toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeContext } from '@/hooks/useThemeContext'
import { useToast } from '@/hooks/useToast'
import { ToastContext } from '@/hooks/useToastContext'

interface Options {
  initialEntries?: string[]
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(ui: ReactElement, { initialEntries = ['/'] }: Options = {}) {
  const queryClient = makeQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    const { toasts, toast, dismiss } = useToast()
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeContext.Provider value={{ isDark: false, toggleTheme: () => {} }}>
            <ToastContext.Provider value={toast}>
              <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
              <ToastContainer toasts={toasts} onDismiss={dismiss} />
            </ToastContext.Provider>
          </ThemeContext.Provider>
        </AuthProvider>
      </QueryClientProvider>
    )
  }

  const result = render(ui, { wrapper: Wrapper })
  return { ...result, queryClient }
}
