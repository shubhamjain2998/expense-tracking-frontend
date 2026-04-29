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

const sortableCols = [
  { label: 'Date', col: 'date' as SortCol },
  { label: 'Merchant', col: null },
  { label: 'Category', col: 'category' as SortCol },
  { label: 'Tags', col: null },
] as { label: string; col: SortCol | null }[]

const thBase: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  userSelect: 'none',
  whiteSpace: 'nowrap',
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
        <th style={{ padding: '8px 0 8px 10px', width: 36 }}>
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
        <th style={{ padding: '8px 0 8px 4px' }} />
        {sortableCols.map(({ label, col }) => (
          <th
            key={label}
            onClick={col ? () => onToggleSort(col) : undefined}
            style={{
              ...thBase,
              color: col && sortCol === col ? 'var(--ink-2)' : 'var(--ink-4)',
              cursor: col ? 'pointer' : 'default',
            }}
          >
            {label}
            {col && sortCol === col && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 12, marginLeft: 3, verticalAlign: 'middle' }}
              >
                {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
              </span>
            )}
          </th>
        ))}
        <th
          style={{
            ...thBase,
            textAlign: 'center',
            color: 'var(--ink-4)',
            cursor: 'default',
          }}
        >
          Split
        </th>
        <th
          onClick={() => onToggleSort('amount')}
          style={{
            ...thBase,
            textAlign: 'right',
            color: sortCol === 'amount' ? 'var(--ink-2)' : 'var(--ink-4)',
            fontVariantNumeric: 'tabular-nums',
            cursor: 'pointer',
          }}
        >
          Amount
          {sortCol === 'amount' && (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 12, marginLeft: 3, verticalAlign: 'middle' }}
            >
              {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
          )}
        </th>
        <th />
      </tr>
    </thead>
  )
}
