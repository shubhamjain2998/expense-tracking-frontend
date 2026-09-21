import { NavLink } from 'react-router-dom'

import { Icon, type IconName } from '@/components/ui/Icon'
import { usePeriod } from '@/hooks/usePeriod'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useSidebarStats } from '@/hooks/useSidebarStats'
import { pendingTransactionsUrl } from '@/lib/pendingNav'

// `periodAware` tabs carry the app-wide sticky period (`usePeriod`) in
// their link so switching tabs never drops the selected month.
const TABS: { to: string; icon: IconName; label: string; key: string; periodAware: boolean }[] = [
  { to: '/dashboard', icon: 'dashboard', label: 'Home', key: 'home', periodAware: true },
  { to: '/transactions', icon: 'receipt_long', label: 'Txns', key: 'txns', periodAware: true },
  {
    to: '/budget',
    icon: 'account_balance_wallet',
    label: 'Budget',
    key: 'budget',
    periodAware: true,
  },
  { to: '/settings', icon: 'settings', label: 'Settings', key: 'settings', periodAware: false },
]

export function BottomTabBar() {
  const { pendingCount, pendingItems } = useSidebarStats()
  const { mode } = usePeriodMode()
  const { year, month } = usePeriod()
  const periodQuery = `?year=${year}&month=${month}`
  // Pending items deliberately override the current period with the month
  // that actually has them — see pendingTransactionsUrl.
  const txnsTo =
    pendingCount > 0 ? pendingTransactionsUrl(pendingItems, mode) : `/transactions${periodQuery}`

  return (
    <nav className="bottom-tab-bar md:hidden" role="navigation" aria-label="Primary">
      {TABS.map((t) => (
        <NavLink
          key={t.key}
          to={t.key === 'txns' ? txnsTo : t.periodAware ? `${t.to}${periodQuery}` : t.to}
          end={t.to === '/dashboard'}
          className={({ isActive }) => (isActive ? 'tab-item on' : 'tab-item')}
        >
          <span className="tab-icon-wrap">
            <Icon name={t.icon} size={20} strokeWidth={1.7} />
            {t.key === 'txns' && pendingCount > 0 && (
              <span className="tab-badge num" aria-label={`${pendingCount} pending`}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
