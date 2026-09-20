import { NavLink } from 'react-router-dom'

import { Avatar } from '@/components/ui/Avatar'
import { Icon, type IconName } from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { useAvatarPrefs } from '@/hooks/useAvatarPrefs'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useSidebarStats } from '@/hooks/useSidebarStats'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import { formatYearLabel, getCurrentPeriod } from '@/lib/period'
import { getInitials } from '@/lib/strings'

const NAV: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: '/dashboard', label: 'Home', icon: 'dashboard', end: true },
  { to: '/transactions', label: 'Transactions', icon: 'receipt_long', end: false },
  { to: '/budget', label: 'Budget', icon: 'account_balance_wallet', end: false },
  { to: '/settings', label: 'Settings', icon: 'settings', end: false },
]

/**
 * Desktop-only left rail — the primary four-destination nav (Home,
 * Transactions, Budget, Settings), an "Explore" group for the Insights
 * drill-down, and a footer with the account avatar + FY label. Hidden below
 * 900px in favour of `BottomTabBar`. See design-mock/ledger/shell.js and
 * `.sidenav`/`.navlist`/`.navlink`/`.nav-foot` in components.css.
 */
export function SideNav() {
  const { email } = useAuth()
  const { pendingCount, pendingItems } = useSidebarStats()
  const { mode } = usePeriodMode()
  const { prefs } = useAvatarPrefs()
  const initials = getInitials(email)
  const displayName = localStorage.getItem('pf_display_name') || email.split('@')[0] || ''
  const { year } = getCurrentPeriod(mode)
  const periodLabel = formatYearLabel(year, mode)

  const txnsTo = pendingCount > 0 ? pendingTransactionsUrl(pendingItems, mode) : '/transactions'

  return (
    <aside className="sidenav">
      <NavLink to="/dashboard" className="brand" style={{ textDecoration: 'none' }}>
        <span className="brand-mark" aria-hidden="true">
          क
        </span>
        <span className="brand-name">Kosh</span>
      </NavLink>

      <nav className="navlist" aria-label="Primary">
        {NAV.map(({ to, label, icon, end }) => {
          const resolvedTo = label === 'Transactions' ? txnsTo : to
          return (
            <NavLink key={to} to={resolvedTo} end={end} className="navlink">
              <Icon name={icon} size={16} />
              <span>{label}</span>
              {label === 'Transactions' && pendingCount > 0 && (
                <span className="badge" aria-label={`${pendingCount} pending`}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="navlist" style={{ marginTop: 20 }}>
        <span className="eyebrow" style={{ display: 'block', padding: '0 8px 8px' }}>
          Explore
        </span>
        <NavLink to="/insights" className="navlink">
          <Icon name="sparkles" size={16} />
          <span>Insights</span>
        </NavLink>
      </div>

      <div className="nav-foot">
        <Avatar initials={initials} prefs={prefs} size={28} />
        <span style={{ minWidth: 0 }}>
          <span
            className="small strong"
            style={{
              display: 'block',
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </span>
          <span className="small" style={{ display: 'block', fontSize: 11 }}>
            {periodLabel}
          </span>
        </span>
      </div>
    </aside>
  )
}
