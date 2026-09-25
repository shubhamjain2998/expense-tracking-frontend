/**
 * Year terrain — pure shaping for the 3D year view on Home.
 *
 * Lays the selected year out as a grid: one column per period month, one row
 * per category, and a cell holding what that category spent that month. It
 * owns no numbers of its own: spend comes from the processed-transaction
 * history the page already loads, the plan from the same `allocated_monthly`
 * that Where it went ticks against, and the projection uses the same rule as
 * computeYearOutlook (the pace of the completed months).
 *
 * Never fetches, never throws. The scene only draws what this returns.
 */
import type { PeriodMode } from '@/lib/period'
import { calendarToPeriod, getCurrentPeriod, monthShortLabel } from '@/lib/period'
import type { SummaryRow } from '@/types/dashboard'
import type { ProcessedTransactionItem } from '@/types/transaction'

/** Rows beyond this fold into one "Everything else" row. */
export const DEFAULT_TERRAIN_ROWS = 8
export const OTHER_ROW_LABEL = 'Everything else'

export type TerrainCellKind = 'actual' | 'current' | 'projected'

export interface TerrainCell {
  row: number
  /** 0-based column; period month is `col + 1`. */
  col: number
  category: string
  periodMonth: number
  /** Spend for the month; for projected cells, the category's monthly pace. */
  amount: number
  /** Monthly plan for the category, 0 when none is set. */
  plan: number
  kind: TerrainCellKind
  over: boolean
  /** Expected-by-today spend on the current month's cells; null elsewhere. */
  paceAt: number | null
  /** False for the folded "Everything else" row, which has no drill-down. */
  linkable: boolean
}

export interface TerrainRow {
  category: string
  /** Actual spend across the year so far, used for ordering. */
  total: number
  linkable: boolean
}

export interface YearTerrain {
  rows: TerrainRow[]
  months: { periodMonth: number; label: string }[]
  cells: TerrainCell[]
  /** Largest amount or plan in any cell — the scene's height scale. */
  max: number
  /** Column of today's month when the selected year is the current one. */
  currentCol: number | null
}

export interface YearTerrainInput {
  txns: ProcessedTransactionItem[]
  summaryRows: SummaryRow[]
  year: number
  mode: PeriodMode
  now: Date
  /** Fraction of today's month elapsed, 0–1. */
  monthFraction: number
  maxRows?: number
}

/** Signed spend for a transaction: expenses add, refunds subtract, the rest is 0. */
function spendAmount(t: ProcessedTransactionItem): number {
  if (t.txn_type !== 'expense' && t.txn_type !== 'refund') return 0
  const n = Number(t.effective_amount)
  return Number.isFinite(n) ? n : 0
}

function parseYearMonth(s: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(s ?? '')
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

export function buildYearTerrain({
  txns,
  summaryRows,
  year,
  mode,
  now,
  monthFraction,
  maxRows = DEFAULT_TERRAIN_ROWS,
}: YearTerrainInput): YearTerrain {
  const months = Array.from({ length: 12 }, (_, i) => ({
    periodMonth: i + 1,
    label: monthShortLabel(i + 1, mode),
  }))
  const empty: YearTerrain = { rows: [], months, cells: [], max: 0, currentCol: null }

  const current = getCurrentPeriod(mode, now)
  if (year > current.year) return empty
  const currentCol = year === current.year ? current.month - 1 : null
  // Columns that hold real spend: everything up to and including today's month.
  const lastActualCol = currentCol ?? 11

  // category -> 12 monthly totals
  const byCategory = new Map<string, number[]>()
  for (const t of txns ?? []) {
    const amt = spendAmount(t)
    if (amt === 0) continue
    const ym = parseYearMonth(t.txn_date)
    if (!ym) continue
    const p = calendarToPeriod(ym.year, ym.month, mode)
    if (p.year !== year || p.month - 1 > lastActualCol) continue
    const series = byCategory.get(t.category) ?? new Array<number>(12).fill(0)
    series[p.month - 1] += amt
    byCategory.set(t.category, series)
  }
  for (const series of byCategory.values()) {
    for (let i = 0; i < 12; i++) series[i] = Math.max(0, series[i])
  }

  const ranked = [...byCategory.entries()]
    .map(([category, series]) => ({ category, series, total: series.reduce((s, v) => s + v, 0) }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
  if (ranked.length === 0) return { ...empty, currentCol }

  const kept = ranked.length > maxRows ? ranked.slice(0, maxRows - 1) : ranked
  const folded = ranked.length > maxRows ? ranked.slice(maxRows - 1) : []

  const planByCategory = new Map<string, number>()
  for (const r of summaryRows ?? []) {
    const plan = Math.max(0, Number(r.allocated_monthly))
    if (Number.isFinite(plan)) planByCategory.set(r.category, plan)
  }

  const rows: (TerrainRow & { series: number[]; plan: number })[] = kept.map((r) => ({
    category: r.category,
    total: r.total,
    linkable: true,
    series: r.series,
    plan: planByCategory.get(r.category) ?? 0,
  }))
  if (folded.length > 0) {
    const series = new Array<number>(12).fill(0)
    for (const r of folded) for (let i = 0; i < 12; i++) series[i] += r.series[i]
    rows.push({
      category: OTHER_ROW_LABEL,
      total: folded.reduce((s, r) => s + r.total, 0),
      linkable: false,
      series,
      plan: folded.reduce((s, r) => s + (planByCategory.get(r.category) ?? 0), 0),
    })
  }

  const fraction = Math.min(1, Math.max(0, monthFraction))
  const cells: TerrainCell[] = []
  let max = 0

  rows.forEach((r, row) => {
    // Pace of the completed months; with none completed, scale the current
    // month up by how far through it we are (same rule as computeYearOutlook).
    let pace = 0
    if (currentCol !== null) {
      if (currentCol > 0) {
        pace = r.series.slice(0, currentCol).reduce((s, v) => s + v, 0) / currentCol
      } else if (fraction > 0) {
        pace = r.series[0] / fraction
      }
    }

    for (let col = 0; col < 12; col++) {
      const kind: TerrainCellKind =
        currentCol === null || col < currentCol
          ? 'actual'
          : col === currentCol
            ? 'current'
            : 'projected'
      const amount = kind === 'projected' ? pace : r.series[col]
      if (amount <= 0 && r.plan <= 0) continue
      cells.push({
        row,
        col,
        category: r.category,
        periodMonth: col + 1,
        amount,
        plan: r.plan,
        kind,
        over: kind !== 'projected' && r.plan > 0 && amount > r.plan,
        paceAt: kind === 'current' && r.plan > 0 ? r.plan * fraction : null,
        linkable: r.linkable,
      })
      max = Math.max(max, amount, r.plan)
    }
  })

  return {
    rows: rows.map(({ category, total, linkable }) => ({ category, total, linkable })),
    months,
    cells,
    max,
    currentCol,
  }
}
