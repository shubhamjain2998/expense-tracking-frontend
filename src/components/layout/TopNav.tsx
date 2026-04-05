import { NavLink } from 'react-router-dom'

import { useThemeContext } from '../../hooks/useThemeContext'
import { useToastContext } from '../../hooks/useToastContext'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budget', label: 'Budget' },
  { to: '/settings', label: 'Settings' },
]

export function TopNav() {
  const { isDark, toggleTheme } = useThemeContext()
  const toast = useToastContext()

  return (
    <nav className="bg-surface-container-low animate-fade-down w-full">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <span className="text-primary text-xl font-black tracking-tight">Personal Finance</span>
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'border-primary text-primary border-b-2 pb-0.5 text-sm font-semibold'
                    : 'text-on-surface-variant hover:text-primary text-sm transition-colors'
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="text-on-surface-variant hover:bg-surface-container rounded-full p-2 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
          </button>

          <button
            onClick={() => toast.info('Notifications coming soon')}
            className="text-on-surface-variant hover:bg-surface-container rounded-full p-2 transition-colors"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          <button
            onClick={() => toast.info('User profile coming soon')}
            className="bg-primary text-on-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-opacity hover:opacity-80"
            aria-label="User profile"
          >
            U
          </button>
        </div>
      </div>
    </nav>
  )
}
