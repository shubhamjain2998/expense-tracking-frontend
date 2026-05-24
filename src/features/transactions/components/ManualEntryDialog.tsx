import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useToastContext } from '@/hooks/useToastContext'
import { createRawTransaction } from '@/lib/api/transactions'
import { todayIsoDate } from '@/lib/format'
import { qk } from '@/lib/queryKeys'

interface ManualEntryDialogProps {
  onClose: () => void
}

export function ManualEntryDialog({ onClose }: ManualEntryDialogProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [date, setDate] = useState(todayIsoDate())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createRawTransaction({
        txn_date: date,
        description: description.trim(),
        amount: Number(amount),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.transactions.all })
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
            />
            <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-4)' }}>
              Use a negative value (e.g. −1200) for income, refunds, or salary.
            </p>
          </div>
          <Button variant="primary" className="mt-1 w-full" loading={mutation.isPending}>
            Add transaction
          </Button>
        </form>
      </div>
    </div>
  )
}
