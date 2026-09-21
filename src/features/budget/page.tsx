import { useState } from 'react'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { usePeriod } from '@/hooks/usePeriod'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { monthLongLabel } from '@/lib/period'

import { AddBudgetModal } from './components/AddBudgetModal'
import { BudgetCategoryTable } from './components/BudgetCategoryTable'
import { BudgetHeader } from './components/BudgetHeader'
import { IncomeSection } from './components/IncomeSection'
import { OutsideThePlanSection } from './components/OutsideThePlanSection'
import { PeriodModePromptCard } from './components/PeriodModePromptCard'
import { useBudgetData } from './hooks/useBudgetData'
import { useBudgetMutations } from './hooks/useBudgetMutations'

/**
 * Budget — "the plan, not the history" (MASTER.md §7). Four sections: the
 * year (hero, §1 — the only annual/YTD figures anywhere in the app), the
 * plan (category table, §2), outside the plan (unbudgeted spend, §3), and
 * expected income (§4). The month-by-month heatmap moved to /insights in
 * Phase 4 — repeating it here would be the same chart twice (MASTER.md §1).
 */
export function BudgetPage() {
  const { mode, isExplicitlySet, isLoadingPreference } = usePeriodMode()
  const { year, month, setPeriod } = usePeriod()
  const [showAddModal, setShowAddModal] = useState(false)

  const data = useBudgetData({ year, month, mode })
  const mutations = useBudgetMutations({ year, month, mode })

  // Brand-new users land here with no budget AND no period choice yet. Block
  // the budgeting UI until they pick — the choice changes what "year" the
  // budget rows are bucketed against, so it has to come first.
  if (!data.isLoading && !isLoadingPreference && !isExplicitlySet && data.entries.length === 0) {
    return (
      <div className="space-y-5">
        <header>
          <p className="eyebrow">Budget</p>
          <h2 className="sec-title mt-1">Set up your budget</h2>
        </header>
        <PeriodModePromptCard />
      </div>
    )
  }

  function navigateMonth(dir: -1 | 1) {
    const next = month + dir
    if (next < 1) {
      setPeriod(year - 1, 12)
    } else if (next > 12) {
      setPeriod(year + 1, 1)
    } else {
      setPeriod(year, next)
    }
  }

  function navigateYear(dir: -1 | 1) {
    setPeriod(year + dir, month)
  }

  return (
    <div className="space-y-8">
      <BudgetHeader
        year={year}
        mode={mode}
        isLoading={data.isLoading}
        hasEntries={data.entries.length > 0}
        totalYTDSpent={data.totalYTDSpent}
        totalAnnual={data.totalAnnual}
        paceStatus={data.paceStatus}
        monthsElapsed={data.monthsElapsed}
        yearVerdict={data.yearVerdict}
        onNavigateYear={navigateYear}
        onAddClick={() => setShowAddModal(true)}
      />

      {data.isLoading ? (
        <div className="card" style={{ padding: 24 }}>
          <SkeletonTable rows={6} />
        </div>
      ) : (
        <>
          <BudgetCategoryTable
            tableData={data.tableData}
            month={month}
            mode={mode}
            onNavigateMonth={navigateMonth}
            onSaveBudget={(row, amount) =>
              mutations.monthlyOverrideMutation.mutate({
                categoryId: row.categoryId,
                amount,
                entryId: row.id,
              })
            }
            onResetBudget={(row) => mutations.resetOverrideMutation.mutate(row.categoryId)}
            onDelete={(id) => mutations.setDeleteId(id)}
            editHint={
              data.entries.length > 0
                ? `Click any budget amount to set a custom budget for ${monthLongLabel(month, mode)}.`
                : undefined
            }
          />

          <OutsideThePlanSection
            rows={data.unbudgetedData}
            onSetBudget={(categoryId, monthlyAmount) =>
              mutations.createInlineMutation.mutate({ categoryId, monthlyAmount })
            }
            isSaving={mutations.createInlineMutation.isPending}
          />

          <IncomeSection rows={data.incomeTableData} month={month} mode={mode} />
        </>
      )}

      {showAddModal && (
        <AddBudgetModal
          categories={data.allCategories}
          existingCategoryIds={new Set(data.entries.map((e) => e.category_id))}
          year={year}
          onClose={() => setShowAddModal(false)}
          onSaved={() => setShowAddModal(false)}
        />
      )}

      <ConfirmDialog
        isOpen={mutations.deleteId !== null}
        title="Delete budget entry"
        message="Are you sure? This will remove the annual budget for this category."
        confirmLabel="Delete"
        danger
        loading={mutations.deleteMutation.isPending}
        onConfirm={() => mutations.deleteId && mutations.deleteMutation.mutate(mutations.deleteId)}
        onCancel={() => mutations.setDeleteId(null)}
      />
    </div>
  )
}
