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

  function handleSave() {
    const amount = Number(editValue)
    if (amount > 0) {
      onSetBudget(row.categoryId, amount)
    }
    setEditing(false)
  }

  return (
    <tr className="group" style={{ opacity: 0.7 }}>
      {/* Category */}
      <td>
        <div className="flex items-center gap-2">
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
          <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{row.categoryName}</span>
        </div>
      </td>

      {/* Monthly Budget — set budget inline */}
      <td className="num">
        {editing ? (
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
            placeholder="e.g. 5,000"
            disabled={isSaving}
            aria-label={`Set monthly budget for ${row.categoryName}`}
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to set monthly budget"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--ink-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 'auto',
            }}
          >
            <span style={{ fontSize: 12 }}>—</span>
            <span
              className="opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--accent)',
                whiteSpace: 'nowrap',
              }}
            >
              + Set
            </span>
          </button>
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
