import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useCategories } from '@/features/settings/hooks/useCategories'
import type { Category } from '@/types/settings'

import { CategoryDeleteDialog } from './CategoryDeleteDialog'

type Tab = 'expense' | 'income'

export function BudgetCategoriesPanel() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('expense')

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

  const allCats: Category[] = query.data ?? []
  const expenseCats = allCats.filter((c) => !c.is_income)
  const incomeCats = allCats.filter((c) => c.is_income)
  const displayed = activeTab === 'expense' ? expenseCats : incomeCats

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
        style={{
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="category" size={16} style={{ color: 'var(--ink-3)' }} />
          </div>
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
              }}
            >
              Manage categories
            </p>
            {!open && (
              <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 1 }}>
                {expenseCats.length} expense · {incomeCats.length} income
              </p>
            )}
          </div>
        </div>
        <Icon
          name={open ? 'expand_less' : 'expand_more'}
          size={18}
          style={{ color: 'var(--ink-4)', flexShrink: 0 }}
        />
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {/* Tab bar */}
          <div style={{ padding: '12px 18px 0' }}>
            <div className="seg tabs">
              <button
                className={activeTab === 'expense' ? 'on' : ''}
                onClick={() => setActiveTab('expense')}
              >
                Expense
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: activeTab === 'expense' ? 'var(--surface-3)' : 'var(--surface-2)',
                    color: 'var(--ink-3)',
                  }}
                >
                  {expenseCats.length}
                </span>
              </button>
              <button
                className={activeTab === 'income' ? 'on' : ''}
                onClick={() => setActiveTab('income')}
              >
                Income
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: activeTab === 'income' ? 'var(--surface-3)' : 'var(--surface-2)',
                    color: 'var(--ink-3)',
                  }}
                >
                  {incomeCats.length}
                </span>
              </button>
            </div>
          </div>

          {/* Category list */}
          <div style={{ padding: '10px 18px 4px' }}>
            {query.isLoading ? (
              <SkeletonTable rows={4} />
            ) : displayed.length === 0 ? (
              <div
                style={{
                  padding: '20px 16px',
                  textAlign: 'center',
                  border: '1px dashed var(--line)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--ink-4)',
                  fontSize: 13,
                }}
              >
                No {activeTab} categories yet. Create one below or toggle an existing category.
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                }}
              >
                {displayed.map((cat, i) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    i={i}
                    renamingCategoryId={renamingCategoryId}
                    renamingCategoryName={renamingCategoryName}
                    setRenamingCategoryName={setRenamingCategoryName}
                    setRenamingCategoryId={setRenamingCategoryId}
                    setDeleteCategoryId={setDeleteCategoryId}
                    renameMutation={renameMutation}
                    incomeFlagMutation={incomeFlagMutation}
                    activeTab={activeTab}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add category row */}
          <div
            style={{
              padding: '10px 18px 14px',
              borderTop: displayed.length > 0 ? '1px solid var(--line)' : undefined,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCategoryName.trim())
                  createMutation.mutate({
                    name: newCategoryName.trim(),
                    isIncome: activeTab === 'income',
                  })
              }}
              placeholder={`New ${activeTab} category name`}
              className="input"
              style={{ flex: 1, fontSize: 13 }}
              maxLength={64}
              aria-label="New category name"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                newCategoryName.trim() &&
                createMutation.mutate({
                  name: newCategoryName.trim(),
                  isIncome: activeTab === 'income',
                })
              }
              loading={createMutation.isPending}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      <CategoryDeleteDialog
        isOpen={deleteCategoryId !== null}
        categoryId={deleteCategoryId}
        categoryName={allCats.find((c) => c.id === deleteCategoryId)?.name ?? ''}
        txnCount={allCats.find((c) => c.id === deleteCategoryId)?.txn_count ?? 0}
        categories={allCats}
        onConfirm={(action, targetCategoryId) =>
          deleteCategoryId &&
          deleteMutation.mutate({ id: deleteCategoryId, action, targetCategoryId })
        }
        onCancel={() => setDeleteCategoryId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function CategoryRow({
  cat,
  i,
  renamingCategoryId,
  renamingCategoryName,
  setRenamingCategoryName,
  setRenamingCategoryId,
  setDeleteCategoryId,
  renameMutation,
  incomeFlagMutation,
  activeTab,
}: {
  cat: Category
  i: number
  renamingCategoryId: string | null
  renamingCategoryName: string
  setRenamingCategoryName: (v: string) => void
  setRenamingCategoryId: (id: string | null) => void
  setDeleteCategoryId: (id: string | null) => void
  renameMutation: { mutate: (args: { id: string; name: string }) => void; isPending: boolean }
  incomeFlagMutation: {
    mutate: (args: { id: string; is_income: boolean }) => void
    isPending: boolean
  }
  activeTab: Tab
}) {
  const isRenaming = renamingCategoryId === cat.id

  return (
    <div
      className="group flex items-center gap-2"
      style={{
        padding: '7px 10px',
        borderTop: i === 0 ? 'none' : '1px solid var(--line)',
        minHeight: 36,
      }}
    >
      {isRenaming ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            value={renamingCategoryName}
            onChange={(e) => setRenamingCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                renameMutation.mutate({ id: cat.id, name: renamingCategoryName })
              if (e.key === 'Escape') setRenamingCategoryId(null)
            }}
            className="input flex-1"
            style={{ fontSize: 13 }}
            maxLength={64}
            autoFocus
            aria-label="Rename category"
          />
          <button
            onClick={() => renameMutation.mutate({ id: cat.id, name: renamingCategoryName })}
            disabled={renameMutation.isPending}
            className="btn ghost icon sm"
            aria-label="Confirm rename"
          >
            <Icon name="check" size={14} />
          </button>
          <button
            onClick={() => setRenamingCategoryId(null)}
            className="btn ghost icon sm"
            aria-label="Cancel rename"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : (
        <>
          <span
            className="min-w-0 flex-1 truncate"
            style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}
            title={cat.name}
          >
            {cat.name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0, marginRight: 2 }}>
            {(cat.txn_count ?? 0) === 0 ? 'unused' : `${cat.txn_count} txns`}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => incomeFlagMutation.mutate({ id: cat.id, is_income: !cat.is_income })}
              disabled={incomeFlagMutation.isPending}
              className="btn ghost icon sm"
              title={cat.is_income ? 'Move to expense' : 'Move to income'}
              aria-label={
                cat.is_income ? `Move ${cat.name} to expense` : `Move ${cat.name} to income`
              }
            >
              <Icon
                name={activeTab === 'income' ? 'trending_down' : 'trending_up'}
                size={14}
                style={{ color: activeTab === 'income' ? 'var(--ink-3)' : 'var(--pos)' }}
              />
            </button>
            <button
              onClick={() => {
                setRenamingCategoryId(cat.id)
                setRenamingCategoryName(cat.name)
              }}
              className="btn ghost icon sm"
              aria-label={`Rename ${cat.name}`}
            >
              <Icon name="edit" size={14} />
            </button>
            <button
              onClick={() => setDeleteCategoryId(cat.id)}
              className="btn ghost icon sm"
              aria-label={`Delete ${cat.name}`}
            >
              <Icon name="delete" size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
