import { useState, type CSSProperties } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useCategories } from '@/features/settings/hooks/useCategories'
import { formatCurrency } from '@/lib/format'

import type { CategoryTableRow, UnbudgetedCategoryRow } from '../types'

import { BudgetCategoryRow } from './BudgetCategoryRow'
import { CategoryDeleteDialog } from './CategoryDeleteDialog'
import { IncomeCategoryRow } from './IncomeCategoryRow'
import { ProgressBar } from './ProgressBar'
import { UnbudgetedCategoryRow as UnbudgetedCategoryRowComponent } from './UnbudgetedCategoryRow'

export function BudgetCategoryTable({
  tableData,
  unbudgetedData,
  totalMonthlyBudget,
  totalThisMonth,
  totalYTDSpent,
  totalAnnual,
  totalPct,
  onSaveBudget,
  onResetBudget,
  onDelete,
  onSetBudget,
  isSavingInline,
  editHint,
}: {
  tableData: CategoryTableRow[]
  unbudgetedData: UnbudgetedCategoryRow[]
  totalMonthlyBudget: number
  totalThisMonth: number
  totalYTDSpent: number
  totalAnnual: number
  totalPct: number | null
  onSaveBudget: (row: CategoryTableRow, amount: number) => void
  onResetBudget: (row: CategoryTableRow) => void
  onDelete: (id: string) => void
  onSetBudget: (categoryId: string, monthlyAmount: number) => void
  isSavingInline: boolean
  editHint?: string
}) {
  const {
    query,
    newCategoryName,
    setNewCategoryName,
    renamingCategoryId,
    setRenamingCategoryId,
    renamingCategoryName,
    setRenamingCategoryName,
    deleteCategoryId,
    setDeleteCategoryId,
    createMutation,
    renameMutation,
    deleteMutation,
    incomeFlagMutation,
  } = useCategories()

  const [newIsIncome, setNewIsIncome] = useState(false)

  type SortKey = 'categoryName' | 'monthlyBudget' | 'thisMonthSpent' | 'ytdSpent' | 'annualBudget'
  const [sortKey, setSortKey] = useState<SortKey>('monthlyBudget')
  const [sortAsc, setSortAsc] = useState(false)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const [incomeExpanded, setIncomeExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('budget_income_expanded') === 'true'
    } catch {
      return false
    }
  })

  function toggleIncome() {
    setIncomeExpanded((v) => {
      const next = !v
      try {
        localStorage.setItem('budget_income_expanded', String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const allCats = query.data ?? []
  const incomeCats = allCats.filter((c) => c.is_income)
  // Exclude any income-flagged categories from the expense budget section
  const incomeCatIds = new Set(incomeCats.map((c) => c.id))
  const expenseTableData = [...tableData.filter((row) => !incomeCatIds.has(row.categoryId))].sort(
    (a, b) => {
      let av: number | string = a.monthlyBudget
      let bv: number | string = b.monthlyBudget
      switch (sortKey) {
        case 'categoryName':
          av = a.categoryName
          bv = b.categoryName
          break
        case 'monthlyBudget':
          av = a.monthlyBudget
          bv = b.monthlyBudget
          break
        case 'thisMonthSpent':
          av = a.thisMonthSpent
          bv = b.thisMonthSpent
          break
        case 'ytdSpent':
          av = a.ytdSpent
          bv = b.ytdSpent
          break
        case 'annualBudget':
          av = a.annualBudget
          bv = b.annualBudget
          break
      }
      if (typeof av === 'string')
        return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    }
  )

  const sortedUnbudgeted = [...unbudgetedData].sort((a, b) => {
    if (sortKey === 'categoryName')
      return sortAsc
        ? a.categoryName.localeCompare(b.categoryName)
        : b.categoryName.localeCompare(a.categoryName)
    if (sortKey === 'thisMonthSpent')
      return sortAsc ? a.thisMonthSpent - b.thisMonthSpent : b.thisMonthSpent - a.thisMonthSpent
    if (sortKey === 'ytdSpent') return sortAsc ? a.ytdSpent - b.ytdSpent : b.ytdSpent - a.ytdSpent
    return 0
  })

  const mgmtProps = {
    renamingCategoryId,
    renamingCategoryName,
    setRenamingCategoryName,
    setRenamingCategoryId,
    renameMutation,
    incomeFlagMutation,
  }

  function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    createMutation.mutate({ name, isIncome: newIsIncome })
  }

  const deleteTarget = query.data?.find((c) => c.id === deleteCategoryId)
  const deleteCount = deleteTarget?.txn_count ?? 0

  return (
    <div className="card card-flush">
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              {(
                [
                  { key: 'categoryName', label: 'Category', cls: '', style: { width: '26%' } },
                  {
                    key: 'monthlyBudget',
                    label: 'Monthly Budget',
                    cls: 'num',
                    style: { whiteSpace: 'nowrap' as const },
                  },
                  {
                    key: 'thisMonthSpent',
                    label: 'This Month',
                    cls: 'num',
                    style: { whiteSpace: 'nowrap' as const },
                  },
                  {
                    key: null,
                    label: 'This Month Progress',
                    cls: '',
                    style: { width: '22%', whiteSpace: 'nowrap' as const },
                  },
                  {
                    key: 'ytdSpent',
                    label: 'YTD Spent',
                    cls: 'num',
                    style: { whiteSpace: 'nowrap' as const },
                  },
                  {
                    key: 'annualBudget',
                    label: 'Annual Budget',
                    cls: 'num',
                    style: { whiteSpace: 'nowrap' as const },
                  },
                ] as Array<{
                  key: SortKey | null
                  label: string
                  cls: string
                  style: CSSProperties
                }>
              ).map(({ key, label, cls, style }) => (
                <th
                  key={label}
                  className={cls}
                  style={{
                    ...style,
                    cursor: key ? 'pointer' : 'default',
                    userSelect: 'none',
                    color: key && sortKey === key ? 'var(--ink-2)' : undefined,
                    transition: 'color .12s',
                  }}
                  onClick={key ? () => handleSort(key) : undefined}
                >
                  {label}
                  {key && (
                    <span
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        marginLeft: 4,
                        verticalAlign: 'middle',
                        gap: 1,
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          width: 0,
                          height: 0,
                          borderLeft: '3.5px solid transparent',
                          borderRight: '3.5px solid transparent',
                          borderBottom: '4px solid currentColor',
                          opacity: sortKey === key && sortAsc ? 1 : 0.2,
                        }}
                      />
                      <span
                        style={{
                          display: 'block',
                          width: 0,
                          height: 0,
                          borderLeft: '3.5px solid transparent',
                          borderRight: '3.5px solid transparent',
                          borderTop: '4px solid currentColor',
                          opacity: sortKey === key && !sortAsc ? 1 : 0.2,
                        }}
                      />
                    </span>
                  )}
                </th>
              ))}
              <th style={{ width: 96 }} />
            </tr>
            {editHint && (
              <tr style={{ background: 'transparent' }}>
                <td colSpan={7} style={{ paddingBottom: 12, paddingTop: 10 }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon name="edit" size={11} />
                    {editHint}
                  </p>
                </td>
              </tr>
            )}
          </thead>
          <tbody>
            {expenseTableData.map((row, i) => (
              <BudgetCategoryRow
                key={row.id}
                row={row}
                rank={sortKey !== 'categoryName' ? i + 1 : null}
                onSaveBudget={(amount) => onSaveBudget(row, amount)}
                onResetBudget={() => onResetBudget(row)}
                onDelete={() => onDelete(row.id)}
                {...mgmtProps}
              />
            ))}

            {/* Unbudgeted expense categories */}
            {unbudgetedData.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} style={{ paddingTop: 20, paddingBottom: 6 }}>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ink-4)',
                        }}
                      >
                        No budget set
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 18,
                          height: 18,
                          padding: '0 5px',
                          background: 'var(--surface-3)',
                          borderRadius: 9,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--ink-4)',
                        }}
                      >
                        {unbudgetedData.length}
                      </span>
                    </div>
                  </td>
                </tr>
                {sortedUnbudgeted.map((row) => (
                  <UnbudgetedCategoryRowComponent
                    key={row.categoryId}
                    row={row}
                    onSetBudget={onSetBudget}
                    isSaving={isSavingInline}
                    onDeleteCategory={() => setDeleteCategoryId(row.categoryId)}
                    {...mgmtProps}
                  />
                ))}
              </>
            )}

            {/* Income categories — shown only when expanded */}
            {incomeCats.length > 0 && incomeExpanded && (
              <>
                <tr>
                  <td colSpan={7} style={{ paddingTop: 20, paddingBottom: 6 }}>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--pos)',
                        }}
                      >
                        Income
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 18,
                          height: 18,
                          padding: '0 5px',
                          background: 'color-mix(in oklch, var(--pos) 10%, var(--surface-2))',
                          borderRadius: 9,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--pos)',
                        }}
                      >
                        {incomeCats.length}
                      </span>
                    </div>
                  </td>
                </tr>
                {incomeCats.map((cat) => (
                  <IncomeCategoryRow
                    key={cat.id}
                    cat={cat}
                    onDeleteCategory={() => setDeleteCategoryId(cat.id)}
                    {...mgmtProps}
                  />
                ))}
              </>
            )}
          </tbody>
          <tfoot style={expenseTableData.length === 0 ? { display: 'none' } : undefined}>
            <tr>
              <td
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  color: 'var(--ink-3)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Total
              </td>
              <td
                className="num"
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {formatCurrency(totalMonthlyBudget)}
              </td>
              <td
                className="num"
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {formatCurrency(totalThisMonth)}
              </td>
              <td style={{ borderTop: '2px solid var(--line)', padding: '14px 12px 0' }}>
                {totalPct !== null && <ProgressBar pct={totalPct} />}
              </td>
              <td
                className="num"
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  fontWeight: 600,
                  color: totalYTDSpent > totalAnnual ? 'var(--neg)' : 'var(--ink)',
                }}
              >
                {formatCurrency(totalYTDSpent)}
              </td>
              <td
                className="num"
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  fontWeight: 600,
                  color: 'var(--ink-3)',
                }}
              >
                {formatCurrency(totalAnnual)}
              </td>
              <td style={{ borderTop: '2px solid var(--line)' }} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Income toggle strip */}
      {incomeCats.length > 0 && (
        <button
          onClick={toggleIncome}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid var(--line)',
            cursor: 'pointer',
            padding: '10px 16px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--pos)',
            opacity: 0.7,
            transition: 'opacity .15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          <Icon name={incomeExpanded ? 'expand_less' : 'expand_more'} size={14} />
          Income
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 18,
              height: 17,
              padding: '0 5px',
              background: 'color-mix(in oklch, var(--pos) 10%, var(--surface-2))',
              borderRadius: 9,
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--pos)',
            }}
          >
            {incomeCats.length}
          </span>
          <span
            style={{
              fontSize: 10,
              opacity: 0.5,
              fontWeight: 400,
              textTransform: 'none',
              letterSpacing: 0,
              marginLeft: 2,
            }}
          >
            {incomeExpanded ? '— click to collapse' : '— click to expand'}
          </span>
        </button>
      )}

      {/* Add category row */}
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
          Add
        </Button>
      </div>

      <CategoryDeleteDialog
        isOpen={deleteCategoryId !== null}
        categoryId={deleteCategoryId}
        categoryName={deleteTarget?.name ?? ''}
        txnCount={deleteCount}
        categories={allCats}
        loading={deleteMutation.isPending}
        onConfirm={(action, targetCategoryId) =>
          deleteCategoryId &&
          deleteMutation.mutate({ id: deleteCategoryId, action, targetCategoryId })
        }
        onCancel={() => setDeleteCategoryId(null)}
      />
    </div>
  )
}
