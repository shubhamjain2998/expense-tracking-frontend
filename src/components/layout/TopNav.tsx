import { useLocation } from 'react-router-dom'

import { useThemeContext } from '../../hooks/useThemeContext'

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/upload': 'Upload',
  '/budget': 'Budget',
  '/settings': 'Settings',
}

interface TopNavProps {
  onOpenNav?: () => void
}

export function TopNav({ onOpenNav }: TopNavProps) {
  const location = useLocation()
  const { isDark, toggleTheme } = useThemeContext()

  const pageName = PAGE_NAMES[location.pathname] ?? 'Page'

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--bg)] px-3 md:px-7">
      {/* Left: hamburger (mobile only) + breadcrumb */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenNav}
          className="btn ghost icon mobile-only"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[18px]">menu</span>
        </button>
        <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-[var(--ink-3)]">
          <span className="desktop-only">Personal Finance</span>
          <span className="desktop-only text-[15px] leading-none opacity-40">›</span>
          <span className="truncate font-medium text-[var(--ink)]">{pageName}</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5">
        <button className="btn ghost gap-[5px]" aria-label="Search">
          <span className="material-symbols-outlined text-[14px]">search</span>
          <span className="desktop-only text-[12px]">Search</span>
          <span className="kbd desktop-only">⌘K</span>
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
