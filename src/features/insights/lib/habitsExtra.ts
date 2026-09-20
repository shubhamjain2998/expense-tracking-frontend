/**
 * Small additions on top of `computeHabits` (src/features/dashboard/lib/
 * habits.ts, not edited) for the Insights "Habits" table:
 *
 *  - which categories a habit spans (the engine only exposes this for the
 *    single top habit via `topHabit.categories`, not per-row)
 *  - the window's total spend, to turn each habit's total into a share %
 *  - a simple "rising in N of the last M months" read of a habit's trend
 *
 * Reuses the engine's own exported `HABIT_GROUPS` table and mirrors its
 * private trailing-window boundary (`now.setMonth(now.getMonth() - months)`)
 * so the categories/total line up with what `computeHabits` counted.
 */
import { HABIT_GROUPS } from '@/features/dashboard/lib/habits'
import type { ProcessedTransactionItem } from '@/types/transaction'

const norm = (s: string): string => s.trim().toLowerCase()

function windowStart(now: Date, months: number): Date {
  const start = new Date(now)
  start.setMonth(start.getMonth() - months)
  return start
}

function buildTagToHabit(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const [label, tagNames] of Object.entries(HABIT_GROUPS)) {
    for (const name of tagNames) {
      const key = norm(name)
      const list = map.get(key) ?? []
      list.push(label)
      map.set(key, list)
    }
  }
  return map
}

/** Habit label -> sorted list of categories it touched in the window. */
export function computeHabitSpans(
  txns: ProcessedTransactionItem[],
  now: Date,
  months = 12
): Map<string, string[]> {
  const start = windowStart(now, months)
  const tagToHabit = buildTagToHabit()
  const spans = new Map<string, Set<string>>()

  for (const t of txns) {
    if (t.txn_type !== 'expense') continue
    const d = new Date(t.txn_date)
    if (Number.isNaN(d.getTime()) || d < start || d > now) continue
    const labels = new Set<string>()
    for (const tag of t.tags ?? []) {
      const matches = tagToHabit.get(norm(tag.name))
      if (matches) for (const l of matches) labels.add(l)
    }
    for (const label of labels) {
      let set = spans.get(label)
      if (!set) {
        set = new Set()
        spans.set(label, set)
      }
      if (t.category) set.add(t.category)
    }
  }

  const out = new Map<string, string[]>()
  for (const [label, set] of spans) out.set(label, [...set].sort())
  return out
}

/** Total expense spend across ALL categories in the same trailing window. */
export function totalWindowSpend(txns: ProcessedTransactionItem[], now: Date, months = 12): number {
  const start = windowStart(now, months)
  let total = 0
  for (const t of txns) {
    if (t.txn_type !== 'expense') continue
    const d = new Date(t.txn_date)
    if (Number.isNaN(d.getTime()) || d < start || d > now) continue
    const amount = Math.abs(Number(t.effective_amount))
    if (Number.isFinite(amount)) total += amount
  }
  return total
}

/** Month-over-month rise count across a trend's tail — "risen in N of the
 *  last M months". M = number of consecutive pairs available (<= window). */
export function risingRead(trend: number[], window = 7): { rising: number; of: number } {
  const tail = trend.slice(-window)
  let rising = 0
  for (let i = 1; i < tail.length; i++) {
    if (tail[i] > tail[i - 1]) rising++
  }
  return { rising, of: Math.max(0, tail.length - 1) }
}

/** SVG path `d` for a `.spark` sparkline (viewBox 0 0 64 20), flat when the
 *  series has no variation. */
export function sparklinePath(values: number[]): string {
  if (values.length === 0) return 'M0,10 L64,10'
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = values.length > 1 ? 64 / (values.length - 1) : 0
  return values
    .map((v, i) => {
      const x = (i * step).toFixed(1)
      const y = (18 - ((v - min) / range) * 16).toFixed(1)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
}
