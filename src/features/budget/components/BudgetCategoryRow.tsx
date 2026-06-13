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
  rank,
  renamingCategoryId,
  renamingCategoryName,
  setRenamingCategoryName,
  setRenamingCategoryId,
  renameMutation,
  incomeFlagMutation,
}: {
  row: CategoryTableRow
  onSaveBudget: (amount: number) => void
  onResetBudget: () => void
  onDelete: () => void
  rank: number | null
  renamingCategoryId: string | null
  renamingCategoryName: string
  setRenamingCategoryName: (v: string) => void
  setRenamingCategoryId: (id: string | null) => void
  renameMutation: { mutate: (args: { id: string; name: string }) => void; isPending: boolean }
  incomeFlagMutation: {
    mutate: (args: { id: string; is_income: boolean }) => void
    isPending: boolean
  }
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isRenaming = renamingCategoryId === row.categoryId

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
    <tr
      className="group"
      style={
        row.pctUsed !== null && row.pctUsed >= 100 && row.monthlyBudget > 0
          ? { background: 'rgba(248, 113, 113, 0.04)' }
          : undefined
      }
    >
      {/* Category name — or rename input */}
      <td>
        <div className="flex min-w-0 items-center gap-2">
          {rank !== null && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--ink-4)',
                width: 16,
                textAlign: 'right',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              #{rank}
            </span>
          )}
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
          {isRenaming ? (
            <input
              value={renamingCategoryName}
              onChange={(e) => setRenamingCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  renameMutation.mutate({ id: row.categoryId, name: renamingCategoryName })
                if (e.key === 'Escape') setRenamingCategoryId(null)
              }}
              className="input flex-1"
              style={{ fontSize: 13, height: 26, minWidth: 0 }}
              maxLength={64}
              autoFocus
              aria-label="Rename category"
            />
          ) : (
            <span
              style={{
                color: 'var(--ink-2)',
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
          )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <ProgressBar pct={row.pctUsed} />
            </div>
            <span
              style={{
                fontSize: 10.5,
                width: 32,
                textAlign: 'right',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
                color:
                  row.pctUsed >= 100
                    ? 'var(--neg)'
                    : row.pctUsed >= 80
                      ? 'var(--warn)'
                      : 'var(--ink-4)',
              }}
            >
              {Math.round(row.pctUsed)}%
            </span>
          </div>
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

      {/* Actions */}
      <td>
        {isRenaming ? (
          <div className="flex items-center justify-end gap-0.5">
            <button
              onClick={() =>
                renameMutation.mutate({ id: row.categoryId, name: renamingCategoryName })
              }
              disabled={renameMutation.isPending}
              className="btn ghost icon sm"
              aria-label="Confirm rename"
            >
              <Icon name="check" size={13} />
            </button>
            <button
              onClick={() => setRenamingCategoryId(null)}
              className="btn ghost icon sm"
              aria-label="Cancel rename"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => {
                setRenamingCategoryId(row.categoryId)
                setRenamingCategoryName(row.categoryName)
              }}
              className="btn ghost icon sm"
              title="Rename category"
              aria-label={`Rename ${row.categoryName}`}
            >
              <Icon name="edit" size={13} />
            </button>
            <button
              onClick={() => incomeFlagMutation.mutate({ id: row.categoryId, is_income: true })}
              disabled={incomeFlagMutation.isPending}
              className="btn ghost icon sm"
              title="Move to income"
              aria-label={`Move ${row.categoryName} to income`}
            >
              <Icon name="trending_up" size={13} style={{ color: 'var(--pos)' }} />
            </button>
            <button
              onClick={onDelete}
              className="btn ghost icon sm"
              title="Remove from budget"
              aria-label={`Delete budget for ${row.categoryName}`}
            >
              <Icon name="delete" size={13} />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
