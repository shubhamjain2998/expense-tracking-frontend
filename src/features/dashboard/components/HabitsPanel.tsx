import { useState } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact, formatCurrency } from '@/lib/format'

import { PIE_COLORS } from '../lib/chartTheme'
import type { HabitsResult } from '../lib/contracts'

interface HabitsPanelProps {
  result: HabitsResult
  tagSpend: { label: string; total: number; txnCount: number }[]
  isLoading: boolean
}

type Mode = 'habit' | 'tag'

interface BarItem {
  key: string
  label: string
  total: number
}

export function HabitsPanel({ result, tagSpend, isLoading }: HabitsPanelProps) {
  const [mode, setMode] = useState<Mode>('habit')

  const bars: BarItem[] =
    mode === 'habit'
      ? result.habits.map((h) => ({ key: h.key, label: h.label, total: h.total }))
      : tagSpend
          .slice()
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)
          .map((t) => ({ key: t.label, label: t.label, total: t.total }))

  const maxTotal = Math.max(...bars.map((b) => b.total), 1)
  const topHabit = result.topHabit

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="title">Habits — what tags reveal</div>
          <div className="sub">Tags cut across categories · last 12 months</div>
        </div>
        <div className="right">
          <div className="seg">
            <button className={mode === 'habit' ? 'on' : ''} onClick={() => setMode('habit')}>
              By habit
            </button>
            <button className={mode === 'tag' ? 'on' : ''} onClick={() => setMode('tag')}>
              By tag
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card">
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 3px', color: 'var(--ink)' }}>
              Spend by habit
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0 }}>
              {mode === 'habit' ? 'Grouped by spending habit' : 'Grouped by tag · top 8'}
            </p>
          </div>

          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : bars.length === 0 ? (
            <EmptyState
              icon="tag"
              title="No habits yet"
              description="Tag a few transactions to see how your spending clusters across categories."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {bars.map((bar, i) => {
                const barPct = (bar.total / maxTotal) * 100
                return (
                  <div key={bar.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 12.5,
                        color: 'var(--ink)',
                        width: 120,
                        flexShrink: 0,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                      title={bar.label}
                    >
                      {bar.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        background: 'var(--surface-3)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${barPct}%`,
                          background: PIE_COLORS[i % PIE_COLORS.length],
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <span
                      className="num"
                      style={{
                        fontSize: 12,
                        color: 'var(--ink-2)',
                        minWidth: 84,
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      {formatCurrency(bar.total)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {isLoading ? (
          <Skeleton className="h-full min-h-[140px] w-full" />
        ) : topHabit ? (
          <aside
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              fontSize: 13.5,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
            }}
          >
            <div style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>
              The number you never see as one number:
            </div>
            <span
              className="num"
              style={{
                display: 'block',
                fontSize: 25,
                fontWeight: 600,
                color: 'var(--ink)',
                margin: '6px 0 8px',
              }}
            >
              {formatCompact(topHabit.perMonth)}/mo {topHabit.label}
            </span>
            {topHabit.categories.length > 0 && (
              <span>
                spread across{' '}
                <b style={{ color: 'var(--ink)' }}>{topHabit.categories.join(', ')}</b>. Tags pull
                it into one habit you can act on.
              </span>
            )}
          </aside>
        ) : (
          <aside
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              fontSize: 13,
              color: 'var(--ink-3)',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Tag transactions across a few categories to surface your biggest cross-category habit
            here.
          </aside>
        )}
      </div>
    </div>
  )
}
