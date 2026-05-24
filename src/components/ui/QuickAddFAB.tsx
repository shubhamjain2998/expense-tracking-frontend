import { useState } from 'react'

import { useQuickAdd } from '../../hooks/useQuickAdd'
import type { TxnType } from '../../types/transaction'

import { Button } from './Button'

const TXN_TYPE_OPTIONS: { value: TxnType; label: string; color: string }[] = [
  { value: 'expense', label: 'Expense', color: 'var(--ink)' },
  { value: 'income', label: 'Income', color: 'var(--pos)' },
  { value: 'refund', label: 'Refund', color: 'var(--pos)' },
  { value: 'transfer', label: 'Transfer', color: 'var(--ink-3)' },
]

export function QuickAddFAB() {
  const todayStr = () => new Date().toISOString().slice(0, 10)

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayStr)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [txnType, setTxnType] = useState<TxnType>('expense')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useQuickAdd({
    onSuccess: () => {
      setDesc('')
      setAmount('')
      setDate(todayStr)
      setTxnType('expense')
      setErrors({})
    },
  })

  function handleClose() {
    setOpen(false)
    setDesc('')
    setAmount('')
    setDate(todayStr)
    setTxnType('expense')
    setErrors({})
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!date) errs.date = 'Required'
    if (!desc.trim()) errs.desc = 'Required'
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount'
    setErrors(errs)
    if (!Object.keys(errs).length)
      mutation.mutate({
        txn_date: `${date}T00:00:00`,
        description: desc.trim(),
        amount: amt,
        txn_type: txnType,
      })
  }

  return (
    <>
      <button
        onClick={() => {
          setDate(todayStr)
          setOpen(true)
        }}
        className="fixed right-4 bottom-4 z-40 flex items-center justify-center md:right-6 md:bottom-6"
        aria-label="Quick add transaction"
        title="Quick add transaction (Alt+N)"
        style={{
          height: 48,
          width: 48,
          borderRadius: 999,
          background: 'var(--ink)',
          color: 'var(--bg)',
          border: '1px solid var(--ink)',
          boxShadow: 'var(--shadow-pop)',
          transition: 'transform .12s ease',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          add
        </span>
      </button>

      {open && (
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
          aria-label="Quick add transaction"
        >
          <div className="absolute inset-0" onClick={handleClose} />
          <div
            className="relative z-10 w-full max-w-sm"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-pop)',
              animation: 'pop .18s ease',
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16, color: 'var(--ink-3)' }}
                >
                  add
                </span>
                <h2
                  className="text-[13.5px] font-semibold"
                  style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
                >
                  Quick add transaction
                </h2>
              </div>
              <button onClick={handleClose} className="btn ghost icon sm" aria-label="Close">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 18 }} className="space-y-3.5">
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

              <Button
                variant="primary"
                type="submit"
                loading={mutation.isPending}
                className="w-full"
              >
                Add transaction
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
