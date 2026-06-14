/**
 * Habits (tags) engine — pure functions for the dashboard redesign.
 *
 * Groups tag-level spend into a small curated set of "habits" that cut across
 * categories (Eating out, Groceries, …) and also exposes a raw per-tag view.
 *
 * See docs/superpowers/specs/2026-06-14-dashboard-redesign-design.md §3.3 and
 * the shared output contracts in ./contracts.ts.
 */
import type { ProcessedTransactionItem } from '@/types/transaction'

import type { Habit, HabitsResult } from './contracts'

/**
 * Curated habit label → tag names that belong to it. Tag matching is
 * case-insensitive and trimmed. Easily editable — this constant is the v1
 * grouping table referenced by the design.
 */
export const HABIT_GROUPS: Record<string, string[]> = {
  'Eating out': [
    'daily meals',
    'cafe / snacks',
    'swiggy',
    'zomato',
    'biryani',
    'burrito',
    'california burrito',
    'chai days',
    'restaurant',
  ],
  Groceries: ['grocery', 'blinkit', 'blink it'],
  'Subscriptions/OTT': ['ott', 'netflix', 'spotify'],
  Fitness: ['badminton court', 'badminton', 'gym', 'sports'],
  'Transport/Fuel': ['fuel', 'uber', 'ola', 'cab', 'metro'],
  Travel: ['domestic trip', 'international', 'unplanned travel', 'flight', 'hotel'],
}

const norm = (s: string): string => s.trim().toLowerCase()

/** Year-month key (e.g. "2026-06") for distinct-month counting. */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Inclusive trailing window [now - months, now]. Returns the start boundary;
 * a txn counts when its date is >= start && <= now.
 */
function windowStart(now: Date, months: number): Date {
  const start = new Date(now)
  start.setMonth(start.getMonth() - months)
  return start
}

function parseDate(txn: ProcessedTransactionItem): Date {
  return new Date(txn.txn_date)
}

function amountOf(txn: ProcessedTransactionItem): number {
  const n = Math.abs(Number(txn.effective_amount))
  return Number.isFinite(n) ? n : 0
}

/** Expense txns within the trailing window, with parsed date attached. */
function windowedExpenses(
  txns: ProcessedTransactionItem[],
  now: Date,
  months: number
): { txn: ProcessedTransactionItem; date: Date }[] {
  const start = windowStart(now, months)
  const out: { txn: ProcessedTransactionItem; date: Date }[] = []
  for (const txn of txns) {
    if (txn.txn_type !== 'expense') continue
    const date = parseDate(txn)
    if (Number.isNaN(date.getTime())) continue
    if (date >= start && date <= now) out.push({ txn, date })
  }
  return out
}

/**
 * Compute curated habit spend over the trailing `months` window ending at `now`.
 * Never throws on empty input.
 */
export function computeHabits(
  txns: ProcessedTransactionItem[],
  now: Date,
  months = 12
): HabitsResult {
  const windowed = windowedExpenses(txns, now, months)

  // Distinct months present in windowed data (min 1 to avoid /0).
  const monthSet = new Set<string>()
  for (const { date } of windowed) monthSet.add(monthKey(date))
  const monthsCovered = Math.max(1, monthSet.size)

  // Ordered list of month buckets oldest→newest for the trailing window so the
  // trend sparkline has a stable length (up to `months`, one per calendar month).
  const trendKeys: string[] = []
  {
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1)
    // Walk back `months - 1` steps then forward, producing months oldest→newest.
    const keys: string[] = []
    for (let i = 0; i < months; i++) {
      keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
      cursor.setMonth(cursor.getMonth() - 1)
    }
    trendKeys.push(...keys.reverse())
  }
  const trendIndex = new Map<string, number>()
  trendKeys.forEach((k, i) => trendIndex.set(k, i))

  // Pre-build a normalized tag→habit lookup.
  const tagToHabit = new Map<string, string[]>()
  for (const [label, tagNames] of Object.entries(HABIT_GROUPS)) {
    for (const name of tagNames) {
      const key = norm(name)
      const list = tagToHabit.get(key) ?? []
      list.push(label)
      tagToHabit.set(key, list)
    }
  }

  interface Acc {
    total: number
    txnCount: number
    trend: number[]
    categories: Set<string>
  }
  const acc = new Map<string, Acc>()
  const ensure = (label: string): Acc => {
    let a = acc.get(label)
    if (!a) {
      a = { total: 0, txnCount: 0, trend: new Array(months).fill(0), categories: new Set() }
      acc.set(label, a)
    }
    return a
  }

  for (const { txn, date } of windowed) {
    const amount = amountOf(txn)
    const idx = trendIndex.get(monthKey(date))
    // Which habits does this txn belong to? Dedupe so a txn with two tags in the
    // same group counts once toward that group.
    const labels = new Set<string>()
    for (const tag of txn.tags ?? []) {
      const matches = tagToHabit.get(norm(tag.name))
      if (matches) for (const l of matches) labels.add(l)
    }
    for (const label of labels) {
      const a = ensure(label)
      a.total += amount
      a.txnCount += 1
      if (idx != null) a.trend[idx] += amount
      if (txn.category) a.categories.add(txn.category)
    }
  }

  const habits: Habit[] = []
  for (const [label, a] of acc) {
    if (a.total <= 0) continue
    habits.push({
      key: label,
      label,
      total: a.total,
      txnCount: a.txnCount,
      perMonth: a.total / monthsCovered,
      trend: a.trend,
    })
  }
  habits.sort((x, y) => y.total - x.total)

  let topHabit: HabitsResult['topHabit'] = null
  if (habits.length > 0) {
    const top = habits[0]
    const a = acc.get(top.label)!
    topHabit = {
      label: top.label,
      perMonth: top.perMonth,
      categories: [...a.categories].sort(),
    }
  }

  return { habits, topHabit, monthsCovered }
}

/**
 * Raw per-tag spend (not grouped) over the trailing window — the "by raw tag"
 * fallback view. Sorted by total desc. Never throws on empty input.
 */
export function computeTagSpend(
  txns: ProcessedTransactionItem[],
  now: Date,
  months = 12
): { label: string; total: number; txnCount: number }[] {
  const windowed = windowedExpenses(txns, now, months)
  const map = new Map<string, { label: string; total: number; txnCount: number }>()
  for (const { txn } of windowed) {
    const amount = amountOf(txn)
    for (const tag of txn.tags ?? []) {
      const key = norm(tag.name)
      let entry = map.get(key)
      if (!entry) {
        entry = { label: tag.name.trim(), total: 0, txnCount: 0 }
        map.set(key, entry)
      }
      entry.total += amount
      entry.txnCount += 1
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}
