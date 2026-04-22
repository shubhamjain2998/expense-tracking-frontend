import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createRawTransaction } from '../../lib/api'
import { useToastContext } from '../../hooks/useToastContext'
import { Button } from './Button'

export function QuickAddFAB() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const todayStr = () => new Date().toISOString().slice(0, 10)

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayStr)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () =>
      createRawTransaction({
        txn_date: `${date}T00:00:00`,
        description: desc.trim(),
        amount: parseFloat(amount),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rawTransactions'] })
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
      toast.success('Transaction added — go to Review to categorise')
      setDesc('')
      setAmount('')
      setDate(todayStr)
      setErrors({})
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  function handleClose() {
    setOpen(false)
    setDesc('')
    setAmount('')
    setDate(todayStr)
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
    if (!Object.keys(errs).length) mutation.mutate()
  }

  return (
    <>
      <button
        onClick={() => {
          setDate(todayStr)
          setOpen(true)
        }}
        className="bg-primary text-on-primary fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Quick add transaction"
        title="Quick add transaction (Alt+N)"
      >
        <span className="material-symbols-outlined text-[24px]">add</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center"
          role="dialog"
          aria-modal
          aria-label="Quick add transaction"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
          <div className="bg-surface relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  add_circle
                </span>
                <h2 className="text-on-surface text-base font-bold">Quick Add Transaction</h2>
              </div>
              <button
                onClick={handleClose}
                className="text-outline hover:bg-surface-container rounded-lg p-1.5"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-on-surface-variant mb-1 block text-[11px] font-bold tracking-wider uppercase">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field w-full"
                  aria-label="Transaction date"
                />
                {errors.date && <p className="text-error mt-1 text-xs">{errors.date}</p>}
              </div>

              <div>
                <label className="text-on-surface-variant mb-1 block text-[11px] font-bold tracking-wider uppercase">
                  Description
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Blinkit Gurgaon"
                  className="input-field w-full"
                  autoFocus
                  aria-label="Transaction description"
                />
                {errors.desc && <p className="text-error mt-1 text-xs">{errors.desc}</p>}
              </div>

              <div>
                <label className="text-on-surface-variant mb-1 block text-[11px] font-bold tracking-wider uppercase">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="input-field w-full"
                  aria-label="Transaction amount"
                />
                {errors.amount && <p className="text-error mt-1 text-xs">{errors.amount}</p>}
              </div>

              <Button
                variant="primary"
                type="submit"
                loading={mutation.isPending}
                className="w-full"
              >
                Add Transaction
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
