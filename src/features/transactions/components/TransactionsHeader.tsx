import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/format'
import { formatYearLabel, monthLongLabel } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'

import type { TxnTotals } from '../lib/txnFormat'

interface TransactionsHeaderProps {
  year: number
  month: number
  mode: PeriodMode
  allTxnsCount: number
  totals: TxnTotals
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
  totals,
  onPrevMonth,
  onNextMonth,
  onManualEntry,
  onUpload,
}: TransactionsHeaderProps) {
  const { expenseTotal, incomeTotal, netTotal, hasMixed } = totals
  return (
    <div className="flex flex-col gap-3 pb-5 md:flex-row md:items-end md:justify-between md:gap-4">
      <div>
        <p className="eyebrow mb-2">Transactions</p>
        <h1 className="display num flex flex-wrap items-baseline gap-3 text-[28px] text-[var(--ink)] md:text-[36px]">
          <span>{allTxnsCount} transactions</span>
          {hasMixed ? (
            <span className="flex items-baseline gap-1.5 text-[16px] font-medium md:text-[18px]">
              <span style={{ color: 'var(--ink-3)' }} title="Expenses this period">
                −{formatCurrency(expenseTotal, { fractionDigits: 0 })}
              </span>
              <span style={{ color: 'var(--ink-4)', fontSize: '0.85em' }}>·</span>
              <span style={{ color: 'var(--pos)' }} title="Income / credits this period">
                +{formatCurrency(incomeTotal, { fractionDigits: 0 })}
              </span>
            </span>
          ) : (
            <span
              className="text-[16px] font-medium md:text-[18px]"
              style={{ color: netTotal < 0 ? 'var(--pos)' : 'var(--ink-3)' }}
              title={netTotal < 0 ? 'Net income this period' : 'Net spend this period'}
            >
              {netTotal < 0 ? '+' : ''}
              {formatCurrency(Math.abs(netTotal), { fractionDigits: 2 })}
            </span>
          )}
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
            <Icon name="chevron_left" size={16} />
          </button>
          <span className="ym-nav-label num">
            {monthLongLabel(month, mode).slice(0, 3)} {formatYearLabel(year, mode)}
          </span>
          <button onClick={onNextMonth} className="btn ghost ym-nav-btn" aria-label="Next month">
            <Icon name="chevron_right" size={16} />
          </button>
        </div>

        <button onClick={onManualEntry} className="btn gap-[5px]" aria-label="Manual entry">
          <Icon name="add" size={14} />
          <span className="desktop-only">Manual entry</span>
        </button>

        <button onClick={onUpload} className="btn primary gap-[5px]" aria-label="Upload statement">
          <Icon name="upload" size={14} />
          <span className="desktop-only">Upload</span>
        </button>
      </div>
    </div>
  )
}
