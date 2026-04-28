import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { getCurrentPeriod, loadPeriodMode, monthLongLabel } from '@/lib/period'

import { AddBudgetModal } from './components/AddBudgetModal'
import { BudgetCategoryTable } from './components/BudgetCategoryTable'
import { BudgetHeader } from './components/BudgetHeader'
import { HeatmapCard } from './components/HeatmapCard'
import { useBudgetData } from './hooks/useBudgetData'
import { useBudgetMutations } from './hooks/useBudgetMutations'

function EmptyBudgetState({ year, onAdd }: { year: number; onAdd: () => void }) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 40, color: 'var(--ink-4)', marginBottom: 16 }}
      >
        account_balance_wallet
      </span>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
        No budget set for {year}
      </p>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20, maxWidth: 300 }}>
        Define monthly allocations per category to track your spend against targets.
      </p>
      <Button variant="primary" size="sm" onClick={onAdd}>
        + Add first budget entry
      </Button>
    </div>
  )
}

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
      ) : data.entries.length === 0 ? (
        <EmptyBudgetState year={year} onAdd={() => setShowAddModal(true)} />
      ) : (
        <>
          {data.heatmapData.length > 0 && (
            <HeatmapCard
              data={data.heatmapData}
              selectedMonth={month}
              onMonthClick={setMonth}
            />
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

          <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>
            Click any{' '}
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 11, verticalAlign: 'middle' }}
            >
              edit
            </span>{' '}
            budget amount to set a custom budget for {monthLongLabel(month, mode)}.
          </p>
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
        onConfirm={() =>
          mutations.deleteId && mutations.deleteMutation.mutate(mutations.deleteId)
        }
        onCancel={() => mutations.setDeleteId(null)}
      />
    </div>
  )
}
