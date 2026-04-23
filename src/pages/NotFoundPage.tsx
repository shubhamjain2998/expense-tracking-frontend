import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center text-center"
      style={{ background: 'var(--bg)', padding: 32 }}
    >
      <p className="card-eyebrow mb-2">404 · Not found</p>
      <h1
        className="text-[28px] font-semibold"
        style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
      >
        Page not found
      </h1>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link to="/dashboard" className="btn primary mt-5" style={{ textDecoration: 'none' }}>
        Back to dashboard
      </Link>
    </div>
  )
}
