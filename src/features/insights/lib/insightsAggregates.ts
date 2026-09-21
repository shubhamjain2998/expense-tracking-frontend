/**
 * Pure aggregation over the user's own transaction history, feeding the
 * insights prompt (see `insightsPrompt.ts`). Nothing here talks to the
 * network or does anything the LLM does for us — it just shapes numbers
 * that are "100% true" because they come straight off the ledger, the same
 * ones Transactions/Budget/Home already show.
 *
 * Commitments reuse `detectRecurring` from `@/features/dashboard/lib/recurring`
 * (median-of-monthly-totals, cadence detection) rather than reimplementing
 * it — that module is the one engine for "what's recurring" and must not be
 * duplicated or edited (see CLAUDE memory: dashboard/lib stays the Home
 * engine, recurring figure stays the MEDIAN).
 */
import { detectRecurring, median } from '@/features/dashboard/lib/recurring'
import type { SplitLedgerRow } from '@/types/dashboard'
import type { ProcessedTransactionItem } from '@/types/transaction'

export interface CategoryMonthTotal {
  category: string
  month: string // YYYY-MM
  total: number // sum of |effective_amount| for expense txns
  /** How many expenses made up that total. Total alone can't separate "paid
   *  more each time" from "paid more often" — the count can, and that
   *  decomposition is the kind of reading the LLM is there to make. */
  count: number
}

export interface IncomeMonthTotal {
  month: string // YYYY-MM
  total: number
}

/** Expense weight by day of week, 0 = Sunday. Feeds timing/behaviour reads
 *  (weekday vs weekend, post-payday bursts) that no category total shows. */
export interface WeekdayTotal {
  weekday: string
  total: number
  count: number
}

export interface IncomeSource {
  category: string
  total: number
}

export interface CommitmentSummary {
  name: string
  category: string
  cadence: string
  monthlyAmount: number
  medianCharge: number
  monthsSeen: number
  lastCharged: string
  /** The recurring engine's own flags (`new`, `changed`, `due-soon`, …) —
   *  passed through so the LLM can reason about price creep and drop-offs
   *  instead of re-deriving them. */
  flags: string[]
}

export interface SplitLedgerSummary {
  person: string
  theyOweYou: number
}

export interface NotableTransaction {
  date: string
  description: string
  category: string
  amount: number // signed effective_amount
}

export interface CategoryOutlier {
  category: string
  description: string
  date: string
  amount: number
  categoryMedian: number
}

export interface InsightsAggregates {
  periodStart: string // YYYY-MM-01
  periodEnd: string // YYYY-MM-<last day>
  monthsCovered: number
  categoryMonthTotals: CategoryMonthTotal[]
  incomeBySource: IncomeSource[]
  incomeByMonth: IncomeMonthTotal[]
  weekdayTotals: WeekdayTotal[]
  commitments: CommitmentSummary[]
  splitLedger: SplitLedgerSummary[]
  topTransactions: NotableTransaction[]
  outliers: CategoryOutlier[]
}

export const INSIGHTS_WINDOW_MONTHS = 15
export const INSIGHTS_TOP_TXN_COUNT = 30
/** An expense must deviate at least this far from its category's own median
 *  (in multiples of that median) to count as an outlier. */
const OUTLIER_MULTIPLE = 2.5
/** A category needs at least this many expenses in-window before "median"
 *  is meaningful enough to flag outliers against. */
const OUTLIER_MIN_CATEGORY_COUNT = 5
const OUTLIER_MAX_COUNT = 20

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function lastDayOfMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
}

export function computeInsightsAggregates(
  txns: ProcessedTransactionItem[],
  ledger: SplitLedgerRow[],
  now: Date,
  windowMonths: number = INSIGHTS_WINDOW_MONTHS
): InsightsAggregates {
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (windowMonths - 1), 1)
  )
  const inWindow = txns.filter((t) => new Date(t.txn_date) >= windowStart)

  // ── Per-category monthly totals (expenses only) ────────────────────────
  const catMonth = new Map<string, { total: number; count: number }>()
  for (const t of inWindow) {
    if (t.txn_type !== 'expense') continue
    const amt = Math.abs(Number(t.effective_amount))
    if (!Number.isFinite(amt)) continue
    const key = `${t.category}\u0000${monthKey(t.txn_date)}`
    const cell = catMonth.get(key)
    if (cell) {
      cell.total += amt
      cell.count += 1
    } else {
      catMonth.set(key, { total: amt, count: 1 })
    }
  }
  const categoryMonthTotals: CategoryMonthTotal[] = [...catMonth.entries()]
    .map(([key, cell]) => {
      const [category, month] = key.split('\u0000')
      return { category, month, total: cell.total, count: cell.count }
    })
    .sort((a, b) => a.month.localeCompare(b.month) || a.category.localeCompare(b.category))

  // ── Income by source ────────────────────────────────────────────────────
  const incomeMap = new Map<string, number>()
  for (const t of inWindow) {
    if (t.txn_type !== 'income') continue
    const amt = Math.abs(Number(t.effective_amount))
    if (!Number.isFinite(amt)) continue
    incomeMap.set(t.category, (incomeMap.get(t.category) ?? 0) + amt)
  }
  const incomeBySource: IncomeSource[] = [...incomeMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // ── Income by month (savings rate is a ratio over time, not a total) ────
  const incomeMonthMap = new Map<string, number>()
  for (const t of inWindow) {
    if (t.txn_type !== 'income') continue
    const amt = Math.abs(Number(t.effective_amount))
    if (!Number.isFinite(amt)) continue
    const m = monthKey(t.txn_date)
    incomeMonthMap.set(m, (incomeMonthMap.get(m) ?? 0) + amt)
  }
  const incomeByMonth: IncomeMonthTotal[] = [...incomeMonthMap.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // ── Expense weight by weekday ──────────────────────────────────────────
  const weekdayCells = WEEKDAY_NAMES.map((weekday) => ({ weekday, total: 0, count: 0 }))
  for (const t of inWindow) {
    if (t.txn_type !== 'expense') continue
    const amt = Math.abs(Number(t.effective_amount))
    if (!Number.isFinite(amt)) continue
    const cell = weekdayCells[new Date(t.txn_date).getUTCDay()]
    if (!cell) continue
    cell.total += amt
    cell.count += 1
  }
  const weekdayTotals: WeekdayTotal[] = weekdayCells

  // ── Commitments (reuse the one recurring-detection engine) ─────────────
  const recurring = detectRecurring(inWindow, now)
  const commitments: CommitmentSummary[] = recurring.commitments.map((c) => ({
    name: c.name,
    category: c.category,
    cadence: c.cadence,
    monthlyAmount: c.monthlyAmount,
    medianCharge: c.medianAmount,
    monthsSeen: c.monthsSeen,
    lastCharged: c.lastCharged,
    flags: c.flags,
  }))

  // ── Split ledger (they owe you) ─────────────────────────────────────────
  const splitLedger: SplitLedgerSummary[] = ledger
    .map((r) => ({ person: r.person_name, theyOweYou: Number(r.total_split_amount) }))
    .filter((r) => r.theyOweYou > 0)
    .sort((a, b) => b.theyOweYou - a.theyOweYou)

  // ── Top transactions by absolute amount ─────────────────────────────────
  const topTransactions: NotableTransaction[] = [...inWindow]
    .sort((a, b) => Math.abs(Number(b.effective_amount)) - Math.abs(Number(a.effective_amount)))
    .slice(0, INSIGHTS_TOP_TXN_COUNT)
    .map((t) => ({
      date: t.txn_date,
      description: t.description,
      category: t.category,
      amount: Number(t.effective_amount),
    }))

  // ── Per-category outliers vs. that category's own median ───────────────
  const byCategory = new Map<string, ProcessedTransactionItem[]>()
  for (const t of inWindow) {
    if (t.txn_type !== 'expense') continue
    const list = byCategory.get(t.category)
    if (list) list.push(t)
    else byCategory.set(t.category, [t])
  }
  const outlierCandidates: CategoryOutlier[] = []
  for (const [category, list] of byCategory) {
    if (list.length < OUTLIER_MIN_CATEGORY_COUNT) continue
    const amounts = list.map((t) => Math.abs(Number(t.effective_amount)))
    const catMedian = median(amounts)
    if (catMedian <= 0) continue
    for (const t of list) {
      const amt = Math.abs(Number(t.effective_amount))
      if (amt >= catMedian * OUTLIER_MULTIPLE) {
        outlierCandidates.push({
          category,
          description: t.description,
          date: t.txn_date,
          amount: Number(t.effective_amount),
          categoryMedian: catMedian,
        })
      }
    }
  }
  const outliers = outlierCandidates
    .sort((a, b) => Math.abs(b.amount) / b.categoryMedian - Math.abs(a.amount) / a.categoryMedian)
    .slice(0, OUTLIER_MAX_COUNT)

  const periodStart = `${windowStart.getUTCFullYear()}-${String(windowStart.getUTCMonth() + 1).padStart(2, '0')}-01`
  const endYear = now.getUTCFullYear()
  const endMonth = now.getUTCMonth() + 1
  const periodEnd = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDayOfMonth(endYear, endMonth)).padStart(2, '0')}`

  return {
    periodStart,
    periodEnd,
    monthsCovered: windowMonths,
    categoryMonthTotals,
    incomeBySource,
    incomeByMonth,
    weekdayTotals,
    commitments,
    splitLedger,
    topTransactions,
    outliers,
  }
}
