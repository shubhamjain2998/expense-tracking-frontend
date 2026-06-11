import { NavLink } from 'react-router-dom'

import { Icon, type IconName } from '@/components/ui/Icon'
import { useSidebarStats } from '@/hooks/useSidebarStats'
import { pendingTransactionsUrl } from '@/lib/pendingNav'

interface BottomTabBarProps {
  /** Opens the existing Sidebar drawer (used as the "More" tab destination). */
  onOpenMore: () => void
}

const TABS: { to: string; icon: IconName; label: string; key: string }[] = [
  { to: '/dashboard', icon: 'dashboard', label: 'Home', key: 'home' },
  { to: '/transactions', icon: 'receipt_long', label: 'Txns', key: 'txns' },
  { to: '/upload', icon: 'upload', label: 'Upload', key: 'upload' },
  { to: '/budget', icon: 'account_balance_wallet', label: 'Budget', key: 'budget' },
]

export function BottomTabBar({ onOpenMore }: BottomTabBarProps) {
  const { pendingCount, pendingItems } = useSidebarStats()
  const txnsTo = pendingCount > 0 ? pendingTransactionsUrl(pendingItems) : '/transactions'

  return (
    <nav className="bottom-tab-bar md:hidden" role="navigation" aria-label="Primary">
      {TABS.map((t) => (
        <NavLink
          key={t.key}
          to={t.key === 'txns' ? txnsTo : t.to}
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

      <button type="button" onClick={onOpenMore} className="tab-item" aria-label="More">
        <span className="tab-icon-wrap">
          <Icon name="menu" size={20} strokeWidth={1.7} />
        </span>
        <span className="tab-label">More</span>
      </button>
    </nav>
  )
}
