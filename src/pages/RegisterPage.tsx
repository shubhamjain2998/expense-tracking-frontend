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
      login(access_token, email.trim())
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const e = err as { detail?: string }
      setError(e.detail ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              background: 'var(--ink)',
              color: 'var(--bg)',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            ₹
          </span>
          <span
            className="text-[14px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
          >
            Personal Finance
          </span>
        </div>

        <div className="card">
          <p className="card-eyebrow">Get started</p>
          <h1
            className="text-[22px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            Create account
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
            Start tracking your expenses today.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <div>
              <label className="eyebrow mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                autoComplete="email"
                autoFocus
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="input"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p
                className="text-[12px]"
                style={{
                  background: 'var(--neg-soft)',
                  color: 'var(--neg)',
                  borderRadius: 'var(--radius)',
                  padding: '6px 10px',
                }}
              >
                {error}
              </p>
            )}

            <Button variant="primary" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
