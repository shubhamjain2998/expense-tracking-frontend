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
              className="w-[18px] h-[18px] bg-[var(--ink)] text-[var(--bg)] rounded-[3px] inline-flex items-center justify-center font-bold text-[10px]"
            >
              ₹
            </span>
            <span className="text-[12px] font-semibold text-[var(--ink-2)] tracking-[-0.005em]">
              Personal Finance
            </span>
            <span className="hidden text-[11.5px] sm:inline text-[var(--ink-4)]">
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
                    : 'text-[11.5px] transition-colors text-[var(--ink-3)] no-underline'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-4 flex flex-col items-start justify-between gap-1 pt-4 sm:flex-row sm:items-center border-t border-[var(--line)]">
          <p className="text-[10.5px] text-[var(--ink-4)]">
            © {year} Personal Finance. All rights reserved.
          </p>
          <p className="text-[10.5px] text-[var(--ink-4)]">
            Built for clarity, not complexity.
          </p>
        </div>
      </div>
    </footer>
  )
}
