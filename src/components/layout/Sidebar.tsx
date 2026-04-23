import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary, getSplitLedger, getPendingManual } from '../../lib/api'

const now = new Date()
const CY = now.getFullYear()
const CM = now.getMonth() + 1

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`
  return `₹${Math.round(n)}`
}

const NAV = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/transactions', icon: 'receipt_long', label: 'Transactions' },
  { to: '/upload', icon: 'upload', label: 'Upload' },
  { to: '/budget', icon: 'account_balance_wallet', label: 'Budget' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

export function Sidebar() {
  const summaryQ = useQuery({
    queryKey: ['dashboardSummary', CY, CM],
    queryFn: () => getDashboardSummary(CY, CM),
    staleTime: 5 * 60_000,
  })
  const ledgerQ = useQuery({
    queryKey: ['splitLedger', CY, CM, false],
    queryFn: () => getSplitLedger(CY, CM, false),
    staleTime: 5 * 60_000,
  })
  const pendingQ = useQuery({
    queryKey: ['pendingManual'],
    queryFn: getPendingManual,
    staleTime: 60_000,
  })

  const rows = summaryQ.data ?? []
  const spent = rows.filter((r) => Number(r.actual) > 0).reduce((s, r) => s + Number(r.actual), 0)
  const totalBudget = rows.reduce((s, r) => s + Number(r.allocated_monthly), 0)
  const owedToYou = (ledgerQ.data ?? []).reduce((s, r) => s + Number(r.total_split_amount), 0)
  const pendingCount = (pendingQ.data ?? []).length

  return (
    <aside
      style={{
        width: 200,
        minWidth: 200,
        height: '100vh',
        borderRight: '1px solid var(--line)',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 26,
              height: 26,
              background: 'var(--ink)',
              color: 'var(--bg)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '-0.03em',
              flexShrink: 0,
            }}
          >
            L
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            Personal Finance
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 8px 4px' }}>
        <p
          style={{
            padding: '4px 8px 6px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
          }}
        >
          WORKSPACE
        </p>
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 8px',
              borderRadius: 6,
              color: isActive ? 'var(--ink)' : 'var(--ink-3)',
              background: isActive ? 'var(--surface-2)' : 'transparent',
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              textDecoration: 'none',
              marginBottom: 1,
              transition: 'background .1s, color .1s',
            })}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              {icon}
            </span>
            <span style={{ flex: 1, lineHeight: 1.3 }}>{label}</span>
            {label === 'Transactions' && pendingCount > 0 && (
              <span
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 5px',
                  lineHeight: '14px',
                  flexShrink: 0,
                }}
              >
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* This month */}
      {totalBudget > 0 && (
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
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
              marginBottom: 8,
            }}
          >
            THIS MONTH
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(
              [
                { label: 'Spent', value: fmt(spent), color: 'var(--ink)', weight: 600 },
                { label: 'Budget', value: fmt(totalBudget), color: 'var(--ink-2)', weight: 400 },
                ...(owedToYou > 0
                  ? [
                      {
                        label: 'Owed to you',
                        value: fmt(owedToYou),
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
      )}

      <div style={{ flex: 1 }} />

      {/* Workspace / user */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--ink-2)',
            flexShrink: 0,
          }}
        >
          YO
        </div>
        <div style={{ overflow: 'hidden' }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink)',
              lineHeight: 1.2,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            Your workspace
          </p>
          <p style={{ fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.2, marginTop: 1 }}>
            privacy-first · local
          </p>
        </div>
      </div>
    </aside>
  )
}
