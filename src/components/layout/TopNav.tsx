import { NavLink, useNavigate } from 'react-router-dom'

import { useThemeContext } from '../../hooks/useThemeContext'
import { useAuth } from '../../contexts/AuthContext'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budget', label: 'Budget' },
  { to: '/settings', label: 'Settings' },
]

export function TopNav() {
  const { isDark, toggleTheme } = useThemeContext()
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

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
          <button
            onClick={toggleTheme}
            className="text-on-surface-variant hover:bg-surface-container rounded-full p-2 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="text-on-surface-variant hover:bg-surface-container rounded-full p-2 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
