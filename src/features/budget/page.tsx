import { useState } from 'react'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { getCurrentPeriod, loadPeriodMode, monthLongLabel } from '@/lib/period'

import { AddBudgetModal } from './components/AddBudgetModal'
import { BudgetCategoryTable } from './components/BudgetCategoryTable'
import { BudgetHeader } from './components/BudgetHeader'
import { HeatmapCard } from './components/HeatmapCard'
import { useBudgetData } from './hooks/useBudgetData'
import { useBudgetMutations } from './hooks/useBudgetMutations'

export function BudgetPage() {
  const now = new Date()
  const { mode } = usePeriodMode()
  const initial = getCurrentPeriod(loadPeriodMode(), now)
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [showAddModal, setShowAddModal] = useState(false)

  const data = useBudgetData({ year, month, mode })
  const mutations = useBudgetMutations({ year, month, mode })

  function navigateMonth(dir: -1 | 1) {
    const next = month + dir
    if (next < 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else if (next > 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth(next)
    }
  }

  return (
    <div className="space-y-5">
      <BudgetHeader
        year={year}
        month={month}
        mode={mode}
        isLoading={data.isLoading}
        hasEntries={data.entries.length > 0}
        totalYTDSpent={data.totalYTDSpent}
        totalAnnual={data.totalAnnual}
        paceStatus={data.paceStatus}
        onNavigateMonth={navigateMonth}
        onAddClick={() => setShowAddModal(true)}
      />

      {data.isLoading ? (
        <div className="card" style={{ padding: 24 }}>
          <SkeletonTable rows={6} />
        </div>
      ) : (
        <>
          {data.heatmapData.length > 0 && (
            <HeatmapCard data={data.heatmapData} selectedMonth={month} onMonthClick={setMonth} />
          )}

          <BudgetCategoryTable
            tableData={data.tableData}
            unbudgetedData={data.unbudgetedData}
            totalMonthlyBudget={data.totalMonthlyBudget}
            totalThisMonth={data.totalThisMonth}
            totalYTDSpent={data.totalYTDSpent}
            totalAnnual={data.totalAnnual}
            totalPct={data.totalPct}
            onSaveBudget={(row, amount) =>
              mutations.monthlyOverrideMutation.mutate({
                categoryId: row.categoryId,
                amount,
                entryId: row.id,
              })
            }
            onResetBudget={(row) => mutations.resetOverrideMutation.mutate(row.categoryId)}
            onDelete={(id) => mutations.setDeleteId(id)}
            onSetBudget={(categoryId, monthlyAmount) =>
              mutations.createInlineMutation.mutate({ categoryId, monthlyAmount })
            }
            isSavingInline={mutations.createInlineMutation.isPending}
          />

          {data.entries.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>
              Click any <Icon name="edit" size={11} /> budget amount to set a custom budget for{' '}
              {monthLongLabel(month, mode)}.
            </p>
          )}
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
