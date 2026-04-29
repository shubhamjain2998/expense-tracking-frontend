import { formatCompact, formatCurrency } from '@/lib/format'
import type { YTDRow } from '@/types/dashboard'

import { PIE_COLORS } from '../lib/chartTheme'

interface YtdIncomeBreakdownProps {
  ytdIncomeSources: { category: string; total: number }[]
  ytdIncomeTotal: number
  expenseCategories: YTDRow[]
  maxExpense: number
  annualBudget: number
}

export function YtdIncomeBreakdown({
  ytdIncomeSources,
  ytdIncomeTotal,
  expenseCategories,
  maxExpense,
  annualBudget,
}: YtdIncomeBreakdownProps) {
  const hasBudget = annualBudget > 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Income sources YTD */}
      <div style={{ padding: '16px 20px', borderRight: '1px solid var(--line)' }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-4)',
            marginBottom: 14,
          }}
        >
          Income sources YTD
        </p>
        {ytdIncomeSources.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No income recorded this year.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ytdIncomeSources.map((src, i) => {
              const pct =
                ytdIncomeTotal > 0 ? Math.round((src.total / ytdIncomeTotal) * 100) : 0
              return (
                <div key={src.category}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: PIE_COLORS[i % PIE_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                        {src.category}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span
                        className="num"
                        style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                      >
                        {formatCurrency(src.total)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Category breakdown YTD */}
      <div style={{ padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-4)',
            }}
          >
            Category breakdown YTD
          </p>
          {hasBudget && <p style={{ fontSize: 10, color: 'var(--ink-4)' }}>spent / ytd budget</p>}
        </div>
        {expenseCategories.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No expenses this year.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {expenseCategories.map((row, i) => {
              const actual = row.actual_ytd
              const allocated = row.allocated_ytd
              const pctUsed = allocated > 0 ? Math.round((actual / allocated) * 100) : null
              const barWidth =
                allocated > 0
                  ? Math.min(100, Math.round((actual / allocated) * 100))
                  : Math.round((actual / maxExpense) * 100)
              const isOver = pctUsed !== null && pctUsed > 100
              const barColor = isOver ? 'var(--neg)' : PIE_COLORS[i % PIE_COLORS.length]
              return (
                <div key={row.category}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: PIE_COLORS[i % PIE_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{row.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="num" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        {formatCompact(actual)}
                        {allocated > 0 ? ` / ${formatCompact(allocated)}` : ''}
                      </span>
                      {pctUsed !== null && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isOver ? 'var(--neg)' : 'var(--ink-4)',
                            minWidth: 32,
                            textAlign: 'right',
                          }}
                        >
                          {pctUsed}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 2 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: barColor,
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
