/**
 * Shaping for the Budget world's stations. Pure; every model here is built
 * from the same rows the Budget panels render, so an edit to a budget moves
 * the scene the moment the query refetches.
 */
import type { CategoryTableRow, IncomeTableRow, UnbudgetedCategoryRow } from '../types'

export type PeriodView = 'monthly' | 'annual'

/**
 * Share of the selected month expected to be spent by today: today's date
 * over the month's length for the current month, the whole month otherwise.
 * Same reading as Home's pace (dashboard/page.tsx).
 */
export function monthPaceFraction(calYear: number, calMonth: number, now: Date): number {
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const isCurrent = calYear === now.getFullYear() && calMonth === now.getMonth() + 1
  return isCurrent ? now.getDate() / daysInMonth : 1
}

// ── Station 1 · the year, as one large vessel ───────────────────────────────

export interface YearVesselModel {
  /** Year-to-date spend across the plan. */
  spent: number
  /** The year's plan, 0 when none is set. The vessel's rim. */
  plan: number
  /** Plan expected to be used by now (plan × months elapsed / 12); null without a plan. */
  pace: number | null
  /** Year-end at the YTD run-rate; null before any month has elapsed. */
  projected: number | null
  /** Spend that sits inside the plan. */
  fill: number
  /** Spend past the plan, 0 while under it. */
  spill: number
  /** Tallest of the figures — the vessel's height scale. */
  max: number
}

export function buildYearVessel(input: {
  spent: number
  plan: number
  monthsElapsed: number
  projected: number
}): YearVesselModel {
  const spent = Math.max(0, input.spent || 0)
  const plan = Math.max(0, input.plan || 0)
  const months = Math.min(12, Math.max(0, input.monthsElapsed || 0))
  const pace = plan > 0 ? (plan * months) / 12 : null
  const projected = months > 0 ? Math.max(0, input.projected || 0) : null
  return {
    spent,
    plan,
    pace,
    projected,
    fill: plan > 0 ? Math.min(spent, plan) : spent,
    spill: plan > 0 ? Math.max(0, spent - plan) : 0,
    max: Math.max(spent, plan, projected ?? 0),
  }
}

// ── Station 2 · the plan, one glass vessel per category ─────────────────────

export interface PlanVessel {
  /** Category id — the key rows and vessels highlight each other by. */
  key: string
  name: string
  /** Plan for the period shown (monthly or annual): the rim. */
  plan: number
  /** Spend for the same period. */
  spent: number
  fill: number
  spill: number
  over: boolean
  /** Plan expected to be used by today; null without a plan. */
  pace: number | null
}

/**
 * One vessel per plan row, in the table's order so vessel n is row n. Income
 * categories are dropped exactly as the plan table drops them.
 */
export function buildPlanVessels(
  rows: CategoryTableRow[],
  incomeIds: ReadonlySet<string>,
  view: PeriodView,
  paceFraction: number
): PlanVessel[] {
  const k = Math.min(1, Math.max(0, paceFraction || 0))
  return (rows ?? [])
    .filter((r) => !incomeIds.has(r.categoryId))
    .map((r) => {
      const plan = Math.max(0, view === 'monthly' ? r.monthlyBudget : r.annualBudget)
      const spent = Math.max(0, view === 'monthly' ? r.thisMonthSpent : r.ytdSpent)
      return {
        key: r.categoryId,
        name: r.categoryName,
        plan,
        spent,
        fill: plan > 0 ? Math.min(spent, plan) : spent,
        spill: plan > 0 ? Math.max(0, spent - plan) : 0,
        over: plan > 0 && spent > plan,
        pace: plan > 0 ? plan * k : null,
      }
    })
}

// ── Station 3 · outside the plan, as loose blocks ───────────────────────────

export interface LooseBlock {
  key: string
  name: string
  /** Spend for the period shown: this month, or year to date. */
  amount: number
  txnCount: number
}

export function buildLooseBlocks(rows: UnbudgetedCategoryRow[], view: PeriodView): LooseBlock[] {
  return (rows ?? []).map((r) => ({
    key: r.categoryId,
    name: r.categoryName,
    amount: Math.max(0, view === 'monthly' ? r.thisMonthSpent : r.ytdSpent),
    txnCount: r.txnCount,
  }))
}

/**
 * The plan and the loose blocks stand side by side on one stretch of ground,
 * so they share one height scale: an unplanned block reads against the
 * vessels beside it.
 */
export function planScale(vessels: PlanVessel[], blocks: LooseBlock[]): number {
  const v = vessels.reduce((m, x) => Math.max(m, x.plan, x.spent), 0)
  return blocks.reduce((m, b) => Math.max(m, b.amount), v)
}

// ── Station 4 · expected income, as inflow columns ──────────────────────────

export interface InflowColumn {
  key: string
  name: string
  received: number
  /** Expected per month; null when the source has no plan line. */
  expected: number | null
}

export interface InflowModel {
  columns: InflowColumn[]
  max: number
}

export function buildInflow(rows: IncomeTableRow[]): InflowModel {
  const columns = (rows ?? []).map((r) => ({
    key: r.categoryId,
    name: r.categoryName,
    received: Math.max(0, r.receivedThisMonth || 0),
    expected: r.perMonth !== null ? Math.max(0, r.perMonth) : null,
  }))
  const max = columns.reduce((m, c) => Math.max(m, c.received, c.expected ?? 0), 0)
  return { columns, max }
}
