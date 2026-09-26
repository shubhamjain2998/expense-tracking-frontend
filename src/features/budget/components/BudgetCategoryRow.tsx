import { useRef, useState } from 'react'

import { AmountInput } from '@/components/ui/AmountInput'
import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/format'

import type { CategoryTableRow } from '../types'

/**
 * Budget §2 "The plan" row. Category rename / delete / income-flag moved to
 * Settings → Categories (one place for category CRUD instead of two); this
 * row keeps only what belongs to the plan itself: the monthly budget inline
 * edit (unchanged mutation path) and removing the category from the plan.
 */
export function BudgetCategoryRow({
  row,
  periodView,
  onSaveBudget,
  onDelete,
  hot = false,
  onHighlight,
}: {
  row: CategoryTableRow
  periodView: 'monthly' | 'annual'
  onSaveBudget: (amount: number) => void
  onDelete: () => void
  /** Lit from its vessel in the 3D world. */
  hot?: boolean
  onHighlight?: (categoryId: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const plan = periodView === 'monthly' ? row.monthlyBudget : row.annualBudget
  const spent = periodView === 'monthly' ? row.thisMonthSpent : row.ytdSpent
  const left = plan - spent
  const pct = periodView === 'monthly' ? row.pctUsed : plan > 0 ? (spent / plan) * 100 : null

  function startEdit() {
    setEditValue(String(Math.round(row.monthlyBudget)))
    setEditing(true)
    queueMicrotask(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  function handleSave() {
    const amount = Number(editValue)
    if (amount > 0 && Math.abs(amount - row.monthlyBudget) > 0.5) {
      onSaveBudget(amount)
    }
    setEditing(false)
  }

  const overBudget = pct !== null && pct >= 100

  return (
    <tr
      className={hot ? 'group is-hot' : 'group'}
      onMouseEnter={onHighlight ? () => onHighlight(row.categoryId) : undefined}
      onMouseLeave={onHighlight ? () => onHighlight(null) : undefined}
      onFocus={onHighlight ? () => onHighlight(row.categoryId) : undefined}
      onBlur={onHighlight ? () => onHighlight(null) : undefined}
    >
      <td className="strong">{row.categoryName}</td>

      {/* Plan — inline editable (always edits the MONTHLY value; the annual
          figure it becomes is monthlyToAnnual(x), handled by the mutation). */}
      <td className="num">
        {periodView === 'monthly' && editing ? (
          <AmountInput
            ref={inputRef}
            value={editValue}
            onChange={setEditValue}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="input num"
            style={{ width: 110, textAlign: 'right' }}
            aria-label={`Monthly budget for ${row.categoryName}`}
          />
        ) : (
          <span className="inline-flex items-center justify-end gap-1">
            {periodView === 'monthly' ? (
              <button
                onClick={startEdit}
                title="Edit the monthly plan (applies to every month)"
                className="num hit44-pad-v budget-edit-trigger inline-flex items-center gap-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
              >
                {formatCurrency(plan)}
                <Icon
                  name="edit"
                  size={12}
                  style={{ color: 'var(--ink-4)' }}
                  className="opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                />
              </button>
            ) : (
              formatCurrency(plan)
            )}
          </span>
        )}
      </td>

      {/* Spent (this month, or YTD in annual view) */}
      <td className="num" style={{ color: overBudget ? 'var(--neg)' : undefined }}>
        {formatCurrency(spent)}
      </td>

      {/* Left */}
      <td className="num" style={{ color: left < 0 ? 'var(--neg)' : undefined }}>
        {formatCurrency(left)}
      </td>

      {/* Against pace */}
      <td>
        {pct !== null ? (
          <span className="flex items-center gap-2">
            <span className="meter" style={{ width: 120, display: 'inline-block' }}>
              <i
                className={pct >= 100 ? 'over' : undefined}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </span>
            <span className={pct >= 100 ? 'small neg num' : 'small num'}>{Math.round(pct)}%</span>
          </span>
        ) : (
          <span className="small">—</span>
        )}
      </td>

      <td>
        <button
          onClick={onDelete}
          className="btn ghost icon sm opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          title="Remove from plan"
          aria-label={`Delete budget for ${row.categoryName}`}
        >
          <Icon name="delete" size={13} />
        </button>
      </td>
    </tr>
  )
}
