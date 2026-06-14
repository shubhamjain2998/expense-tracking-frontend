import type { SummaryRow } from '@/types/dashboard'
import type { ProcessedTransactionItem } from '@/types/transaction'

import type { CategoryStat } from '../types'

import { BudgetPaceBars } from './BudgetPaceBars'
import { CategoryDeepDive } from './CategoryDeepDive'
import { CategoryDonutChart } from './CategoryDonutChart'
import { CategoryTransactionStats } from './CategoryTransactionStats'

interface CategorySectionProps {
  // donut
  categoryChartData: { name: string; value: number }[]
  totalDebit: number
  // pace
  budgetRows: SummaryRow[]
  paceAt: number
  dayOfMonth: number
  // stats
  categoryStats: CategoryStat[]
  // deep dive
  allTransactions: ProcessedTransactionItem[]
  summaryRows: SummaryRow[]
  daysInMonth: number
  // shared
  currentMonthLabel: string
  year: number
  isDark: boolean
  summaryLoading: boolean
  allTxnLoading: boolean
}

/**
 * Single consolidated category view: collapses the four formerly-separate
 * category surfaces (donut, budget pace, transaction stats, deep dive) under one
 * section heading so the dashboard stops repeating the category dimension four
 * times — without dropping any data. Each child still renders its own card and
 * owns its own behaviour (e.g. CategoryDeepDive keeps its category selector).
 */
export function CategorySection({
  categoryChartData,
  totalDebit,
  budgetRows,
  paceAt,
  dayOfMonth,
  categoryStats,
  allTransactions,
  summaryRows,
  daysInMonth,
  currentMonthLabel,
  year,
  isDark,
  summaryLoading,
  allTxnLoading,
}: CategorySectionProps) {
  return (
    <div className="space-y-4">
      <div className="section-head">
        <div>
          <div className="title">Category breakdown &amp; budget pace</div>
          <div className="sub">
            Where {currentMonthLabel} {year} went, how you're tracking against limits, and a
            per-category drill-down
          </div>
        </div>
      </div>

      {/* Row 1: donut + budget pace side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        <CategoryDonutChart
          data={categoryChartData}
          totalDebit={totalDebit}
          currentMonthLabel={currentMonthLabel}
          year={year}
          isLoading={summaryLoading}
        />
        <BudgetPaceBars
          budgetRows={budgetRows}
          paceAt={paceAt}
          dayOfMonth={dayOfMonth}
          isLoading={summaryLoading}
        />
      </div>

      {/* Row 2: transaction stats + per-category deep dive */}
      <CategoryTransactionStats categoryStats={categoryStats} isLoading={allTxnLoading} />
      <CategoryDeepDive
        allTransactions={allTransactions}
        summaryRows={summaryRows}
        daysInMonth={daysInMonth}
        currentMonthLabel={currentMonthLabel}
        year={year}
        isLoading={allTxnLoading}
        isDark={isDark}
      />
    </div>
  )
}
