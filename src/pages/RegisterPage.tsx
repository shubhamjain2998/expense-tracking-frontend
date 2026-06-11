import { useCallback, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { googleSignIn, register as registerApi } from '../lib/api'

export function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
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

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError('')
      setLoading(true)
      try {
        const { access_token, email: googleEmail } = await googleSignIn(credential)
        login(access_token, googleEmail)
        navigate('/dashboard', { replace: true })
      } catch (err: unknown) {
        const e = err as { detail?: string }
        setError(e.detail ?? 'Google sign-up failed')
      } finally {
        setLoading(false)
      }
    },
    [login, navigate]
  )

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
          <p className="eyebrow">Get started</p>
          <h1 className="display mt-2 text-[28px] text-[var(--ink)]">Create account</h1>
          <p className="mt-2 text-[13px] text-[var(--ink-3)]">
            Start tracking your expenses today.
          </p>

          <div className="mt-5">
            <GoogleSignInButton
              text="signup_with"
              onCredential={handleGoogleCredential}
              onError={setError}
              disabled={loading}
            />
          </div>

          <div
            className="my-4 flex items-center gap-3 text-[11px] tracking-wider uppercase"
            style={{ color: 'var(--ink-3)' }}
          >
            <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
            or
            <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="eyebrow mb-1 block">Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="you@example.com"
                className={`input ${touched.email && !email ? 'is-invalid' : ''}`}
                autoComplete="email"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Password</label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                placeholder="••••••••"
                className={`input ${touched.password && !password ? 'is-invalid' : ''}`}
                autoComplete="new-password"
                minLength={8}
                required
              />
              {password.length > 0 && password.length < 8 && (
                <p className="mt-1 text-[11.5px]" style={{ color: 'var(--neg)' }}>
                  Password must be at least 8 characters ({password.length}/8)
                </p>
              )}
            </div>
            <div>
              <label className="eyebrow mb-1 block">Confirm password</label>
              <input
                type="password"
                name="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
                placeholder="••••••••"
                className={`input ${touched.confirm && !confirm ? 'is-invalid' : ''}`}
                autoComplete="new-password"
                required
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
