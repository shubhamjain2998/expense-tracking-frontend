import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { CategoryDeleteDialog } from '@/features/budget/components/CategoryDeleteDialog'
import { annualToMonthly } from '@/features/budget/lib/budgetMath'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { getBudget } from '@/lib/api/budget'
import { formatCurrency } from '@/lib/format'
import { getCurrentPeriod } from '@/lib/period'
import { qk } from '@/lib/queryKeys'

import { useCategories } from '../hooks/useCategories'

/**
 * Settings → Categories. Full category CRUD (create/rename/delete/income
 * flag) lives here now — one place instead of two — while Budget §2 "The
 * plan" keeps only what belongs to the plan: the monthly-budget inline
 * edit and removing a line from the plan.
 *
 * `Budget / month` reads the current year's budget entries (same
 * `qk.budget.byYear` cache Budget uses) purely for display — no mutation
 * happens from this column.
 */
export function CategoriesSection() {
  const { mode } = usePeriodMode()
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
  const nameInputRef = useRef<HTMLInputElement>(null)

  const year = getCurrentPeriod(mode, new Date()).year
  const budgetQuery = useQuery({
    queryKey: qk.budget.byYear(year),
    queryFn: () => getBudget(year),
    retry: false,
    throwOnError: false,
  })
  const monthlyByCategory = new Map(
    (budgetQuery.data ?? []).map((e) => [
      e.category_id,
      annualToMonthly(Number(e.allocated_amount)),
    ])
  )

  const cats = query.data ?? []
  const expenseCount = cats.filter((c) => !c.is_income).length
  const incomeCount = cats.filter((c) => c.is_income).length

  function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    createMutation.mutate({ name, isIncome: newIsIncome })
  }

  const deleteTarget = cats.find((c) => c.id === deleteCategoryId)

  return (
    <section id="categories" className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Categories</h2>
        <span className="sub">
          {expenseCount} spending · {incomeCount} income
        </span>
        <span className="act">
          <button className="btn sm" onClick={() => nameInputRef.current?.focus()}>
            <Icon name="add" size={14} />
            New
          </button>
        </span>
      </div>

      <div className="card card-flush">
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th className="num">Transactions</th>
              <th className="num">Budget / month</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cats.map((cat) => {
              const isRenaming = renamingCategoryId === cat.id
              const monthly = monthlyByCategory.get(cat.id)
              return (
                <tr key={cat.id} className="group">
                  <td className="strong">
                    {isRenaming ? (
                      <input
                        value={renamingCategoryName}
                        onChange={(e) => setRenamingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')
                            renameMutation.mutate({ id: cat.id, name: renamingCategoryName })
                          if (e.key === 'Escape') setRenamingCategoryId(null)
                        }}
                        className="input"
                        style={{ fontSize: 13, height: 28 }}
                        maxLength={64}
                        autoFocus
                        aria-label="Rename category"
                      />
                    ) : (
                      cat.name
                    )}
                  </td>
                  <td>
                    <span className={cat.is_income ? 'tag accent' : 'tag'}>
                      {cat.is_income ? 'Income' : 'Spending'}
                    </span>
                  </td>
                  <td className="num">{cat.txn_count ?? 0}</td>
                  <td className="num">{monthly ? formatCurrency(monthly) : '—'}</td>
                  <td>
                    {isRenaming ? (
                      <span className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() =>
                            renameMutation.mutate({ id: cat.id, name: renamingCategoryName })
                          }
                          disabled={renameMutation.isPending}
                          className="btn ghost icon sm"
                          aria-label="Confirm rename"
                        >
                          <Icon name="check" size={13} />
                        </button>
                        <button
                          onClick={() => setRenamingCategoryId(null)}
                          className="btn ghost icon sm"
                          aria-label="Cancel rename"
                        >
                          <Icon name="close" size={13} />
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() =>
                            incomeFlagMutation.mutate({ id: cat.id, is_income: !cat.is_income })
                          }
                          disabled={incomeFlagMutation.isPending}
                          className="btn ghost icon sm"
                          title={cat.is_income ? 'Move to spending' : 'Move to income'}
                          aria-label={`Move ${cat.name} to ${cat.is_income ? 'spending' : 'income'}`}
                        >
                          <Icon name={cat.is_income ? 'trending_down' : 'trending_up'} size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteCategoryId(cat.id)}
                          className="btn ghost icon sm"
                          title="Delete category"
                          aria-label={`Delete ${cat.name}`}
                        >
                          <Icon name="delete" size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setRenamingCategoryId(cat.id)
                            setRenamingCategoryName(cat.name)
                          }}
                          className="btn ghost sm"
                          aria-label={`Edit ${cat.name}`}
                        >
                          Edit
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

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
              Spending
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
            ref={nameInputRef}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCategory()
            }}
            placeholder={`New ${newIsIncome ? 'income' : 'spending'} category name`}
            className="input"
            style={{ flex: 1, fontSize: 13 }}
            maxLength={64}
            aria-label="New category name"
          />
          <button
            className="btn primary sm"
            onClick={handleAddCategory}
            disabled={createMutation.isPending}
          >
            Add
          </button>
        </div>

        <div className="alert">
          <Icon className="ico" name="warning" size={18} />
          <span className="body flex flex-col">
            <span className="strong">Deleting a category never deletes transactions</span>
            <span className="small">
              Its transactions move to Uncategorised and any merchant rules pointing at it are
              removed.
            </span>
          </span>
        </div>
      </div>

      <CategoryDeleteDialog
        isOpen={deleteCategoryId !== null}
        categoryId={deleteCategoryId}
        categoryName={deleteTarget?.name ?? ''}
        txnCount={deleteTarget?.txn_count ?? 0}
        categories={cats}
        loading={deleteMutation.isPending}
        onConfirm={(action, targetCategoryId) =>
          deleteCategoryId &&
          deleteMutation.mutate({ id: deleteCategoryId, action, targetCategoryId })
        }
        onCancel={() => setDeleteCategoryId(null)}
      />
    </section>
  )
}
