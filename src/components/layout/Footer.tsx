import { NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budget', label: 'Budget' },
  { to: '/settings', label: 'Settings' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="mt-12"
      style={{
        borderTop: '1px solid var(--line)',
        background: 'var(--bg)',
      }}
    >
      <div className="mx-auto max-w-screen-2xl px-7 py-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              style={{
                width: 18,
                height: 18,
                background: 'var(--ink)',
                color: 'var(--bg)',
                borderRadius: 3,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              ₹
            </span>
            <span
              className="text-[12px] font-semibold"
              style={{ color: 'var(--ink-2)', letterSpacing: '-0.005em' }}
            >
              Personal Finance
            </span>
            <span className="hidden text-[11.5px] sm:inline" style={{ color: 'var(--ink-4)' }}>
              · privacy-first · local
            </span>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-1.5">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? 'text-[11.5px] font-medium' : 'text-[11.5px] transition-colors'
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--ink-2)' : 'var(--ink-3)',
                  textDecoration: 'none',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div
          className="mt-4 flex flex-col items-start justify-between gap-1 pt-4 sm:flex-row sm:items-center"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <p className="text-[10.5px]" style={{ color: 'var(--ink-4)' }}>
            © {year} Personal Finance. All rights reserved.
          </p>
          <p className="text-[10.5px]" style={{ color: 'var(--ink-4)' }}>
            Built for clarity, not complexity.
          </p>
        </div>
      </div>
    </footer>
  )
}
