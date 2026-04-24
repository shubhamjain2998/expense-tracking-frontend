import { createContext, useContext, useState } from 'react'

interface AuthContextValue {
  token: string | null
  email: string
  login: (token: string, email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'))
  const [email, setEmail] = useState<string>(() => localStorage.getItem('user_email') ?? '')

  function login(t: string, userEmail: string) {
    localStorage.setItem('access_token', t)
    localStorage.setItem('user_email', userEmail)
    setToken(t)
    setEmail(userEmail)
  }

  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_email')
    setToken(null)
    setEmail('')
  }

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
