import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { Category } from '@/types/settings'

interface Props {
  isOpen: boolean
  categoryId: string | null
  categoryName: string
  txnCount: number
  categories: Category[]
  onConfirm: (action: 'pending' | 'move', targetCategoryId?: string) => void
  onCancel: () => void
  loading: boolean
}

export function CategoryDeleteDialog({
  isOpen,
  categoryId,
  categoryName,
  txnCount,
  categories,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  const [action, setAction] = useState<'pending' | 'move' | null>(null)
  const [targetCategoryId, setTargetCategoryId] = useState('')

  if (!isOpen || !categoryId) return null

  // Determine if the category being deleted is income, so we can filter picker options
  const deletingCat = categories.find((c) => c.id === categoryId)
  const isIncome = !!deletingCat?.is_income
  const otherCategories = categories
    .filter((c) => c.id !== categoryId && !!c.is_income === isIncome)
    .map((c) => ({ value: c.id, label: c.name }))

  const canConfirm =
    txnCount === 0 || action === 'pending' || (action === 'move' && targetCategoryId !== '')

  function handleConfirm() {
    if (txnCount === 0) {
      onConfirm('pending')
      return
    }
    if (!action) return
    onConfirm(action, action === 'move' ? targetCategoryId : undefined)
  }

  function handleCancel() {
    setAction(null)
    setTargetCategoryId('')
    onCancel()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: 24,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2">
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'color-mix(in oklch, var(--neg) 12%, var(--surface-2))',
                flexShrink: 0,
              }}
            >
              <Icon name="delete" size={16} style={{ color: 'var(--neg)' }} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              Delete &ldquo;{categoryName}&rdquo;
            </span>
          </div>
          <button onClick={handleCancel} className="btn ghost icon sm">
            <Icon name="close" size={14} />
          </button>
        </div>

        {txnCount === 0 ? (
          /* Simple confirm — no transactions affected */
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>
            Unused category — safe to delete.
          </p>
        ) : (
          /* Rich choice — transactions exist */
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
              <strong style={{ color: 'var(--ink)' }}>{txnCount}</strong>{' '}
              {txnCount === 1 ? 'transaction' : 'transactions'} and any saved mapping rules are
              associated with this category. Choose what to do with them:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Option A: Move to another category */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${action === 'move' ? 'var(--accent)' : 'var(--line)'}`,
                  background: action === 'move' ? 'var(--accent-soft)' : 'var(--surface-2)',
                  cursor: 'pointer',
                  transition: 'border-color .12s, background .12s',
                }}
              >
                <input
                  type="radio"
                  name="delete-action"
                  value="move"
                  checked={action === 'move'}
                  onChange={() => setAction('move')}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--accent)' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}
                  >
                    Move to another category
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    Reassign all transactions and mapping rules to an existing category
                  </div>
                  {action === 'move' && (
                    <div style={{ marginTop: 10 }}>
                      <SearchableSelect
                        label=""
                        options={otherCategories}
                        value={targetCategoryId}
                        onChange={setTargetCategoryId}
                        placeholder={`Choose ${isIncome ? 'income' : 'expense'} category…`}
                      />
                    </div>
                  )}
                </div>
              </label>

              {/* Option B: Return to pending */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${action === 'pending' ? 'var(--accent)' : 'var(--line)'}`,
                  background: action === 'pending' ? 'var(--accent-soft)' : 'var(--surface-2)',
                  cursor: 'pointer',
                  transition: 'border-color .12s, background .12s',
                }}
              >
                <input
                  type="radio"
                  name="delete-action"
                  value="pending"
                  checked={action === 'pending'}
                  onChange={() => setAction('pending')}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--accent)' }}
                />
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}
                  >
                    Return to pending
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    Move all transactions back to the unprocessed queue. Mapping rules will be
                    removed.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            className="btn ghost"
            style={{ fontSize: 13 }}
            disabled={loading}
          >
            Cancel
          </button>
          <Button variant="danger" onClick={handleConfirm} loading={loading} disabled={!canConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
