/**
 * Shaping for the Home world's stations. Pure; every number here already
 * appears in a Home block, so the scene never disagrees with the panel
 * beside it.
 */
import type { SummaryRow } from '@/types/dashboard'

import type { IncomeExpenseTrendPoint } from '../types'

// ── Station 1 · the month, as a vessel ──────────────────────────────────────

export interface VesselModel {
  income: number
  spent: number
  /** Monthly budget across categories, 0 when none is set. */
  budget: number
  /** Budget expected to be used by today; null without a budget. */
  pace: number | null
  /** Spend that sits inside income. */
  inside: number
  /** Spend above income, 0 when the month is in the black. */
  overflow: number
  /** Income left over, 0 when spend passed it. */
  saved: number
  /** Tallest of the figures — the vessel's height scale. */
  max: number
}

export function buildVessel(input: {
  income: number
  spent: number
  budget: number
  paceAt: number
}): VesselModel {
  const income = Math.max(0, input.income || 0)
  const spent = Math.max(0, input.spent || 0)
  const budget = Math.max(0, input.budget || 0)
  const pace = budget > 0 ? budget * Math.min(1, Math.max(0, input.paceAt || 0)) : null
  return {
    income,
    spent,
    budget,
    pace,
    inside: income > 0 ? Math.min(spent, income) : spent,
    overflow: income > 0 ? Math.max(0, spent - income) : 0,
    saved: Math.max(0, income - spent),
    max: Math.max(income, spent, budget),
  }
}

// ── Station 2 · where it went, as towers ────────────────────────────────────

export interface Tower {
  category: string
  actual: number
  allocated: number
  over: boolean
  /** Expected-by-today spend on this category; null without a budget. */
  paceAt: number | null
}

/**
 * One tower per category with spend, largest first — the same rows and order
 * as Where it went's Amount view, so tower n is row n.
 */
export function buildTowers(summaryRows: SummaryRow[], paceAt: number): Tower[] {
  return (summaryRows ?? [])
    .map((r) => {
      const actual = Math.max(0, Number(r.actual) || 0)
      const allocated = Math.max(0, Number(r.allocated_monthly) || 0)
      return {
        category: r.category,
        actual,
        allocated,
        over: allocated > 0 && actual > allocated,
        paceAt: allocated > 0 ? allocated * paceAt : null,
      }
    })
    .filter((t) => t.actual > 0)
    .sort((a, b) => b.actual - a.actual)
}

// ── Station 4 · the trend, as ribbons ───────────────────────────────────────

export interface TrendModel {
  points: IncomeExpenseTrendPoint[]
  max: number
  /** Mean monthly spend across the window; null for an empty window. */
  avgExpense: number | null
}

export function buildTrend(points: IncomeExpenseTrendPoint[]): TrendModel {
  const list = points ?? []
  const max = list.reduce((m, p) => Math.max(m, p.income, p.expense), 0)
  const avgExpense = list.length > 0 ? list.reduce((s, p) => s + p.expense, 0) / list.length : null
  return { points: list, max, avgExpense }
}
