import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { Icon, type IconName } from '@/components/ui/Icon'

import { useAuth } from '../../contexts/AuthContext'
import { useSidebarStats } from '../../hooks/useSidebarStats'
import { formatCompact } from '../../lib/format'
import { pendingTransactionsUrl } from '../../lib/pendingNav'
import { getInitials } from '../../lib/strings'

const NAV: { to: string; icon: IconName; label: string }[] = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/transactions', icon: 'receipt_long', label: 'Transactions' },
  { to: '/upload', icon: 'upload', label: 'Upload' },
  { to: '/budget', icon: 'account_balance_wallet', label: 'Budget' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

interface SidebarProps {
  mobileOpen?: boolean
  onNavigate?: () => void
}

export function Sidebar({ mobileOpen = false, onNavigate }: SidebarProps) {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const initials = getInitials(email)

  const [profileOpen, setProfileOpen] = useState(false)
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('pf_display_name') || email.split('@')[0] || ''
  )
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(displayName)

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
        setEditingName(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [profileOpen])

  function saveName() {
    const trimmed = nameInput.trim()
    if (trimmed) {
      localStorage.setItem('pf_display_name', trimmed)
      setDisplayName(trimmed)
    }
    setEditingName(false)
  }

  function handleSignOut() {
    logout()
    navigate('/login', { replace: true })
  }

  const { spent, totalBudget, owedToYou, pendingCount, pendingItems } = useSidebarStats()
  const txnsTo = pendingCount > 0 ? pendingTransactionsUrl(pendingItems) : '/transactions'

  return (
    <aside className="app-sidebar" data-mobile-open={mobileOpen ? 'true' : 'false'}>
      {/* Profile / Brand */}
      <div style={{ position: 'relative', borderBottom: '1px solid var(--line)' }}>
        <button
          ref={triggerRef}
          onClick={() => {
            setProfileOpen((v) => !v)
            setNameInput(displayName)
            setEditingName(false)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            width: '100%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background .1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {/* Avatar */}
          <span
            style={{
              width: 30,
              height: 30,
              background: 'var(--ink)',
              color: 'var(--bg)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '-0.02em',
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
            >
              {displayName || 'Personal Finance'}
            </span>
            <span
              style={{
                fontSize: 10.5,
                color: 'var(--ink-4)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                marginTop: 1,
                lineHeight: 1.2,
              }}
            >
              {email}
            </span>
          </span>
        </button>

        {/* Profile popover */}
        {profileOpen && (
          <div
            ref={popoverRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 8,
              right: 8,
              zIndex: 200,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              boxShadow:
                '0 8px 24px color-mix(in oklch, var(--ink) 10%, transparent), 0 2px 6px color-mix(in oklch, var(--ink) 6%, transparent)',
              overflow: 'hidden',
            }}
          >
            {/* Avatar + email header */}
            <div
              style={{
                padding: '12px 12px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '-0.02em',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    fontSize: 10.5,
                    color: 'var(--ink-3)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                    marginTop: 1,
                  }}
                >
                  {email}
                </p>
              </div>
            </div>

            {/* Display name */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-4)',
                  marginBottom: 6,
                }}
              >
                Display name
              </p>
              {editingName ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    className="input"
                    style={{ fontSize: 12, height: 28, flex: 1 }}
                  />
                  <button
                    onClick={saveName}
                    className="btn ghost icon sm"
                    style={{ color: 'var(--accent)', flexShrink: 0 }}
                    aria-label="Save name"
                  >
                    <Icon name="check" size={13} />
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="btn ghost icon sm"
                    style={{ flexShrink: 0 }}
                    aria-label="Cancel"
                  >
                    <Icon name="close" size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNameInput(displayName)
                    setEditingName(true)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: '5px 8px',
                    cursor: 'pointer',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {displayName}
                  </span>
                  <Icon name="edit" size={12} style={{ color: 'var(--ink-4)' }} />
                </button>
              )}
            </div>

            {/* Sign out */}
            <div style={{ padding: '6px 6px' }}>
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

      {/* Nav */}
      <nav style={{ padding: '12px 8px 4px' }}>
        <p
          style={{
            padding: '4px 8px 8px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
          }}
        >
          Workspace
        </p>
        {NAV.map(({ to, icon, label }) => {
          const resolvedTo = label === 'Transactions' ? txnsTo : to
          return (
            <NavLink
              key={to}
              to={resolvedTo}
              end={to === '/dashboard'}
              onClick={onNavigate}
              className={({ isActive }) => (isActive ? 'side-nav-item active' : 'side-nav-item')}
            >
              <Icon name={icon} size={15} />
              <span style={{ flex: 1, lineHeight: 1.3 }}>{label}</span>
              {label === 'Transactions' && pendingCount > 0 && (
                <span
                  className="side-nav-badge num"
                  title={`${pendingCount} pending across all months`}
                >
                  {pendingCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* This month */}
      <div
        style={{
          marginTop: 8,
          padding: '12px 14px',
          borderTop: '1px solid var(--line)',
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
            marginBottom: 8,
          }}
        >
          This month
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {(
            [
              { label: 'Spent', value: formatCompact(spent), color: 'var(--ink)', weight: 600 },
              totalBudget > 0
                ? {
                    label: 'Budget',
                    value: formatCompact(totalBudget),
                    color: 'var(--ink-3)',
                    weight: 400,
                  }
                : {
                    label: 'Budget',
                    value: 'not set',
                    color: 'var(--ink-4)',
                    weight: 400,
                  },
              ...(owedToYou > 0
                ? [
                    {
                      label: 'Owed to you',
                      value: formatCompact(owedToYou),
                      color: 'var(--pos)',
                      weight: 600,
                    },
                  ]
                : []),
            ] as { label: string; value: string; color: string; weight: number }[]
          ).map(({ label, value, color, weight }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
              <span className="num" style={{ fontSize: 12, fontWeight: weight, color }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />
    </aside>
  )
}
