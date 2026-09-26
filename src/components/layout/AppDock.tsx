import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/Avatar'
import { Icon, type IconName } from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { useAvatarPrefs } from '@/hooks/useAvatarPrefs'
import { usePeriodValue } from '@/hooks/usePeriod'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useSidebarStats } from '@/hooks/useSidebarStats'
import { useThemeContext } from '@/hooks/useThemeContext'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import { formatYearLabel } from '@/lib/period'
import { getInitials } from '@/lib/strings'

interface Destination {
  key: string
  path: string
  label: string
  icon: IconName
}

// The four destinations the dock carries. Settings lives on the right with
// the account controls. Every link carries the app-wide sticky period so
// moving between pages never drops the selected month.
const DESTINATIONS: Destination[] = [
  { key: 'home', path: '/dashboard', label: 'Home', icon: 'dashboard' },
  { key: 'txns', path: '/transactions', label: 'Transactions', icon: 'receipt_long' },
  { key: 'budget', path: '/budget', label: 'Budget', icon: 'account_balance_wallet' },
  { key: 'insights', path: '/insights', label: 'Insights', icon: 'sparkles' },
]

function isActive(pathname: string, d: Destination): boolean {
  // The category page (/c/:id) is reached from Home, Budget and Insights
  // alike, so no destination claims it.
  if (d.key === 'home') return pathname === '/dashboard'
  return pathname.startsWith(d.path)
}

/**
 * The app's navigation: one floating glass bar across the top, in place of
 * the old fixed side rail, so page content — and the 3D worlds — get the full
 * width. Brand on the left, the four destinations in the middle with a pill
 * that slides to the current one, period + theme + Settings + account on the
 * right. Below 768px the destinations move to `BottomTabBar`.
 */
export function AppDock() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isDark, toggleTheme } = useThemeContext()
  const { pendingCount, pendingItems } = useSidebarStats()
  const { mode } = usePeriodMode()
  const { year, month } = usePeriodValue()
  const { prefs } = useAvatarPrefs()
  const initials = getInitials(email)
  const displayName = localStorage.getItem('pf_display_name') || email.split('@')[0] || ''
  const periodQuery = `?year=${year}&month=${month}`

  const [profileOpen, setProfileOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!profileOpen) return
    function onPointerDown(e: PointerEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [profileOpen])

  function hrefFor(d: Destination): string {
    // Pending items deliberately override the current period with the month
    // that actually has them — see pendingTransactionsUrl.
    if (d.key === 'txns' && pendingCount > 0) return pendingTransactionsUrl(pendingItems, mode)
    return `${d.path}${periodQuery}`
  }

  function handleSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="dock">
      <NavLink to={`/dashboard${periodQuery}`} className="dock-brand" aria-label="Kosh — Home">
        <span className="brand-mark" aria-hidden="true">
          क
        </span>
        <span className="brand-name">Kosh</span>
      </NavLink>

      <nav className="dock-nav" aria-label="Primary">
        {DESTINATIONS.map((d) => {
          const on = isActive(pathname, d)
          return (
            <NavLink
              key={d.key}
              to={hrefFor(d)}
              className={['dock-link', on ? 'on' : null].filter(Boolean).join(' ')}
              aria-current={on ? 'page' : undefined}
            >
              {on && (
                <motion.span
                  layoutId="dock-pill"
                  className="dock-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <Icon name={d.icon} size={15} />
              <span>{d.label}</span>
              {d.key === 'txns' && pendingCount > 0 && (
                <span className="badge" aria-label={`${pendingCount} pending`}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <span className="dock-right">
        <span className="dock-period num" title="Period in view">
          {formatYearLabel(year, mode)}
        </span>
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX || rect.left + rect.width / 2
            const y = e.clientY || rect.top + rect.height / 2
            toggleTheme({ x, y })
          }}
          className="btn ghost icon"
          aria-label={isDark ? 'Light mode' : 'Dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={15} />
        </button>
        <NavLink
          to="/settings"
          className={({ isActive: on }) =>
            ['btn ghost icon', on ? 'on' : null].filter(Boolean).join(' ')
          }
          aria-label="Settings"
          title="Settings"
        >
          <Icon name="settings" size={15} />
        </NavLink>

        <span className="relative">
          <button
            ref={triggerRef}
            onClick={() => setProfileOpen((v) => !v)}
            className="topnav-avatar"
            aria-label="Account"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <Avatar initials={initials} prefs={prefs} size={30} />
          </button>

          {profileOpen && (
            <div ref={popoverRef} className="topnav-profile-popover" role="menu">
              <div className="topnav-profile-header">
                <Avatar initials={initials} prefs={prefs} size={40} />
                <div className="min-w-0">
                  <p className="topnav-profile-name">{displayName}</p>
                  <p className="topnav-profile-email">{email}</p>
                </div>
              </div>
              <div className="dock-menu">
                <NavLink to="/settings" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <Icon name="settings" size={14} />
                  Settings
                </NavLink>
                <button type="button" role="menuitem" onClick={handleSignOut}>
                  <Icon name="logout" size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </span>
      </span>
    </header>
  )
}
