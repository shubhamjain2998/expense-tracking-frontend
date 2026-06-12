import { usePeriodMode } from '@/hooks/usePeriodMode'
import { monthLongLabel, monthShortLabel } from '@/lib/period'

import { CAT_COLORS, heatColor } from '../lib/heatColor'
import type { HeatmapRowData } from '../types'

export function HeatmapCard({
  data,
  selectedMonth,
  onMonthClick,
}: {
  data: HeatmapRowData[]
  selectedMonth: number
  onMonthClick: (month: number) => void
}) {
  const { mode } = usePeriodMode()
  return (
    <div className="card">
      <div style={{ marginBottom: 16 }}>
        <p className="card-title">Monthly spend heatmap</p>
        <p className="card-sub" style={{ marginTop: 2 }}>
          Values are % of category budget. Click to drill in.
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '2px 3px',
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: 130,
                  textAlign: 'left',
                  paddingBottom: 6,
                  color: 'var(--ink-4)',
                  fontWeight: 500,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              />
              {Array.from({ length: 12 }, (_, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: 'center',
                    width: 52,
                    paddingBottom: 6,
                    color: i + 1 === selectedMonth ? 'var(--accent)' : 'var(--ink-4)',
                    fontWeight: i + 1 === selectedMonth ? 600 : 400,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {monthShortLabel(i + 1, mode).charAt(0)}
                </th>
              ))}
              <th
                style={{
                  textAlign: 'right',
                  paddingLeft: 16,
                  paddingBottom: 6,
                  color: 'var(--ink-4)',
                  fontWeight: 500,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}
              >
                AVG
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.categoryId}>
                <td style={{ paddingRight: 12 }}>
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: CAT_COLORS[row.colorIndex],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        color: 'var(--ink-2)',
                        fontSize: 12,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.categoryName}
                    </span>
                  </div>
                </td>
                {row.cells.map((cell) => {
                  const { bg, fg } = heatColor(cell.percent)
                  const isSelected = cell.month === selectedMonth
                  return (
                    <td key={cell.month} style={{ padding: '1px 2px' }}>
                      {cell.percent !== null ? (
                        <button
                          onClick={() => onMonthClick(cell.month)}
                          title={`${row.categoryName} – ${monthLongLabel(cell.month, mode)}: ${cell.percent}%`}
                          style={{
                            display: 'block',
                            width: '100%',
                            background: bg,
                            color: fg,
                            borderRadius: 4,
                            border: isSelected
                              ? '1.5px solid currentColor'
                              : '1.5px solid transparent',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '5px 2px',
                            cursor: 'pointer',
                            fontVariantNumeric: 'tabular-nums',
                            transition: 'opacity 0.1s',
                            textAlign: 'center',
                          }}
                        >
                          {cell.percent}%
                        </button>
                      ) : (
                        <div
                          style={{
                            display: 'block',
                            width: '100%',
                            height: 27,
                            background: 'var(--surface-2)',
                            borderRadius: 4,
                            border: isSelected
                              ? '1.5px solid var(--line-strong)'
                              : '1.5px solid transparent',
                          }}
                        />
                      )}
                    </td>
                  )
                })}
                <td style={{ textAlign: 'right', paddingLeft: 16 }}>
                  <span
                    className="num"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color:
                        row.avgPercent !== null && row.avgPercent >= 100
                          ? 'var(--neg)'
                          : 'var(--ink-3)',
                    }}
                  >
                    {row.avgPercent !== null ? `${row.avgPercent}%` : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
