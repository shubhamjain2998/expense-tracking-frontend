import { useLocation } from 'react-router-dom'

import { useThemeContext } from '../../hooks/useThemeContext'

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/upload': 'Upload',
  '/budget': 'Budget',
  '/settings': 'Settings',
}

export function TopNav() {
  const location = useLocation()
  const { isDark, toggleTheme } = useThemeContext()

  const pageName = PAGE_NAMES[location.pathname] ?? 'Page'

  return (
    <header className="h-11 border-b border-[var(--line)] bg-[var(--bg)] flex items-center justify-between px-7 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--ink-3)]">
        <span>Personal Finance</span>
        <span className="opacity-40 text-[15px] leading-none">›</span>
        <span className="text-[var(--ink)] font-medium">{pageName}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <button className="btn ghost gap-[5px]">
          <span className="material-symbols-outlined text-[14px]">
            search
          </span>
          <span className="text-[12px]">Search</span>
          <span className="kbd">⌘K</span>
        </button>
        <button
          onClick={toggleTheme}
          className="btn ghost icon"
          aria-label={isDark ? 'Light mode' : 'Dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="material-symbols-outlined text-[15px]">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </header>
  )
}
