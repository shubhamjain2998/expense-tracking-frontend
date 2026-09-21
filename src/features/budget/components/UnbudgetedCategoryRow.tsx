import { useRef, useState } from 'react'

import { AmountInput } from '@/components/ui/AmountInput'
import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/format'

import type { UnbudgetedCategoryRow as UnbudgetedCategoryRowData } from '../types'

/**
 * Budget §3 "Outside the plan" row — a category with spend but no budget
 * line, rendered as an `.alert` (MASTER.md idiom shared with Home's
 * NeedsAttention / CommittedVsChosen). The inline "set a budget" mutation
 * path is unchanged from before this restyle — it used to live in a table
 * row, now it lives in an alert row.
 */
export function UnbudgetedCategoryRow({
  row,
  onSetBudget,
  isSaving,
}: {
  row: UnbudgetedCategoryRowData
  onSetBudget: (categoryId: string, monthlyAmount: number) => void
  isSaving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditValue('')
    setEditing(true)
    queueMicrotask(() => inputRef.current?.focus())
  }

  function handleConfirm() {
    const amount = Number(editValue)
    if (amount > 0) {
      onSetBudget(row.categoryId, amount)
    }
    setEditing(false)
  }

  function handleCancel() {
    setEditing(false)
    setEditValue('')
  }

  return (
    <div className="alert">
      <Icon className="ico" name="tag" size={18} />
      <span className="body flex flex-col">
        <span className="strong">
          <span>{row.categoryName}</span> — {formatCurrency(row.thisMonthSpent)} this month
        </span>
        <span className="small">
          {row.txnCount} transaction{row.txnCount === 1 ? '' : 's'} total · no budget line yet
        </span>
      </span>
      {editing ? (
        <span className="act inline-flex items-center gap-1.5">
          <AmountInput
            ref={inputRef}
            value={editValue}
            onChange={setEditValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm()
              if (e.key === 'Escape') handleCancel()
            }}
            className="input num"
            style={{ width: 90 }}
            placeholder="e.g. 5,000"
            disabled={isSaving}
            aria-label={`Set monthly budget for ${row.categoryName}`}
          />
          <button
            onClick={handleConfirm}
            disabled={isSaving || !editValue || Number(editValue) <= 0}
            className="btn ghost icon sm"
            aria-label={`Confirm monthly budget for ${row.categoryName}`}
          >
            <Icon name="check" size={13} />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="btn ghost icon sm"
            aria-label="Cancel"
          >
            <Icon name="close" size={13} />
          </button>
        </span>
      ) : (
        <button className="btn sm act" onClick={startEdit}>
          Set budget
        </button>
      )}
    </div>
  )
}
