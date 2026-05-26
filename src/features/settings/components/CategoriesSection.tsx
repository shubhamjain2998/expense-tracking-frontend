import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useToastContext } from '@/hooks/useToastContext'
import { createCategory } from '@/lib/api/categories'
import { invalidateDomains } from '@/lib/queryKeys'
import type { Category } from '@/types/settings'

import { useCategories } from '../hooks/useCategories'

// Common Indian household categories. One-click seed for new users; everything
// here is renameable / deletable from the same UI afterwards.
const SUGGESTED_DEFAULTS = [
  'Groceries',
  'Rent',
  'Eating Out',
  'Transport',
  'Entertainment',
  'Bills',
  'Travel',
  'Health',
]

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

  const qc = useQueryClient()
  const toast = useToastContext()
  // Sequential creates: backend rejects duplicates with 409, but creating
  // serially keeps error messages tied to the specific category that failed.
  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      for (const name of SUGGESTED_DEFAULTS) {
        await createCategory(name)
      }
    },
    onSuccess: () => {
      invalidateDomains(qc, ['categories'])
      toast.success(`Added ${SUGGESTED_DEFAULTS.length} suggested categories`)
    },
    onError: (err: { detail?: string }) => {
      // Even on partial failure the categories endpoint will have created some
      // rows — refetch so the user sees the actual state.
      invalidateDomains(qc, ['categories'])
      toast.error(err.detail ?? 'Could not add all suggested categories')
    },
  })

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
          <div
            className="flex flex-col items-center justify-center gap-3 py-8 text-center"
            style={{
              border: '1px dashed var(--line)',
              borderRadius: 'var(--radius)',
            }}
          >
            <Icon name="category" size={22} style={{ color: 'var(--ink-4)' }} />
            <div>
              <p
                className="text-[13px] font-semibold"
                style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
              >
                No categories yet
              </p>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--ink-3)', maxWidth: 320 }}>
                Categories are the buckets you budget against. Start with a common set — you can
                rename or remove any of them after.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => seedDefaultsMutation.mutate()}
              loading={seedDefaultsMutation.isPending}
            >
              Add {SUGGESTED_DEFAULTS.length} suggested categories
            </Button>
            <p className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
              {SUGGESTED_DEFAULTS.join(' · ')}
            </p>
          </div>
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
                      maxLength={64}
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
                        <Icon
                          name={cat.is_income ? 'trending_up' : 'trending_down'}
                          size={14}
                          style={cat.is_income ? { color: 'var(--pos)' } : undefined}
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
              maxLength={64}
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
