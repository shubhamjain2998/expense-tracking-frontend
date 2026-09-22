import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { useAvatarPrefs } from '@/hooks/useAvatarPrefs'
import { useThemeContext } from '@/hooks/useThemeContext'
import { getInitials } from '@/lib/strings'

// Route -> page title. Used only to label the top bar; the actual nav links
// live in SideNav (desktop) and BottomTabBar (mobile). Keep in sync with the
// four-destination IA — see design-system/kosh-ledger/MASTER.md §7.
const PAGE_TITLES: { to: string; label: string; end: boolean }[] = [
  { to: '/dashboard', label: 'Home', end: true },
  { to: '/transactions', label: 'Transactions', end: false },
  { to: '/budget', label: 'Budget', end: false },
  { to: '/settings', label: 'Settings', end: false },
  { to: '/insights', label: 'Insights', end: false },
]

function pageTitleFor(pathname: string): string {
  if (pathname.startsWith('/c/')) return 'Category'
  const match = PAGE_TITLES.find(({ to, end }) => (end ? pathname === to : pathname.startsWith(to)))
  return match?.label ?? ''
}

export function TopNav() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark, toggleTheme } = useThemeContext()
  const initials = getInitials(email)
  const { prefs } = useAvatarPrefs()
  const displayName = localStorage.getItem('pf_display_name') || email.split('@')[0] || ''

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
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [profileOpen])

  function handleSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  const title = pageTitleFor(location.pathname)

  return (
    <header className="topnav" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <span className="page-title">{title}</span>
      <span className="topnav-right">
        {/* Theme toggle */}
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

        {/* Avatar / profile */}
        <div style={{ position: 'relative' }}>
          <button
            ref={triggerRef}
            onClick={() => setProfileOpen((v) => !v)}
            className="topnav-avatar"
            aria-label="Profile and settings"
            aria-expanded={profileOpen}
            style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Avatar initials={initials} prefs={prefs} size={32} />
          </button>

          {profileOpen && (
            <div ref={popoverRef} className="topnav-profile-popover">
              {/* Header */}
              <div className="topnav-profile-header">
                <Avatar initials={initials} prefs={prefs} size={40} />
                <div style={{ minWidth: 0 }}>
                  <p className="topnav-profile-name">{displayName}</p>
                  <p className="topnav-profile-email">{email}</p>
                </div>
              </div>

              {/* Settings link */}
              <div className="topnav-profile-section" style={{ paddingTop: 4, paddingBottom: 4 }}>
                <NavLink
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 8px',
                    borderRadius: 'var(--radius)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--ink-2)',
                    textDecoration: 'none',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon name="settings" size={14} />
                  Settings
                </NavLink>
              </div>

              {/* Sign out */}
              <div style={{ padding: '4px 6px 6px' }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    color: 'var(--ink-2)',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon name="logout" size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </span>
    </header>
  )
}
