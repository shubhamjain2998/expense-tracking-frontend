import { useRef, useState } from 'react'

import { AmountInput } from '@/components/ui/AmountInput'
import { formatCurrency } from '@/lib/format'

import { CAT_COLORS } from '../lib/heatColor'
import type { UnbudgetedCategoryRow as UnbudgetedCategoryRowData } from '../types'

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
    <tr className="group" style={{ opacity: 0.7 }}>
      {/* Category */}
      <td>
        <div className="flex min-w-0 items-center gap-2">
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: CAT_COLORS[row.colorIndex],
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: 'var(--ink-3)',
              fontWeight: 500,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
            title={row.categoryName}
          >
            {row.categoryName}
          </span>
        </div>
      </td>

      {/* Monthly Budget — set budget inline */}
      <td className="num">
        {editing ? (
          <div className="flex items-center gap-1.5" style={{ justifyContent: 'flex-end' }}>
            <AmountInput
              ref={inputRef}
              value={editValue}
              onChange={setEditValue}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm()
                if (e.key === 'Escape') handleCancel()
              }}
              className="input num"
              style={{ width: 90, textAlign: 'right' }}
              placeholder="e.g. 5,000"
              disabled={isSaving}
              aria-label={`Set monthly budget for ${row.categoryName}`}
            />
            <button
              onClick={handleConfirm}
              disabled={isSaving || !editValue || Number(editValue) <= 0}
              className="btn primary sm"
              aria-label={`Confirm monthly budget for ${row.categoryName}`}
            >
              ✓
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="btn ghost sm"
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2" style={{ justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>—</span>
            <button
              onClick={startEdit}
              title="Click to set monthly budget"
              className="btn ghost sm opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--accent)',
                whiteSpace: 'nowrap',
              }}
              aria-label={`Set budget for ${row.categoryName}`}
            >
              + Set budget
            </button>
          </div>
        )}
      </td>

      {/* This Month */}
      <td className="num" style={{ color: 'var(--ink-3)' }}>
        {row.thisMonthSpent > 0 ? formatCurrency(row.thisMonthSpent) : '—'}
      </td>

      {/* Progress — no budget set */}
      <td style={{ padding: '0 12px' }}>
        <div
          style={{
            height: 4,
            background: 'var(--line)',
            borderRadius: 2,
            position: 'relative',
            minWidth: 80,
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: -2,
              bottom: -2,
              width: 1,
              background: 'var(--line-strong)',
            }}
          />
        </div>
      </td>

      {/* YTD Spent */}
      <td className="num" style={{ color: 'var(--ink-3)' }}>
        {row.ytdSpent > 0 ? formatCurrency(row.ytdSpent) : '—'}
      </td>

      {/* Annual Budget */}
      <td className="num" style={{ color: 'var(--ink-4)', fontSize: 12 }}>
        —
      </td>

      <td />
    </tr>
  )
}
