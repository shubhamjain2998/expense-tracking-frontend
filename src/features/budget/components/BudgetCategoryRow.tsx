import { useRef, useState } from 'react'

import { AmountInput } from '@/components/ui/AmountInput'
import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/format'

import { CAT_COLORS } from '../lib/heatColor'
import type { CategoryTableRow } from '../types'

import { ProgressBar } from './ProgressBar'

export function BudgetCategoryRow({
  row,
  onSaveBudget,
  onResetBudget,
  onDelete,
}: {
  row: CategoryTableRow
  onSaveBudget: (amount: number) => void
  onResetBudget: () => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  const overBudget = row.pctUsed !== null && row.pctUsed >= 100

  return (
    <tr className="group">
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
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{row.categoryName}</span>
        </div>
      </td>

      {/* Monthly Budget — inline editable */}
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
            aria-label={`Monthly budget for ${row.categoryName}`}
          />
        ) : (
          <span className="flex items-center justify-end gap-1">
            {row.hasOverride && (
              <span
                title="Custom budget for this month"
                style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  flexShrink: 0,
                }}
              />
            )}
            <button
              onClick={startEdit}
              title="Click to edit monthly budget"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'var(--ink)',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span className="num">{formatCurrency(row.monthlyBudget)}</span>
              <Icon
                name="edit"
                size={12}
                style={{ color: 'var(--ink-4)' }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
            {row.hasOverride && (
              <button
                onClick={onResetBudget}
                title="Reset to default (annual / 12)"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--ink-4)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Icon name="restart_alt" size={12} />
              </button>
            )}
          </span>
        )}
      </td>

      {/* This Month */}
      <td className="num" style={{ color: overBudget ? 'var(--neg)' : 'var(--ink)' }}>
        {formatCurrency(row.thisMonthSpent)}
      </td>

      {/* Progress bar */}
      <td style={{ padding: '0 12px' }}>
        {row.pctUsed !== null ? (
          <ProgressBar pct={row.pctUsed} />
        ) : (
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
        )}
      </td>

      {/* YTD Spent */}
      <td
        className="num"
        style={{
          color: row.ytdSpent > row.annualBudget ? 'var(--neg)' : 'var(--ink)',
          fontWeight: row.ytdSpent > row.annualBudget ? 600 : 400,
        }}
      >
        {formatCurrency(row.ytdSpent)}
      </td>

      {/* Annual Budget */}
      <td className="num" style={{ color: 'var(--ink-3)' }}>
        {formatCurrency(row.annualBudget)}
      </td>

      {/* Delete */}
      <td>
        <button
          onClick={onDelete}
          className="btn ghost icon sm opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Delete budget for ${row.categoryName}`}
        >
          <Icon name="delete" size={14} />
        </button>
      </td>
    </tr>
  )
}
