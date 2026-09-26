import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'

import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useFocusReturn } from '@/hooks/useFocusReturn'
import { useToastContext } from '@/hooks/useToastContext'
import { createBudget } from '@/lib/api/budget'
import { createCategory } from '@/lib/api/categories'
import { formatYearLabel, type PeriodMode } from '@/lib/period'
import { invalidateDomains } from '@/lib/queryKeys'
import type { Category } from '@/types/settings'

import { monthlyToAnnual } from '../lib/budgetMath'

export function AddBudgetModal({
  categories,
  existingCategoryIds,
  year,
  mode,
  onClose,
  onSaved,
}: {
  categories: Category[]
  existingCategoryIds: Set<string>
  year: number
  /** Labels the year the way the rest of the page does ("FY 26-27" or "2026"). */
  mode: PeriodMode
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const titleId = useId()

  useFocusReturn()

  // Phase 9: brings this dialog up to the same role="dialog"/Escape/focus-
  // return standard as the other five dialogs in the app — see
  // docs/ledger-sweep-findings.md. Conditionally mounted by BudgetPage (no
  // `isOpen` prop), so this mirrors ImportDialog/AddTransactionDialog's
  // pattern rather than ConfirmDialog's `isOpen`-gated one.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
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
        // Same scrim as ConfirmDialog: a bare 45% black let the Budget
        // world's panel copy and scene labels read through the dialog.
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        // Phase 9: the panel already used .animate-scale-in, but the
        // backdrop itself had no fade — extends the same shared
        // fade-up/pop vocabulary the other dialogs use.
        animation: 'fade-up .15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="card animate-scale-in"
        // Opaque: .card is a translucent glass surface meant to sit on the page.
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '85vh',
          overflow: 'auto',
          background: 'var(--surface)',
        }}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
          <div>
            <p id={titleId} className="card-title">
              Add budget entries
            </p>
            <p className="card-sub" style={{ marginTop: 2 }}>
              Set {period} budgets for new categories in {formatYearLabel(year, mode)}.
            </p>
          </div>
          <button
            className="btn ghost icon sm"
            onClick={onClose}
            aria-label="Close"
            style={{ marginLeft: 12 }}
          >
            <Icon name="close" size={16} />
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
