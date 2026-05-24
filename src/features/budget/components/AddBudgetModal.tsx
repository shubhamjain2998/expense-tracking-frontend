import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useToastContext } from '@/hooks/useToastContext'
import { createBudget } from '@/lib/api/budget'
import { createCategory } from '@/lib/api/categories'
import { invalidateDomains } from '@/lib/queryKeys'
import type { Category } from '@/types/settings'

import { monthlyToAnnual } from '../lib/budgetMath'

export function AddBudgetModal({
  categories,
  existingCategoryIds,
  year,
  onClose,
  onSaved,
}: {
  categories: Category[]
  existingCategoryIds: Set<string>
  year: number
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [rows, setRows] = useState([{ id: 0, categoryId: '', amount: '' }])
  const [period, setPeriod] = useState<'annual' | 'monthly'>('annual')

  const availableOptions = categories
    .filter((c) => !existingCategoryIds.has(c.id) && !c.is_income)
    .map((c) => ({ value: c.id, label: c.name }))

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      invalidateDomains(qc, ['budget', 'dashboard'])
      toast.success('Budget entries saved')
      onSaved()
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409)
        toast.error('One or more categories already have a budget for this year')
      else toast.error(err.detail)
    },
  })

  async function handleCreateCategory(name: string): Promise<string> {
    const cat = await createCategory(name)
    invalidateDomains(qc, ['categories'])
    return cat.id
  }

  function handleSave() {
    const valid = rows.filter((r) => r.categoryId && Number(r.amount) > 0)
    if (!valid.length) {
      toast.warning('Fill in at least one category and amount')
      return
    }
    createMutation.mutate({
      year,
      entries: valid.map((r) => ({
        category_id: r.categoryId,
        allocated_amount:
          period === 'annual' ? Number(r.amount) : monthlyToAnnual(Number(r.amount)),
      })),
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="card animate-scale-in"
        style={{ width: '100%', maxWidth: 460, maxHeight: '85vh', overflow: 'auto' }}
      >
        <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
          <div>
            <p className="card-title">Add budget entries</p>
            <p className="card-sub" style={{ marginTop: 2 }}>
              Set {period} budgets for new categories in {year}.
            </p>
          </div>
          <button
            className="btn ghost icon sm"
            onClick={onClose}
            aria-label="Close"
            style={{ marginLeft: 12 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              close
            </span>
          </button>
        </div>

        <div className="seg" style={{ marginBottom: 16 }} aria-label="Budget period">
          <button className={period === 'annual' ? 'on' : ''} onClick={() => setPeriod('annual')}>
            Annual
          </button>
          <button className={period === 'monthly' ? 'on' : ''} onClick={() => setPeriod('monthly')}>
            Monthly
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={row.id}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: 12,
              }}
            >
              <div className="space-y-2.5">
                <SearchableSelect
                  label="Category"
                  options={availableOptions}
                  value={row.categoryId}
                  onChange={(val) =>
                    setRows((rs) => rs.map((r, ri) => (ri === i ? { ...r, categoryId: val } : r)))
                  }
                  placeholder="Search or create category…"
                  allowCreate
                  onCreateOption={handleCreateCategory}
                />
                <div>
                  <label className="eyebrow mb-1 block">
                    {period === 'annual' ? 'Annual' : 'Monthly'} amount (₹)
                  </label>
                  <AmountInput
                    value={row.amount}
                    placeholder={period === 'annual' ? 'e.g. 60,000' : 'e.g. 5,000'}
                    onChange={(raw) =>
                      setRows((rs) => rs.map((r, ri) => (ri === i ? { ...r, amount: raw } : r)))
                    }
                    className="input num"
                    aria-label={`${period === 'annual' ? 'Annual' : 'Monthly'} amount for entry ${i + 1}`}
                  />
                </div>
                {rows.length > 1 && (
                  <button
                    onClick={() => setRows((rs) => rs.filter((_, ri) => ri !== i))}
                    className="btn ghost sm"
                    style={{ color: 'var(--neg)' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => setRows((rs) => [...rs, { id: Date.now(), categoryId: '', amount: '' }])}
            style={{
              display: 'block',
              width: '100%',
              border: '1px dashed var(--line-strong)',
              borderRadius: 'var(--radius)',
              color: 'var(--ink-3)',
              padding: '10px',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            + Add another category
          </button>

          <div className="flex gap-2">
            <Button variant="tertiary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSave}
              loading={createMutation.isPending}
            >
              Save entries
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
