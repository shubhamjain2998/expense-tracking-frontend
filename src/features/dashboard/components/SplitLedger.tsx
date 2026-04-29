import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'
import type { SplitLedgerRow } from '@/types/dashboard'

interface SplitLedgerProps {
  ledger: SplitLedgerRow[]
  includeSettled: boolean
  onToggleSettled: () => void
  isLoading: boolean
}

export function SplitLedger({ ledger, includeSettled, onToggleSettled, isLoading }: SplitLedgerProps) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-title">Split ledger</p>
          <p className="card-sub">Owed to you</p>
        </div>
        <button
          onClick={onToggleSettled}
          className={includeSettled ? 'chip accent' : 'chip'}
          style={{ cursor: 'pointer' }}
          title={includeSettled ? 'Showing all (incl. settled)' : 'Hiding settled'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
            {includeSettled ? 'toggle_on' : 'toggle_off'}
          </span>
          Settled
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : ledger.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No split expenses this period.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ledger.map((row, i) => {
            const initials = row.person_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            return (
              <div
                key={row.person_name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--surface-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--ink-2)',
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      {row.person_name}
                    </p>
                    <p style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{i + 1} shared</p>
                  </div>
                </div>
                <span
                  className="num"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                >
                  {formatCurrency(Number(row.total_split_amount))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
