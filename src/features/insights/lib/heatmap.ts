/**
 * Month × category heatmap shaping (Insights §3 — "When it happens").
 *
 * Pure, local to this feature — NOT part of src/features/dashboard/lib
 * (that directory is off-limits this phase). Derives directly from
 * `allHistory` (useAllProcessedTransactions), the same transaction list the
 * dashboard engines consume, so this stays a read-only reshaping of data the
 * app already fetches.
 *
 * Shade is relative to each ROW's own peak (not a fixed scale) — a category
 * with a big peak (rent) and one with a small peak (transport) both use the
 * full h1..h5 range. "Over budget" is a separate boolean per cell, rendered
 * as an inset ring, never folded into the shade bucket.
 */
import type { ProcessedTransactionItem } from '@/types/transaction'

export interface HeatmapCell {
  year: number
  month: number // 1-12
  label: string
  value: number
  /** 1 (quiet) .. 5 (peak) relative to this row's own max; null = future month, no data yet. */
  bucket: 1 | 2 | 3 | 4 | 5 | null
  over: boolean
}

export interface HeatmapRow {
  category: string
  cells: HeatmapCell[]
  peak: number
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/** Look up the allocated monthly budget for a category in a given calendar
 *  month. Returns 0 when no budget is set (never treated as "over"). */
export type BudgetLookup = (category: string, year: number, month: number) => number

/**
 * Build one heatmap row per category: `monthsWindow` trailing calendar
 * months ending at `now` (inclusive), plus their totals bucketed 1-5
 * relative to the row's own peak.
 *
 * `categories` should already be the trimmed, sorted set of rows to show
 * (top-N by spend) — this function doesn't do the picking.
 */
export function buildHeatmapRows(
  txns: ProcessedTransactionItem[],
  categories: string[],
  now: Date,
  monthsWindow: number,
  budgetFor: BudgetLookup
): HeatmapRow[] {
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1

  // Dense list of the trailing window's (year, month) pairs, oldest→newest.
  const windowMonths: { year: number; month: number }[] = []
  let y = nowYear
  let m = nowMonth
  for (let i = 0; i < monthsWindow; i++) {
    windowMonths.push({ year: y, month: m })
    const p = prevMonth(y, m)
    y = p.year
    m = p.month
  }
  windowMonths.reverse()

  // category -> "yyyy-m" -> total
  const totals = new Map<string, Map<string, number>>()
  for (const t of txns) {
    if (t.txn_type !== 'expense') continue
    if (!categories.includes(t.category)) continue
    const d = new Date(t.txn_date)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    const amount = Math.abs(Number(t.effective_amount))
    if (!Number.isFinite(amount)) continue
    let byMonth = totals.get(t.category)
    if (!byMonth) {
      byMonth = new Map()
      totals.set(t.category, byMonth)
    }
    byMonth.set(key, (byMonth.get(key) ?? 0) + amount)
  }

  return categories.map((category) => {
    const byMonth = totals.get(category) ?? new Map<string, number>()
    const rawCells = windowMonths.map(({ year, month }) => ({
      year,
      month,
      value: byMonth.get(`${year}-${month}`) ?? 0,
      isFuture: year > nowYear || (year === nowYear && month > nowMonth),
    }))
    const peak = rawCells.reduce((max, c) => (c.isFuture ? max : Math.max(max, c.value)), 0)

    const cells: HeatmapCell[] = rawCells.map((c) => {
      if (c.isFuture) {
        return {
          year: c.year,
          month: c.month,
          label: SHORT_MONTHS[c.month - 1],
          value: 0,
          bucket: null,
          over: false,
        }
      }
      const bucket: HeatmapCell['bucket'] =
        peak <= 0
          ? 1
          : (Math.min(5, Math.max(1, Math.ceil((c.value / peak) * 5))) as 1 | 2 | 3 | 4 | 5)
      const budget = budgetFor(category, c.year, c.month)
      const over = budget > 0 && c.value > budget
      return {
        year: c.year,
        month: c.month,
        label: SHORT_MONTHS[c.month - 1],
        value: c.value,
        bucket,
        over,
      }
    })

    return { category, cells, peak }
  })
}

/** Top-N categories by total expense over the given transactions, desc. */
export function topCategoriesBySpend(txns: ProcessedTransactionItem[], n: number): string[] {
  const totals = new Map<string, number>()
  for (const t of txns) {
    if (t.txn_type !== 'expense') continue
    const amount = Math.abs(Number(t.effective_amount))
    if (!Number.isFinite(amount)) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) + amount)
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category]) => category)
}
