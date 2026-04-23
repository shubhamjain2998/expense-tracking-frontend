import { useLocation, useNavigate } from 'react-router-dom'

import { useThemeContext } from '../../hooks/useThemeContext'
import { useAuth } from '../../contexts/AuthContext'

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/upload': 'Upload',
  '/review': 'Review',
  '/budget': 'Budget',
  '/settings': 'Settings',
}

export function TopNav() {
  const location = useLocation()
  const { isDark, toggleTheme } = useThemeContext()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const pageName = PAGE_NAMES[location.pathname] ?? 'Page'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      style={{
        height: 44,
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        flexShrink: 0,
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12.5,
          color: 'var(--ink-3)',
        }}
      >
        <span>Personal Finance</span>
        <span style={{ opacity: 0.4, fontSize: 15, lineHeight: 1 }}>›</span>
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{pageName}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button className="btn ghost" style={{ gap: 5 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            search
          </span>
          <span style={{ fontSize: 12 }}>Search</span>
          <span className="kbd">⌘K</span>
        </button>
        <button
          onClick={toggleTheme}
          className="btn ghost icon"
          aria-label={isDark ? 'Light mode' : 'Dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <button
          onClick={handleLogout}
          className="btn ghost icon"
          aria-label="Sign out"
          title="Sign out"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
            logout
          </span>
        </button>
      </div>
    </header>
  )
}
