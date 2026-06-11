import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useQuickAdd } from '@/hooks/useQuickAdd'
import { useToastContext } from '@/hooks/useToastContext'
import type { TxnType } from '@/types/transaction'

const TXN_TYPE_OPTIONS: { value: TxnType; label: string; color: string }[] = [
  { value: 'expense', label: 'Expense', color: 'var(--ink)' },
  { value: 'income', label: 'Income', color: 'var(--pos)' },
]

export function ManualEntryPanel() {
  const toast = useToastContext()

  const [manualDate, setManualDate] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [txnType, setTxnType] = useState<TxnType>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({})

  // useQuickAdd handles toast + invalidation; onSuccess resets the form.
  const { mutation, categories, createCategoryInline } = useQuickAdd({
    onSuccess: () => {
      setManualDate('')
      setManualDesc('')
      setManualAmount('')
      setTxnType('expense')
      setCategoryId('')
      setManualErrors({})
    },
  })

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!manualDate) errors.date = 'Date is required'
    if (!manualDesc.trim()) errors.desc = 'Description is required'
    const amt = parseFloat(manualAmount)
    if (!manualAmount || isNaN(amt) || amt <= 0) errors.amount = 'Enter a valid positive amount'
    setManualErrors(errors)
    if (Object.keys(errors).length > 0) return

    mutation.mutate({
      raw: {
        txn_date: `${manualDate}T00:00:00`,
        description: manualDesc.trim(),
        amount: amt,
        txn_type: txnType,
      },
      ...(categoryId
        ? {
            process: {
              category_id: categoryId,
            },
          }
        : {}),
    })
  }

  return (
    <div className="card">
      <p className="card-title mb-3">Enter transaction details</p>
      <form onSubmit={handleSubmit} className="max-w-md space-y-3">
        {/* Type */}
        <div>
          <label className="eyebrow mb-1 block">Type</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {TXN_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTxnType(opt.value)}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11.5,
                  fontWeight: 500,
                  border: '1px solid ' + (txnType === opt.value ? opt.color : 'var(--line)'),
                  background:
                    txnType === opt.value
                      ? `color-mix(in oklch, ${opt.color} 12%, var(--surface))`
                      : 'var(--surface-2)',
                  color: txnType === opt.value ? opt.color : 'var(--ink-3)',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="eyebrow mb-1 block">Date</label>
          <input
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            className="input"
            aria-label="Transaction date"
          />
          {manualErrors.date && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
              {manualErrors.date}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="eyebrow mb-1 block">Description</label>
          <input
            type="text"
            value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)}
            placeholder="e.g. Blinkit Gurgaon"
            className="input"
            aria-label="Transaction description"
          />
          {manualErrors.desc && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
              {manualErrors.desc}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="eyebrow mb-1 block">Amount (₹)</label>
          <input
            type="number"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            className="input num"
            aria-label="Transaction amount"
          />
          {manualErrors.amount && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
              {manualErrors.amount}
            </p>
          )}
        </div>

        {/* Category — optional; if set, transaction is processed immediately */}
        <SearchableSelect
          label="Category (optional — processes immediately if set)"
          options={categoryOptions}
          value={categoryId}
          onChange={setCategoryId}
          placeholder="Leave blank to categorise later…"
          allowCreate
          onCreateOption={createCategoryInline}
          onCreateError={(msg) => toast.error(msg)}
        />

        <div className="pt-1">
          <Button variant="primary" type="submit" loading={mutation.isPending}>
            {categoryId ? 'Add & process' : 'Add transaction'}
          </Button>
        </div>
      </form>
    </div>
  )
}
