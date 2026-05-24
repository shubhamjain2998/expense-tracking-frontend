import { formatCurrency } from '@/lib/format'
import { formatYearLabel, monthLongLabel } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'

interface TransactionsHeaderProps {
  year: number
  month: number
  mode: PeriodMode
  allTxnsCount: number
  total: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onManualEntry: () => void
  onUpload: () => void
}

export function TransactionsHeader({
  year,
  month,
  mode,
  allTxnsCount,
  total,
  onPrevMonth,
  onNextMonth,
  onManualEntry,
  onUpload,
}: TransactionsHeaderProps) {
  return (
    <div
      className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4"
      style={{ paddingBottom: 20 }}
    >
      <div>
        <p className="card-eyebrow mb-1">Transactions</p>
        <h1
          className="flex flex-wrap items-baseline gap-2 text-[22px] md:gap-3 md:text-[26px]"
          style={{
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: 'var(--ink)',
            lineHeight: 1.15,
          }}
        >
          <span>{allTxnsCount} transactions</span>
          <span
            className="num text-[15px] md:text-[17px]"
            style={{
              fontWeight: 500,
              color: total < 0 ? 'var(--pos)' : 'var(--ink-3)',
            }}
            title={total < 0 ? 'Net income this month' : 'Net spend this month'}
          >
            {total < 0 ? '+' : ''}
            {formatCurrency(Math.abs(total), { fractionDigits: 2 })}
          </span>
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Month nav */}
        <div
          className="flex items-center"
          style={{
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={onPrevMonth}
            className="btn ghost"
            style={{
              borderRadius: 0,
              height: 30,
              width: 30,
              padding: 0,
              borderRight: '1px solid var(--line)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              chevron_left
            </span>
          </button>
          <span
            className="num"
            style={{
              padding: '0 14px',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--ink)',
              minWidth: 80,
              textAlign: 'center',
              letterSpacing: '-0.01em',
            }}
          >
            {monthLongLabel(month, mode).slice(0, 3)} {formatYearLabel(year, mode)}
          </span>
          <button
            onClick={onNextMonth}
            className="btn ghost"
            style={{
              borderRadius: 0,
              height: 30,
              width: 30,
              padding: 0,
              borderLeft: '1px solid var(--line)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              chevron_right
            </span>
          </button>
        </div>

        <button
          onClick={onManualEntry}
          className="btn"
          style={{ gap: 5 }}
          aria-label="Manual entry"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            add
          </span>
          <span className="desktop-only">Manual entry</span>
        </button>

        <button
          onClick={onUpload}
          className="btn primary"
          style={{ gap: 5 }}
          aria-label="Upload statement"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            upload
          </span>
          <span className="desktop-only">Upload</span>
        </button>
      </div>
    </div>
  )
}
