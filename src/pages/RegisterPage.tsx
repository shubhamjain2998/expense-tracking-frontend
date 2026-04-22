import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { register as registerApi } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'

export function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { access_token } = await registerApi(email.trim(), password)
      login(access_token)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const e = err as { detail?: string }
      setError(e.detail ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="bg-surface-container-low w-full max-w-sm rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.1)]">
        <h1 className="text-on-surface mb-1 text-2xl font-black tracking-tight">Create account</h1>
        <p className="text-on-surface-variant mb-6 text-sm">Start tracking your expenses today.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-on-surface-variant mb-1 block text-xs font-semibold tracking-wider uppercase">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field w-full"
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label className="text-on-surface-variant mb-1 block text-xs font-semibold tracking-wider uppercase">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field w-full"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-on-surface-variant mb-1 block text-xs font-semibold tracking-wider uppercase">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="input-field w-full"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-error bg-error/8 rounded-lg px-3 py-2 text-sm">{error}</p>}

          <Button variant="primary" className="w-full" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="text-on-surface-variant mt-6 text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
