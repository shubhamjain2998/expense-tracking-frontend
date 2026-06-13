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
    <footer className="mt-12 border-t border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-2xl px-7 py-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              style={{
                width: 18,
                height: 18,
                background: 'var(--kosh-amber)',
                color: 'var(--kosh-brown-deep)',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 10,
                letterSpacing: '-0.5px',
                flexShrink: 0,
              }}
            >
              K
            </span>
            <span className="text-[12px] font-semibold tracking-[-0.005em] text-[var(--ink-2)]">
              Kosh
            </span>
            <span className="hidden text-[11.5px] text-[var(--ink-4)] sm:inline">
              · privacy-first · local
            </span>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-1.5">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'text-[11.5px] font-medium text-[var(--ink-2)] no-underline'
                    : 'text-[11.5px] text-[var(--ink-3)] no-underline transition-colors'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-4 flex flex-col items-start justify-between gap-1 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center">
          <p className="text-[10.5px] text-[var(--ink-4)]">
            © {year} Kosh · Your data, your rules.
          </p>
          <p className="text-[10.5px] text-[var(--ink-4)]">
            Track what you spend. Own what you know.
          </p>
        </div>
      </div>
    </footer>
  )
}
