import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { useToastContext } from '@/hooks/useToastContext'
import { createRawTransaction } from '@/lib/api/transactions'

export function ManualEntryPanel() {
  const navigate = useNavigate()
  const toast = useToastContext()

  const [manualDate, setManualDate] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({})

  const manualMutation = useMutation({
    mutationFn: () =>
      createRawTransaction({
        txn_date: `${manualDate}T00:00:00`,
        description: manualDesc.trim(),
        amount: parseFloat(manualAmount),
      }),
    onSuccess: () => {
      toast.success('Transaction added')
      navigate('/transactions')
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!manualDate) errors.date = 'Date is required'
    if (!manualDesc.trim()) errors.desc = 'Description is required'
    const amt = parseFloat(manualAmount)
    if (!manualAmount || isNaN(amt) || amt <= 0) errors.amount = 'Enter a valid positive amount'
    setManualErrors(errors)
    if (Object.keys(errors).length === 0) manualMutation.mutate()
  }

  return (
    <div className="card">
      <p className="card-title mb-3">Enter transaction details</p>
      <form onSubmit={handleSubmit} className="max-w-md space-y-3">
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
        <div className="pt-1">
          <Button variant="primary" type="submit" loading={manualMutation.isPending}>
            Add transaction
          </Button>
        </div>
      </form>
    </div>
  )
}
