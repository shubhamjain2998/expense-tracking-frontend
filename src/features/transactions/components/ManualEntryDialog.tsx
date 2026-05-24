import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useToastContext } from '@/hooks/useToastContext'
import { createRawTransaction } from '@/lib/api/transactions'
import { todayIsoDate } from '@/lib/format'
import { invalidateDomains } from '@/lib/queryKeys'
import type { TxnType } from '@/types/transaction'

interface ManualEntryDialogProps {
  onClose: () => void
}

const TXN_TYPE_OPTIONS: { value: TxnType; label: string; color: string }[] = [
  { value: 'expense', label: 'Expense', color: 'var(--ink)' },
  { value: 'income', label: 'Income', color: 'var(--pos)' },
  { value: 'refund', label: 'Refund', color: 'var(--pos)' },
  { value: 'transfer', label: 'Transfer', color: 'var(--ink-3)' },
]

export function ManualEntryDialog({ onClose }: ManualEntryDialogProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [date, setDate] = useState(todayIsoDate())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [txnType, setTxnType] = useState<TxnType>('expense')

  const mutation = useMutation({
    mutationFn: () =>
      createRawTransaction({
        txn_date: date,
        description: description.trim(),
        amount: Number(amount),
        txn_type: txnType,
      }),
    onSuccess: () => {
      invalidateDomains(qc, ['transactions'])
      toast.success('Transaction added')
      onClose()
    },
    onError: () => toast.error('Failed to add transaction'),
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      toast.error('Description required')
      return
    }
    const n = Number(amount)
    if (isNaN(n) || n === 0) {
      toast.error('Amount must not be zero')
      return
    }
    mutation.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex w-full max-w-[380px] flex-col gap-4"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
          >
            Manual entry
          </span>
          <button onClick={onClose} className="btn ghost icon sm">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Coffee at Blue Tokai"
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input num"
              step="0.01"
              min="0.01"
            />
          </div>
          <Button variant="primary" className="mt-1 w-full" loading={mutation.isPending}>
            Add transaction
          </Button>
        </form>
      </div>
    </div>
  )
}
