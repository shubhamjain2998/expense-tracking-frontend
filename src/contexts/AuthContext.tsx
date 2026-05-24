import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { setUnauthorizedHandler } from '../lib/api/client'
import { clearAllQueries } from '../lib/queryKeys'

interface AuthContextValue {
  token: string | null
  email: string
  login: (token: string, email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'access_token'
const EMAIL_KEY = 'user_email'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [email, setEmail] = useState<string>(() => localStorage.getItem(EMAIL_KEY) ?? '')

  const login = useCallback(
    (t: string, userEmail: string) => {
      localStorage.setItem(TOKEN_KEY, t)
      localStorage.setItem(EMAIL_KEY, userEmail)
      // Different account → wipe cached data so we never render the
      // previous user's transactions during the first paint after login.
      clearAllQueries(qc)
      setToken(t)
      setEmail(userEmail)
    },
    [qc]
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
    clearAllQueries(qc)
    setToken(null)
    setEmail('')
  }, [qc])

  // Wire the API client's 401 handler to React state. The router-level
  // <ProtectedRoute /> reacts to the cleared token by redirecting — no need
  // for window.location.href, which would full-reload and lose query cache.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAllQueries(qc)
      setToken(null)
      setEmail('')
    })
    return () => {
      setUnauthorizedHandler(() => {})
    }
  }, [qc])

  return (
    <AuthContext.Provider value={{ token, email, login, logout }}>{children}</AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
