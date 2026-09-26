/**
 * Category drill-down (/c/:categoryId) shaping — pure functions.
 *
 * Salvaged from `src/features/dashboard/components/CategoryDeepDive.tsx`
 * (merchant ranking, daily/monthly aggregation) and
 * `CategoryTransactionStats.tsx` (count + avg-ticket framing) ahead of
 * Phase 7 deleting both. Local to this feature — does not import from or
 * edit `src/features/dashboard/lib/`.
 */
import type { BudgetEntry } from '@/types/budget'
import type { ProcessedTransactionItem } from '@/types/transaction'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Which way a category's money moves: most categories are spending, but
 *  salary, dividends and the like are income, and the page reads those
 *  transactions instead of showing an empty month. */
export type CategoryFlow = 'expense' | 'income'

function flowAmount(t: ProcessedTransactionItem, flow: CategoryFlow): number {
  if (t.txn_type !== flow) return 0
  const n = Math.abs(Number(t.effective_amount))
  return Number.isFinite(n) ? n : 0
}

/** Income when more of the category's transactions are income than
 *  expense; a stray refund-like credit in a spending category doesn't flip
 *  it. */
export function categoryFlow(txns: ProcessedTransactionItem[], category: string): CategoryFlow {
  let income = 0
  let expense = 0
  for (const t of txns) {
    if (t.category !== category) continue
    if (t.txn_type === 'income') income += 1
    else if (t.txn_type === 'expense') expense += 1
  }
  return income > expense ? 'income' : 'expense'
}

/** Calendar year and month of a transaction, read off the `YYYY-MM-DD`
 *  string: `new Date()` parses a bare date as UTC midnight, which lands on
 *  the previous day (and month) west of UTC. */
export function txnCalMonth(t: ProcessedTransactionItem): { year: number; month: number } {
  return { year: Number(t.txn_date.slice(0, 4)), month: Number(t.txn_date.slice(5, 7)) }
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

export interface CategoryMonthPoint {
  year: number
  month: number
  label: string
  amount: number
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

/** Dense trailing `months` calendar months ending at (calYear, calMonth)
 *  inclusive, for a single category — absent months fill as 0. */
export function categoryMonthlySeries(
  txns: ProcessedTransactionItem[],
  category: string,
  calYear: number,
  calMonth: number,
  months = 15,
  flow: CategoryFlow = 'expense'
): CategoryMonthPoint[] {
  const byKey = new Map<string, number>()
  for (const t of txns) {
    if (t.category !== category) continue
    const amount = flowAmount(t, flow)
    if (amount <= 0) continue
    const { year, month } = txnCalMonth(t)
    if (!Number.isInteger(year) || !Number.isInteger(month)) continue
    const key = `${year}-${month}`
    byKey.set(key, (byKey.get(key) ?? 0) + amount)
  }

  const out: CategoryMonthPoint[] = []
  let y = calYear
  let m = calMonth
  for (let i = 0; i < months; i++) {
    out.push({ year: y, month: m, label: SHORT_MONTHS[m - 1], amount: byKey.get(`${y}-${m}`) ?? 0 })
    const p = prevMonth(y, m)
    y = p.year
    m = p.month
  }
  return out.reverse()
}

export interface CategoryStats {
  medianMonth: number
  biggestMonth: CategoryMonthPoint | null
  thisMonth: number
  /** 1 = biggest month on record. */
  thisMonthRank: number
  txnCount: number
  medianTicket: number
  /** This category's share of ALL-category spend (or income, for an income
   *  category) this calendar month, 0-1. */
  shareOfSpend: number
  /** Same share, previous calendar month — for the "was X% in <month>" line. */
  prevShareOfSpend: number | null
}

/**
 * `series` must be `categoryMonthlySeries`'s output (dense, chronological,
 * ending at the target month). `monthTxns` is this category's transactions
 * in the target month; `allTxnsThisMonth`/`allTxnsPrevMonth` are ALL
 * categories' transactions in the target/previous month (for the
 * share-of-spend denominator). Only `flow` transactions count.
 */
export function computeCategoryStats(
  series: CategoryMonthPoint[],
  monthTxns: ProcessedTransactionItem[],
  allTxnsThisMonth: ProcessedTransactionItem[],
  allTxnsPrevMonth: ProcessedTransactionItem[],
  flow: CategoryFlow = 'expense'
): CategoryStats {
  const medianMonth = median(series.map((p) => p.amount))
  const biggestMonth = series.reduce<CategoryMonthPoint | null>(
    (max, p) => (!max || p.amount > max.amount ? p : max),
    null
  )
  const thisMonth = series.at(-1)?.amount ?? 0
  // Ties share a rank: months above it, plus one. Sorting and finding the
  // point put an empty month 15th of 15 behind fourteen other empty ones.
  const thisMonthRank =
    series.length > 0 ? series.filter((p) => p.amount > thisMonth).length + 1 : 0

  const amounts = monthTxns.map((t) => flowAmount(t, flow)).filter((a) => a > 0)
  const txnCount = amounts.length
  const medianTicket = median(amounts)

  const allThisMonthTotal = allTxnsThisMonth.reduce((s, t) => s + flowAmount(t, flow), 0)
  const allPrevMonthTotal = allTxnsPrevMonth.reduce((s, t) => s + flowAmount(t, flow), 0)
  // The series already holds the category's previous month. Reading the
  // category off this month's transactions made a quiet month report "was
  // 0% last month" whatever last month held.
  const categoryPrevMonthTotal = series.length > 1 ? (series.at(-2)?.amount ?? 0) : 0

  return {
    medianMonth,
    biggestMonth,
    thisMonth,
    thisMonthRank,
    txnCount,
    medianTicket,
    shareOfSpend: allThisMonthTotal > 0 ? thisMonth / allThisMonthTotal : 0,
    prevShareOfSpend: allPrevMonthTotal > 0 ? categoryPrevMonthTotal / allPrevMonthTotal : null,
  }
}

export interface BreakdownRow {
  name: string
  total: number
  count: number
}

/** Merchants (by description) within a set of transactions, sorted desc. */
export function merchantBreakdown(
  txns: ProcessedTransactionItem[],
  flow: CategoryFlow = 'expense'
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>()
  for (const t of txns) {
    const amount = flowAmount(t, flow)
    if (amount <= 0) continue
    const entry = map.get(t.description) ?? { name: t.description, total: 0, count: 0 }
    entry.total += amount
    entry.count += 1
    map.set(t.description, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

/** Tags within a set of transactions, sorted desc, with each tag's share of
 *  the set's total. */
export function tagBreakdown(
  txns: ProcessedTransactionItem[],
  flow: CategoryFlow = 'expense'
): (BreakdownRow & { pctOfMonth: number })[] {
  const map = new Map<string, BreakdownRow>()
  let total = 0
  for (const t of txns) {
    const amount = flowAmount(t, flow)
    if (amount <= 0) continue
    total += amount
    for (const tag of t.tags ?? []) {
      const entry = map.get(tag.name) ?? { name: tag.name, total: 0, count: 0 }
      entry.total += amount
      entry.count += 1
      map.set(tag.name, entry)
    }
  }
  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ ...row, pctOfMonth: total > 0 ? row.total / total : 0 }))
}

/** The single largest transaction in a set, and its share of the set's total —
 *  for "one transaction dominates" framing. */
export function dominantTransaction(
  txns: ProcessedTransactionItem[],
  flow: CategoryFlow = 'expense'
): { txn: ProcessedTransactionItem; amount: number; share: number } | null {
  const withAmounts = txns
    .map((t) => ({ txn: t, amount: flowAmount(t, flow) }))
    .filter((x) => x.amount > 0)
  if (withAmounts.length === 0) return null
  const total = withAmounts.reduce((s, x) => s + x.amount, 0)
  const top = withAmounts.reduce((max, x) => (x.amount > max.amount ? x : max))
  return { txn: top.txn, amount: top.amount, share: total > 0 ? top.amount / total : 0 }
}

/** One category's monthly budget: a twelfth of its annual plan, else 0.
 *  Plans are annual (the backend has no per-month amounts), so every month
 *  of the budget year gets the same figure. */
export function categoryMonthBudget(entries: BudgetEntry[] | undefined, category: string): number {
  const entry = entries?.find((e) => e.category === category)
  return entry ? Number(entry.allocated_amount) / 12 : 0
}
