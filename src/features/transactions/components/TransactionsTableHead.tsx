import type { Dispatch, SetStateAction } from 'react'

import { Icon } from '@/components/ui/Icon'

import type { SortCol, SortDir, UnifiedTxn } from '../types'

interface TransactionsTableHeadProps {
  sortCol: SortCol
  sortDir: SortDir
  onToggleSort: (col: SortCol) => void
  visibleFiltered: UnifiedTxn[]
  checkedUids: Set<string>
  setCheckedUids: Dispatch<SetStateAction<Set<string>>>
}

const columns: {
  label: string
  col: SortCol
  align: 'left' | 'center' | 'right'
  className?: string
}[] = [
  { label: 'Date', col: 'date', align: 'left' },
  { label: 'Merchant', col: 'merchant', align: 'left' },
  { label: 'Category', col: 'category', align: 'left', className: 'hide-sm' },
  { label: 'Tags', col: 'tags', align: 'left', className: 'txn-col-tags hide-sm' },
  { label: 'With', col: 'split', align: 'center', className: 'txn-col-split hide-sm' },
  { label: 'Amount', col: 'amount', align: 'right' },
]

const thBase: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
}

export function TransactionsTableHead({
  sortCol,
  sortDir,
  onToggleSort,
  visibleFiltered,
  checkedUids,
  setCheckedUids,
}: TransactionsTableHeadProps) {
  return (
    <thead>
      <tr style={{ borderBottom: '1px solid var(--line)' }}>
        <th className="txn-col-check" style={{ padding: '8px 0 8px 10px', width: 36 }}>
          {visibleFiltered.length > 0 && (
            // A <label> (not just padding on the checkbox itself) is the fix
            // here: Chrome ignores `padding` on a native `appearance: auto`
            // checkbox entirely (verified live — computed padding stayed
            // 0px), so the only way to grow its clickable area without an
            // ancestor click-delegation handler (there is none here, unlike
            // TransactionRow's <td>) is a wrapping label, whose own box
            // *does* respect padding and whose click natively forwards to
            // its associated control.
            <label className="hit44-pad" aria-label="Select all visible rows">
              <input
                type="checkbox"
                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                checked={
                  checkedUids.size > 0 && visibleFiltered.every((t) => checkedUids.has(t.uid))
                }
                onChange={(e) => {
                  if (e.target.checked) setCheckedUids(new Set(visibleFiltered.map((t) => t.uid)))
                  else setCheckedUids(new Set())
                }}
              />
            </label>
          )}
        </th>
        <th className="txn-col-drag" style={{ padding: '8px 0 8px 4px' }} />
        {columns.map(({ label, col, align, className }) => {
          const active = sortCol === col
          return (
            <th
              key={col}
              className={className}
              onClick={() => onToggleSort(col)}
              aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              style={{
                ...thBase,
                textAlign: align,
                // was --ink-4 for the resting (non-sorted) state — --ink-4
                // is non-text only per MASTER.md §2; this inline style was
                // overriding the already-fixed `.tbl th` CSS color.
                color: active ? 'var(--ink-2)' : 'var(--ink-3)',
                fontVariantNumeric: col === 'amount' ? 'tabular-nums' : 'normal',
              }}
            >
              {label}
              {active && (
                <Icon
                  name={sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  size={12}
                  className="ml-[3px] inline-block align-middle"
                />
              )}
            </th>
          )
        })}
        <th />
      </tr>
    </thead>
  )
}
