import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonTable } from '@/components/ui/Skeleton'
import type { Category } from '@/types/settings'

import { useCategories } from '../hooks/useCategories'

export function CategoriesSection() {
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

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <p className="card-title">Categories</p>
            <p className="card-sub">
              Manage the categories used to classify transactions and budgets.
            </p>
          </div>
        </div>

        {query.isLoading ? (
          <SkeletonTable />
        ) : !query.data?.length ? (
          <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
            No categories yet.
          </p>
        ) : (
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            {query.data.map((cat: Category, i) => (
              <div
                key={cat.id}
                className="group flex items-center gap-2"
                style={{
                  padding: '8px 12px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                }}
              >
                {renamingCategoryId === cat.id ? (
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
                      autoFocus
                      aria-label="Rename category"
                    />
                    <button
                      onClick={() =>
                        renameMutation.mutate({ id: cat.id, name: renamingCategoryName })
                      }
                      disabled={renameMutation.isPending}
                      className="btn ghost icon sm"
                      aria-label="Confirm rename"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        check
                      </span>
                    </button>
                    <button
                      onClick={() => setRenamingCategoryId(null)}
                      className="btn ghost icon sm"
                      aria-label="Cancel rename"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        close
                      </span>
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className="flex-1 text-[13px] font-medium"
                      style={{ color: 'var(--ink)' }}
                    >
                      {cat.name}
                    </span>
                    {cat.is_income && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--pos)',
                          background: 'var(--pos-soft)',
                          borderRadius: 4,
                          padding: '2px 6px',
                          marginRight: 4,
                        }}
                      >
                        income
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() =>
                          incomeFlagMutation.mutate({ id: cat.id, is_income: !cat.is_income })
                        }
                        disabled={incomeFlagMutation.isPending}
                        className="btn ghost icon sm"
                        aria-label={
                          cat.is_income
                            ? `Mark ${cat.name} as expense`
                            : `Mark ${cat.name} as income`
                        }
                        title={
                          cat.is_income ? 'Mark as expense category' : 'Mark as income category'
                        }
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: 14,
                            color: cat.is_income ? 'var(--pos)' : undefined,
                          }}
                        >
                          {cat.is_income ? 'trending_up' : 'trending_down'}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setRenamingCategoryId(cat.id)
                          setRenamingCategoryName(cat.name)
                        }}
                        className="btn ghost icon sm"
                        aria-label={`Rename ${cat.name}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          edit
                        </span>
                      </button>
                      <button
                        onClick={() => setDeleteCategoryId(cat.id)}
                        className="btn ghost icon sm"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          delete
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className="mt-4 flex items-end gap-2"
          style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}
        >
          <div className="flex-1">
            <label className="eyebrow mb-1 block">Create category</label>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCategoryName.trim())
                  createMutation.mutate(newCategoryName.trim())
              }}
              placeholder="Category name"
              className="input"
              aria-label="New category name"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => newCategoryName.trim() && createMutation.mutate(newCategoryName.trim())}
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={deleteCategoryId !== null}
        title="Delete category"
        message="This category will be removed from any budget entries and transactions. Continue?"
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteCategoryId && deleteMutation.mutate(deleteCategoryId)}
        onCancel={() => setDeleteCategoryId(null)}
      />
    </>
  )
}
