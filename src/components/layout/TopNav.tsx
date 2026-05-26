import { Link, useLocation } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'

import { useThemeContext } from '../../hooks/useThemeContext'

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/upload': 'Upload',
  '/budget': 'Budget',
  '/settings': 'Settings',
}

interface TopNavProps {
  /** Opens the side drawer. Kept for desktop sidebar; on mobile the
   *  BottomTabBar's "More" button uses this same callback. */
  onOpenNav?: () => void
}

export function TopNav({ onOpenNav: _onOpenNav }: TopNavProps) {
  const location = useLocation()
  const { isDark, toggleTheme } = useThemeContext()

  const pageName = PAGE_NAMES[location.pathname] ?? 'Page'
  const isHome = location.pathname === '/dashboard'

  return (
    <header className="topnav">
      {/* Desktop: clickable brand + current page. Mobile: large page title. */}
      <div className="flex min-w-0 items-center gap-2">
        <nav
          aria-label="Breadcrumb"
          className="hidden min-w-0 items-center gap-1.5 text-[12.5px] md:flex"
        >
          <Link to="/dashboard" className="topnav-home">
            Personal Finance
          </Link>
          {!isHome && (
            <>
              <span aria-hidden className="text-[15px] leading-none text-[var(--ink-4)]">
                ›
              </span>
              <span className="truncate font-medium text-[var(--ink)]">{pageName}</span>
            </>
          )}
        </nav>
        <h1 className="display truncate text-[17px] text-[var(--ink)] md:hidden">{pageName}</h1>
      </div>

      {/* Right: theme toggle (available on every viewport) */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={toggleTheme}
          className="btn ghost icon"
          aria-label={isDark ? 'Light mode' : 'Dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={15} />
        </button>
      </div>
    </header>
  )
}
