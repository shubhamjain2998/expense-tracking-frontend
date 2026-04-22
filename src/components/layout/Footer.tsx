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
    <footer className="border-outline-variant/10 bg-surface-container-low/50 mt-16 border-t">
      <div className="mx-auto max-w-screen-2xl px-8 py-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          {/* Brand */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">
                account_balance_wallet
              </span>
              <span className="text-on-surface text-sm font-black tracking-tight">
                Personal Finance
              </span>
            </div>
            <p className="text-on-surface-variant text-xs">
              Track spending. Set budgets. Stay in control.
            </p>
          </div>

          {/* Nav */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'text-primary text-xs font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface text-xs transition-colors'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom rule + copyright */}
        <div className="border-outline-variant/10 mt-6 flex flex-col items-start justify-between gap-2 border-t pt-6 sm:flex-row sm:items-center">
          <p className="text-on-surface-variant text-[11px]">
            © {year} Personal Finance. All rights reserved.
          </p>
          <p className="text-on-surface-variant/50 text-[11px]">
            Built for clarity, not complexity.
          </p>
        </div>
      </div>
    </footer>
  )
}
