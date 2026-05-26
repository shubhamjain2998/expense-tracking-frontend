import { Icon } from '@/components/ui/Icon'
import { formatCompact } from '@/lib/format'

import type { MonthStat } from '../types'

interface YtdMonthlyHighlightsProps {
  highestMonth: MonthStat | null
  lowestMonth: MonthStat | null
  bestSavingsMonth: MonthStat | null
  avgExpense: number
  monthName: (pm: number) => string
}

export function YtdMonthlyHighlights({
  highestMonth,
  lowestMonth,
  bestSavingsMonth,
  avgExpense,
  monthName,
}: YtdMonthlyHighlightsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div style={{ padding: '12px 20px', borderRight: '1px solid var(--line)' }}>
        <p
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
            marginBottom: 6,
          }}
        >
          Highest spend month
        </p>
        {highestMonth && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Icon name="trending_up" size={13} style={{ color: 'var(--neg)' }} />
              <span
                className="num"
                style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}
              >
                {monthName(highestMonth.periodMonth)} · {formatCompact(highestMonth.expense)}
              </span>
            </div>
            {avgExpense > 0 && (
              <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                {Math.round((Math.abs(highestMonth.expense - avgExpense) / avgExpense) * 100)}%
                above avg
              </p>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '12px 20px', borderRight: '1px solid var(--line)' }}>
        <p
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
            marginBottom: 6,
          }}
        >
          Lowest spend month
        </p>
        {lowestMonth && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Icon name="trending_down" size={13} style={{ color: 'var(--pos)' }} />
              <span
                className="num"
                style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}
              >
                {monthName(lowestMonth.periodMonth)} · {formatCompact(lowestMonth.expense)}
              </span>
            </div>
            {avgExpense > 0 && (
              <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                {Math.round((Math.abs(lowestMonth.expense - avgExpense) / avgExpense) * 100)}% below
                avg
              </p>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '12px 20px' }}>
        <p
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
            marginBottom: 6,
          }}
        >
          Best savings month
        </p>
        {bestSavingsMonth ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Icon name="savings" size={13} style={{ color: 'var(--pos)' }} />
              <span
                className="num"
                style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pos)' }}
              >
                {monthName(bestSavingsMonth.periodMonth)} ·{' '}
                {bestSavingsMonth.savings >= 0 ? '+' : ''}
                {formatCompact(bestSavingsMonth.savings)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>
              {bestSavingsMonth.income > 0
                ? Math.round((bestSavingsMonth.savings / bestSavingsMonth.income) * 100)
                : 0}
              % saved
            </p>
          </>
        ) : lowestMonth ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Icon name="savings" size={13} style={{ color: 'var(--pos)' }} />
              <span
                className="num"
                style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}
              >
                {monthName(lowestMonth.periodMonth)} · {formatCompact(lowestMonth.expense)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>Lowest spend</p>
          </>
        ) : null}
      </div>
    </div>
  )
}
