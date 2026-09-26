import { useCallback, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

import { AuthSealBackdrop } from '../components/auth/AuthSealBackdrop'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { AmbientBackdrop } from '../components/layout/AmbientBackdrop'
import { Button } from '../components/ui/Button'
import { Icon, type IconName } from '../components/ui/Icon'
import { useAuth } from '../contexts/AuthContext'
import { WorldHero } from '../features/auth/world/WorldHero'
import { googleSignIn, login as loginApi } from '../lib/api'
import { GOOGLE_CLIENT_ID } from '../lib/config'

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
      <AmbientBackdrop />
      <AuthSealBackdrop />
      <div className="auth-layout">
        <div className="w-full max-w-sm">
          {/* Same mark as the dock's brand: the क glyph, then the name. */}
          <div className="mb-6 flex items-center gap-2.5">
            <span className="brand-mark" aria-hidden="true">
              क
            </span>
            <span className="brand-name">Kosh</span>
          </div>

          <div className="card animate-scale-in">
            <p className="eyebrow">Sign in</p>
            <h1 className="display mt-2 text-[28px] text-[var(--ink)]">Welcome back</h1>
            <p className="mt-2 text-[13px] text-[var(--ink-3)]">
              Track what you spend. Own what you know.
            </p>

            {/* Without a client id the Google button renders nothing, so the
                "or" divider would sit above nothing. */}
            {GOOGLE_CLIENT_ID && (
              <>
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
                  <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
                  or
                  <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="eyebrow mb-1 block" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
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
                <label className="eyebrow mb-1 block" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
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
                  role="alert"
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
            {(
              [
                { icon: 'lock', title: 'No SMS access', sub: 'We never read your messages' },
                { icon: 'mail_off', title: 'No email access', sub: 'We never scan your inbox' },
                {
                  icon: 'insert_drive_file',
                  title: 'PDFs not stored',
                  sub: 'Parsed in memory, never saved',
                },
                { icon: 'person', title: 'You own your data', sub: 'Export or delete anytime' },
              ] satisfies { icon: IconName; title: string; sub: string }[]
            ).map(({ icon, title, sub }) => (
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
                <span style={{ color: 'var(--ink-3)', marginTop: 1 }}>
                  <Icon name={icon} size={14} aria-hidden="true" />
                </span>
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--ink-2)',
                      lineHeight: 1.3,
                    }}
                  >
                    {title}
                  </p>
                  <p
                    style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.3 }}
                  >
                    {sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <WorldHero scene="auth" />
      </div>
    </div>
  )
}
