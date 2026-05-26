import { useLocation } from 'react-router-dom'

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

  return (
    <header className="topnav">
      {/* Desktop: breadcrumb. Mobile: large page title. */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="topnav-crumbs desktop-only text-[12.5px] text-[var(--ink-3)]">
          <span>Personal Finance</span>
          <span className="text-[15px] leading-none opacity-40">›</span>
          <span className="truncate font-medium text-[var(--ink)]">{pageName}</span>
        </div>
        <h1 className="display mobile-only truncate text-[17px] text-[var(--ink)]">{pageName}</h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5">
        <button className="btn ghost gap-[5px]" aria-label="Search">
          <Icon name="search" size={14} />
          <span className="desktop-only text-[12px]">Search</span>
          <span className="kbd desktop-only">⌘K</span>
        </button>
        <button
          onClick={toggleTheme}
          className="btn ghost icon desktop-only"
          aria-label={isDark ? 'Light mode' : 'Dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={15} />
        </button>
      </div>
    </header>
  )
}
