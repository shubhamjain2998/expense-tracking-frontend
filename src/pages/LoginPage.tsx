import { useCallback, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

import { AuthSealBackdrop } from '../components/auth/AuthSealBackdrop'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { googleSignIn, login as loginApi } from '../lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { access_token } = await loginApi(email.trim(), password)
      login(access_token, email.trim())
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(from ?? '/dashboard', { replace: true })
    } catch (err: unknown) {
      const e = err as { detail?: string }
      setError(e.detail ?? 'Invalid email or password')
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
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
        navigate(from ?? '/dashboard', { replace: true })
      } catch (err: unknown) {
        const e = err as { detail?: string }
        setError(e.detail ?? 'Google sign-in failed')
      } finally {
        setLoading(false)
      }
    },
    [login, navigate, location.state]
  )

  return (
    <div
      className="auth-page flex min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <AuthSealBackdrop />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              background: 'var(--kosh-amber)',
              color: 'var(--kosh-brown-deep)',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '-0.5px',
            }}
          >
            K
          </span>
          <span
            className="text-[14px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
          >
            Kosh
          </span>
        </div>

        <div className="card animate-scale-in">
          <p className="eyebrow">Sign in</p>
          <h1 className="display mt-2 text-[28px] text-[var(--ink)]">Welcome back</h1>
          <p className="mt-2 text-[13px] text-[var(--ink-3)]">
            Track what you spend. Own what you know.
          </p>

          <div className="mt-5">
            <GoogleSignInButton
              text="signin_with"
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
                autoComplete="current-password"
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
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-center text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none' }}
            >
              Register
            </Link>
          </p>
        </div>

        {/* Privacy trust marks */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            { icon: '🔒', title: 'No SMS access', sub: 'We never read your messages' },
            { icon: '📭', title: 'No email access', sub: 'We never scan your inbox' },
            { icon: '📄', title: 'PDFs not stored', sub: 'Processed locally, then discarded' },
            { icon: '👤', title: 'You own your data', sub: 'Export or delete anytime' },
          ].map(({ icon, title, sub }) => (
            <div
              key={title}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '8px 10px',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>{icon}</span>
              <div>
                <p
                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.3 }}
                >
                  {title}
                </p>
                <p style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.3 }}>
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
