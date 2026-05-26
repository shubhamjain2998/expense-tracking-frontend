import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { NewTagChip } from '@/features/transactions/components/NewTagChip'
import { useQuickAdd } from '@/hooks/useQuickAdd'
import { useToastContext } from '@/hooks/useToastContext'
import { todayIsoDate } from '@/lib/format'
import type { TxnType } from '@/types/transaction'

import { Button } from './Button'
import { SearchableSelect } from './SearchableSelect'

const TXN_TYPE_OPTIONS: { value: TxnType; label: string; color: string }[] = [
  { value: 'expense', label: 'Expense', color: 'var(--ink)' },
  { value: 'income', label: 'Income', color: 'var(--pos)' },
  { value: 'refund', label: 'Refund', color: 'var(--pos)' },
  { value: 'transfer', label: 'Transfer', color: 'var(--ink-3)' },
]

interface AddTransactionDialogProps {
  onClose: () => void
}

export function AddTransactionDialog({ onClose }: AddTransactionDialogProps) {
  const toast = useToastContext()
  const [date, setDate] = useState(todayIsoDate)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [txnType, setTxnType] = useState<TxnType>('expense')
  const [processNow, setProcessNow] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutation, categories, tags, createCategoryInline } = useQuickAdd({ onSuccess: onClose })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!date) errs.date = 'Required'
    if (!desc.trim()) errs.desc = 'Required'
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount'
    if (processNow && !categoryId) errs.category = 'Select a category to process'
    setErrors(errs)
    if (Object.keys(errs).length) return
    mutation.mutate({
      raw: {
        txn_date: `${date}T00:00:00`,
        description: desc.trim(),
        amount: amt,
        txn_type: txnType,
      },
      ...(processNow
        ? {
            process: {
              category_id: categoryId,
              tag_ids: selectedTagIds,
            },
          }
        : {}),
    })
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      style={{
        padding: 24,
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        backdropFilter: 'blur(8px)',
        animation: 'fade-up .15s ease',
      }}
      role="dialog"
      aria-modal
      aria-label="Add transaction"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative z-10 flex w-full max-w-sm flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'pop .18s ease',
          maxHeight: 'calc(100vh - 48px)',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2">
            <Icon name="add" size={16} style={{ color: 'var(--ink-3)' }} />
            <h2
              className="text-[13.5px] font-semibold"
              style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
            >
              Add transaction
            </h2>
          </div>
          <button onClick={onClose} className="btn ghost icon sm" aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ padding: 18, overflowY: 'auto' }}
          className="space-y-3.5"
        >
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

          <div>
            <label className="eyebrow mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              aria-label="Transaction date"
            />
            {errors.date && (
              <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
                {errors.date}
              </p>
            )}
          </div>

          <div>
            <label className="eyebrow mb-1 block">Description</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Blinkit Gurgaon"
              className="input"
              autoFocus
              aria-label="Transaction description"
            />
            {errors.desc && (
              <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
                {errors.desc}
              </p>
            )}
          </div>

          <div>
            <label className="eyebrow mb-1 block">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="input num"
              aria-label="Transaction amount"
            />
            {errors.amount && (
              <p className="mt-1 text-[11px]" style={{ color: 'var(--neg)' }}>
                {errors.amount}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setProcessNow((v) => !v)}
            className="flex w-full items-center justify-between"
            style={{
              background: processNow ? 'var(--accent-soft)' : 'var(--surface-2)',
              color: processNow ? 'var(--accent)' : 'var(--ink-2)',
              border: '1px solid ' + (processNow ? 'transparent' : 'var(--line)'),
              borderRadius: 'var(--radius)',
              padding: '8px 12px',
              fontSize: 12.5,
              fontWeight: 500,
            }}
            aria-pressed={processNow}
          >
            <span className="flex items-center gap-2">
              <Icon name="bolt" size={14} />
              Process now
            </span>
            <Icon name={processNow ? 'toggle_on' : 'toggle_off'} size={16} />
          </button>

          {processNow && (
            <>
              <SearchableSelect
                label="Category"
                options={categoryOptions}
                value={categoryId}
                onChange={(v) => {
                  setCategoryId(v)
                  if (v) setErrors((e) => ({ ...e, category: '' }))
                }}
                error={errors.category}
                allowCreate
                onCreateOption={createCategoryInline}
                onCreateError={(msg) => toast.error(msg)}
              />

              <div>
                <p className="eyebrow mb-1.5">Tags (optional)</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setSelectedTagIds((ids) =>
                            active ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]
                          )
                        }
                        className={active ? 'chip accent' : 'chip'}
                        style={{ cursor: 'pointer' }}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                  <NewTagChip onCreated={(id) => setSelectedTagIds((ids) => [...ids, id])} />
                </div>
              </div>
            </>
          )}

          <Button variant="primary" type="submit" loading={mutation.isPending} className="w-full">
            {processNow ? 'Add & process' : 'Add transaction'}
          </Button>
        </form>
      </div>
    </div>
  )
}
