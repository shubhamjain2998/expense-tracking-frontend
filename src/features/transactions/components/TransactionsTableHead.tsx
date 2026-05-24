import type { Dispatch, SetStateAction } from 'react'

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
  { label: 'Category', col: 'category', align: 'left' },
  { label: 'Tags', col: 'tags', align: 'left', className: 'txn-col-tags' },
  { label: 'Split', col: 'split', align: 'center', className: 'txn-col-split' },
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
            <input
              type="checkbox"
              style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
              checked={checkedUids.size > 0 && visibleFiltered.every((t) => checkedUids.has(t.uid))}
              onChange={(e) => {
                if (e.target.checked) setCheckedUids(new Set(visibleFiltered.map((t) => t.uid)))
                else setCheckedUids(new Set())
              }}
            />
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
                color: active ? 'var(--ink-2)' : 'var(--ink-4)',
                fontVariantNumeric: col === 'amount' ? 'tabular-nums' : 'normal',
              }}
            >
              {label}
              {active && (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 12, marginLeft: 3, verticalAlign: 'middle' }}
                >
                  {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              )}
            </th>
          )
        })}
        <th />
      </tr>
    </thead>
  )
}
