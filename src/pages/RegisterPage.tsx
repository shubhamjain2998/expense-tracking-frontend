import { useCallback, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { AuthSealBackdrop } from '../components/auth/AuthSealBackdrop'
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { AmbientBackdrop } from '../components/layout/AmbientBackdrop'
import { Button } from '../components/ui/Button'
import { Icon, type IconName } from '../components/ui/Icon'
import { useAuth } from '../contexts/AuthContext'
import { WorldHero } from '../features/auth/world/WorldHero'
import { googleSignIn, register as registerApi } from '../lib/api'
import { GOOGLE_CLIENT_ID } from '../lib/config'

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
            <p className="eyebrow">Get started</p>
            <h1 className="display mt-2 text-[28px] text-[var(--ink)]">Create account</h1>
            <p className="mt-2 text-[13px] text-[var(--ink-3)]">
              Track what you spend. Own what you know.
            </p>

            {/* Without a client id the Google button renders nothing, so the
                "or" divider would sit above nothing. */}
            {GOOGLE_CLIENT_ID && (
              <>
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
                  <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
                  or
                  <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="eyebrow mb-1 block" htmlFor="register-email">
                  Email
                </label>
                <input
                  id="register-email"
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
                <label className="eyebrow mb-1 block" htmlFor="register-password">
                  Password
                </label>
                <input
                  id="register-password"
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
                <label className="eyebrow mb-1 block" htmlFor="register-confirm">
                  Confirm password
                </label>
                <input
                  id="register-confirm"
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
