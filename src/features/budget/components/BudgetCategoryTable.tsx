import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useCategories } from '@/features/settings/hooks/useCategories'
import { formatCurrency } from '@/lib/format'
import { monthLongLabel } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'

import type { CategoryTableRow } from '../types'

import { BudgetCategoryRow } from './BudgetCategoryRow'

type PeriodView = 'monthly' | 'annual'

/**
 * Budget §2 "The plan". Category name / plan / spent / left / against-pace
 * only — no YTD or annual-budget columns here, those figures live exactly
 * once, in the §1 hero (MASTER.md §1). The Monthly/Annual toggle switches
 * every money column between the monthly and annual reading of the same
 * row data; nothing is refetched.
 */
export function BudgetCategoryTable({
  tableData,
  month,
  mode,
  onNavigateMonth,
  onSaveBudget,
  onResetBudget,
  onDelete,
  editHint,
}: {
  tableData: CategoryTableRow[]
  month: number
  mode: PeriodMode
  onNavigateMonth: (dir: -1 | 1) => void
  onSaveBudget: (row: CategoryTableRow, amount: number) => void
  onResetBudget: (row: CategoryTableRow) => void
  onDelete: (id: string) => void
  editHint?: string
}) {
  const { query, newCategoryName, setNewCategoryName, createMutation } = useCategories()

  const [newIsIncome, setNewIsIncome] = useState(false)
  const [periodView, setPeriodView] = useState<PeriodView>('monthly')

  const incomeCatIds = new Set((query.data ?? []).filter((c) => c.is_income).map((c) => c.id))
  const rows = tableData.filter((row) => !incomeCatIds.has(row.categoryId))

  const totals = useMemo(() => {
    const plan = rows.reduce(
      (s, r) => s + (periodView === 'monthly' ? r.monthlyBudget : r.annualBudget),
      0
    )
    const spent = rows.reduce(
      (s, r) => s + (periodView === 'monthly' ? r.thisMonthSpent : r.ytdSpent),
      0
    )
    return { plan, spent, left: plan - spent }
  }, [rows, periodView])

  function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    createMutation.mutate({ name, isIncome: newIsIncome })
  }

  const spentLabel = periodView === 'monthly' ? `${monthLongLabel(month, mode)} spent` : 'YTD spent'

  return (
    <div className="sec">
      <div className="sec-head">
        <h2 className="sec-title">The plan</h2>
        <span className="sub">
          {periodView === 'monthly' ? 'Monthly' : 'Annual'} amounts · edit any figure in place
        </span>
        <span className="act">
          <span className="ym-nav" aria-label="Month">
            <button
              onClick={() => onNavigateMonth(-1)}
              className="btn ghost ym-nav-btn"
              aria-label="Previous month"
            >
              <Icon name="chevron_left" size={13} />
            </button>
            <span className="ym-nav-label small num">{monthLongLabel(month, mode)}</span>
            <button
              onClick={() => onNavigateMonth(1)}
              className="btn ghost ym-nav-btn"
              aria-label="Next month"
            >
              <Icon name="chevron_right" size={13} />
            </button>
          </span>
          <span className="seg">
            <button
              aria-pressed={periodView === 'monthly'}
              className={periodView === 'monthly' ? 'on' : ''}
              onClick={() => setPeriodView('monthly')}
            >
              Monthly
            </button>
            <button
              aria-pressed={periodView === 'annual'}
              className={periodView === 'annual' ? 'on' : ''}
              onClick={() => setPeriodView('annual')}
            >
              Annual
            </button>
          </span>
        </span>
      </div>

      <div className="card card-flush">
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Plan / {periodView === 'monthly' ? 'month' : 'year'}</th>
                <th className="num">{spentLabel}</th>
                <th className="num">Left</th>
                <th>Against pace</th>
                <th style={{ width: 40 }} />
              </tr>
              {editHint && rows.length > 0 && (
                <tr>
                  <td colSpan={6} style={{ paddingBottom: 10, paddingTop: 8, border: 0 }}>
                    <p className="small flex items-center gap-1.5">
                      <Icon name="edit" size={11} />
                      {editHint}
                    </p>
                  </td>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="small" style={{ padding: '20px 10px' }}>
                    No categories in the plan yet — set a budget below or from a category with spend
                    in &ldquo;Outside the plan&rdquo;.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <BudgetCategoryRow
                    key={row.id}
                    row={row}
                    periodView={periodView}
                    onSaveBudget={(amount) => onSaveBudget(row, amount)}
                    onResetBudget={() => onResetBudget(row)}
                    onDelete={() => onDelete(row.id)}
                  />
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td className="strong">Total planned</td>
                  <td className="num strong">{formatCurrency(totals.plan)}</td>
                  <td className="num strong">{formatCurrency(totals.spent)}</td>
                  <td
                    className="num strong"
                    style={{ color: totals.left < 0 ? 'var(--neg)' : undefined }}
                  >
                    {formatCurrency(totals.left)}
                  </td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Add category — kept exactly as it worked before this restyle. */}
        <div
          style={{
            padding: '10px 16px 14px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <div className="seg" style={{ flexShrink: 0 }}>
            <button
              className={!newIsIncome ? 'on' : ''}
              onClick={() => setNewIsIncome(false)}
              style={{ fontSize: 11.5, padding: '3px 10px' }}
            >
              Expense
            </button>
            <button
              className={newIsIncome ? 'on' : ''}
              onClick={() => setNewIsIncome(true)}
              style={{ fontSize: 11.5, padding: '3px 10px' }}
            >
              Income
            </button>
          </div>
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCategory()
            }}
            placeholder={`New ${newIsIncome ? 'income' : 'expense'} category name`}
            className="input"
            style={{ flex: 1, fontSize: 13 }}
            maxLength={64}
            aria-label="New category name"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddCategory}
            loading={createMutation.isPending}
          >
            Category
          </Button>
        </div>
      </div>
    </div>
  )
}
