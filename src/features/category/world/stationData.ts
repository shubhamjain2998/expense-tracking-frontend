/**
 * Shaping for the category world's stations. Pure; every number here already
 * appears in a category panel (or its sr-only table), so the scene never
 * disagrees with the panel beside it.
 */
import type { ProcessedTransactionItem } from '@/types/transaction'

import type { BreakdownRow, CategoryMonthPoint } from '../lib/categoryStats'

// ── Station 1 · the trend, as monthly columns ───────────────────────────────

export interface MonthColumn {
  year: number
  month: number
  label: string
  amount: number
  /** That month's budget for this category; 0 when unknown or unset. */
  budget: number
  over: boolean
  /** The month the page is showing — always the last column. */
  selected: boolean
}

export interface MonthsModel {
  columns: MonthColumn[]
  /** Median month, as in the stats strip; null for an empty series. */
  median: number | null
  /** Tallest of amounts and budgets — the station's one height scale. */
  max: number
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * One column per month of `series` (dense, chronological, ending at the
 * selected month). `budgetFor` answers per calendar month; the page only
 * knows the selected month's calendar year, so other years answer 0.
 */
export function buildMonths(
  series: CategoryMonthPoint[],
  budgetFor: (year: number, month: number) => number
): MonthsModel {
  const list = series ?? []
  const columns = list.map<MonthColumn>((p, i) => {
    const amount = Math.max(0, p.amount || 0)
    const budget = Math.max(0, budgetFor(p.year, p.month) || 0)
    return {
      year: p.year,
      month: p.month,
      label: p.label,
      amount,
      budget,
      over: budget > 0 && amount > budget,
      selected: i === list.length - 1,
    }
  })
  return {
    columns,
    median: median(columns.map((c) => c.amount)),
    max: columns.reduce((m, c) => Math.max(m, c.amount, c.budget), 0),
  }
}

// ── Station 2 · where in the category, as two rows of towers ────────────────

export type BreakdownKind = 'merchant' | 'tag'

export interface BreakdownTower {
  /** `merchant:<name>` / `tag:<name>` — shared with the panel's rows. */
  key: string
  kind: BreakdownKind
  name: string
  total: number
  count: number
  /** Position within its row, 0 = largest. */
  rank: number
}

export interface BreakdownModel {
  merchants: BreakdownTower[]
  tags: BreakdownTower[]
  /** One scale across both rows, so a merchant and a tag compare honestly. */
  max: number
}

/** The panel lists the top eight of each; the towers match it row for row. */
export const BREAKDOWN_LIMIT = 8

export function breakdownKey(kind: BreakdownKind, name: string): string {
  return `${kind}:${name}`
}

export function buildBreakdown(merchants: BreakdownRow[], tags: BreakdownRow[]): BreakdownModel {
  const row = (rows: BreakdownRow[], kind: BreakdownKind) =>
    (rows ?? [])
      .slice(0, BREAKDOWN_LIMIT)
      .filter((r) => r.total > 0)
      .map<BreakdownTower>((r, rank) => ({
        key: breakdownKey(kind, r.name),
        kind,
        name: r.name,
        total: r.total,
        count: r.count,
        rank,
      }))
  const m = row(merchants, 'merchant')
  const t = row(tags, 'tag')
  return {
    merchants: m,
    tags: t,
    max: [...m, ...t].reduce((mx, r) => Math.max(mx, r.total), 0),
  }
}

// ── Station 3 · the month's transactions, as a day-of-month field ───────────

export interface DayBlock {
  id: string
  /** Day of the month, 1-based. */
  day: number
  /** Position in that day's stack, 0 = front (the smallest). */
  slot: number
  amount: number
  description: string
  date: string
}

export interface DaysModel {
  blocks: DayBlock[]
  daysInMonth: number
  /** Most transactions on any one day — the field's depth. */
  depth: number
  /** Largest single transaction — the station's height scale. */
  max: number
}

function txnAmount(t: ProcessedTransactionItem): number {
  const n = Math.abs(Number(t.effective_amount))
  return Number.isFinite(n) ? n : 0
}

/**
 * One block per transaction, placed on its day of the month. A day's
 * transactions stand one behind the other, smallest in front, so a large
 * charge never hides a small one.
 */
export function buildDays(
  txns: ProcessedTransactionItem[],
  calYear: number,
  calMonth: number
): DaysModel {
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const byDay = new Map<number, DayBlock[]>()
  for (const t of txns ?? []) {
    const amount = txnAmount(t)
    // The date string, not new Date(): a bare YYYY-MM-DD parses as UTC.
    const day = Number(t.txn_date.slice(8, 10))
    if (amount <= 0 || !Number.isInteger(day) || day < 1 || day > daysInMonth) continue
    const list = byDay.get(day) ?? []
    list.push({ id: t.id, day, slot: 0, amount, description: t.description, date: t.txn_date })
    byDay.set(day, list)
  }
  const blocks: DayBlock[] = []
  let depth = 0
  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    const list = byDay.get(day) ?? []
    list.sort((a, b) => a.amount - b.amount || a.id.localeCompare(b.id))
    list.forEach((b, slot) => blocks.push({ ...b, slot }))
    depth = Math.max(depth, list.length)
  }
  return {
    blocks,
    daysInMonth,
    depth,
    max: blocks.reduce((m, b) => Math.max(m, b.amount), 0),
  }
}
