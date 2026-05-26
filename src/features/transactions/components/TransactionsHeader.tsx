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
    <div className="flex flex-col gap-3 pb-5 md:flex-row md:items-end md:justify-between md:gap-4">
      <div>
        <p className="eyebrow mb-2">Transactions</p>
        <h1 className="display num flex flex-wrap items-baseline gap-3 text-[28px] text-[var(--ink)] md:text-[36px]">
          <span>{allTxnsCount} transactions</span>
          <span
            className="text-[16px] font-medium md:text-[18px]"
            style={{ color: total < 0 ? 'var(--pos)' : 'var(--ink-3)' }}
            title={total < 0 ? 'Net income this month' : 'Net spend this month'}
          >
            {total < 0 ? '+' : ''}
            {formatCurrency(Math.abs(total), { fractionDigits: 2 })}
          </span>
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Month nav */}
        <div className="ym-nav">
          <button
            onClick={onPrevMonth}
            className="btn ghost ym-nav-btn"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <span className="ym-nav-label num">
            {monthLongLabel(month, mode).slice(0, 3)} {formatYearLabel(year, mode)}
          </span>
          <button onClick={onNextMonth} className="btn ghost ym-nav-btn" aria-label="Next month">
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <button onClick={onManualEntry} className="btn gap-[5px]" aria-label="Manual entry">
          <span className="material-symbols-outlined text-[14px]">add</span>
          <span className="desktop-only">Manual entry</span>
        </button>

        <button onClick={onUpload} className="btn primary gap-[5px]" aria-label="Upload statement">
          <span className="material-symbols-outlined text-[14px]">upload</span>
          <span className="desktop-only">Upload</span>
        </button>
      </div>
    </div>
  )
}
