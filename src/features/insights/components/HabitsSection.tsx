import { useState } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Habit, HabitsResult } from '@/features/dashboard/lib/contracts'
import { formatCurrency } from '@/lib/format'

import { risingRead, sparklinePath } from '../lib/habitsExtra'

interface TagSpendRow {
  label: string
  total: number
  txnCount: number
}

interface HabitsSectionProps {
  result: HabitsResult
  tagSpend: TagSpendRow[]
  spans: Map<string, string[]>
  totalWindowSpend: number
  isLoading: boolean
}

type Mode = 'habit' | 'tag'

/**
 * Insights §2 — Habits. Tag groups that cut across categories.
 * Shaping salvaged from `src/features/dashboard/components/HabitsPanel.tsx`
 * — same `computeHabits`/`computeTagSpend` pair and by-habit/by-tag toggle,
 * rendered here as the mock's table instead of a bar list.
 */
export function HabitsSection({
  result,
  tagSpend,
  spans,
  totalWindowSpend,
  isLoading,
}: HabitsSectionProps) {
  const [mode, setMode] = useState<Mode>('habit')
  const top = result.habits[0]
  const topRise = top ? risingRead(top.trend) : null
  const topTags = tagSpend.slice(0, 8)

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Habits</h2>
        <span className="sub">
          Tag groups that cut across categories · average per month over {result.monthsCovered}{' '}
          months
        </span>
        <span className="act">
          <span className="seg">
            <button
              type="button"
              className={mode === 'habit' ? 'on' : ''}
              aria-pressed={mode === 'habit'}
              onClick={() => setMode('habit')}
            >
              By habit
            </button>
            <button
              type="button"
              className={mode === 'tag' ? 'on' : ''}
              aria-pressed={mode === 'tag'}
              onClick={() => setMode('tag')}
            >
              By tag
            </button>
          </span>
        </span>
      </div>

      <div className="card card-flush">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : result.habits.length === 0 ? (
          <EmptyState
            icon="tag"
            title="No habits yet"
            description="Tag a few transactions across categories to see how your spending clusters."
          />
        ) : mode === 'habit' ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Habit</th>
                <th>Spans</th>
                <th style={{ width: 88 }}>Shape</th>
                <th className="num">Avg / month</th>
                <th className="num">Share of spend</th>
              </tr>
            </thead>
            <tbody>
              {result.habits.map((habit: Habit) => (
                <tr key={habit.key}>
                  <td className="font-medium text-[var(--ink)]">{habit.label}</td>
                  <td className="text-[12.5px] text-[var(--ink-3)]">
                    {(spans.get(habit.label) ?? []).join(' · ') || '—'}
                  </td>
                  <td>
                    <svg className="spark" viewBox="0 0 64 20" aria-hidden="true">
                      <path d={sparklinePath(habit.trend)} />
                    </svg>
                  </td>
                  <td className="num">{formatCurrency(habit.perMonth)}</td>
                  <td className="num">
                    {totalWindowSpend > 0
                      ? `${((habit.total / totalWindowSpend) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Tag</th>
                <th className="num">Transactions</th>
                <th className="num">Total</th>
                <th className="num">Share of spend</th>
              </tr>
            </thead>
            <tbody>
              {topTags.map((tag) => (
                <tr key={tag.label}>
                  <td className="font-medium text-[var(--ink)]">{tag.label}</td>
                  <td className="num text-[var(--ink-3)]">{tag.txnCount}</td>
                  <td className="num">{formatCurrency(tag.total)}</td>
                  <td className="num">
                    {totalWindowSpend > 0
                      ? `${((tag.total / totalWindowSpend) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && top && topRise && topRise.of > 0 && (
        <p className="text-[12.5px] text-[var(--ink-3)]">
          <b className="text-[var(--ink)]">{top.label}</b> has risen in {topRise.rising} of the last{' '}
          {topRise.of} months —{' '}
          {topRise.rising >= Math.ceil(topRise.of * 0.6)
            ? 'the clearest direction among your habits.'
            : 'one of several with no clear direction yet.'}
        </p>
      )}
    </section>
  )
}
