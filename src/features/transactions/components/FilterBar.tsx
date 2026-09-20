import type { UseMutationResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/format'
import type { Category, Tag } from '@/types/settings'

import type { TxnTotals } from '../lib/txnFormat'
import type { StatusFilter } from '../types'

interface FilterBarProps {
  categories: Category[]
  categoryFilter: string
  onCategoryFilter: (v: string) => void
  tags: Tag[]
  tagFilter: string
  onTagFilter: (v: string) => void
  statusFilter: StatusFilter
  onStatusFilter: (f: StatusFilter) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  count: number
  totals: TxnTotals
  pendingCount: number
  // Row 2 only calls mutate() (no args — sweeps all pending) and reads
  // isPending, same shape FilterBar has always used for this.
  autoMutation: Pick<
    UseMutationResult<unknown, { detail: string }, string[] | undefined>,
    'mutate' | 'isPending'
  >
  onShowShortcuts?: () => void
  /** Selection count + bulk action buttons (BulkActionsBar), rendered by the
   *  page since it owns the mutation wiring — FilterBar just places it. */
  bulkActions?: ReactNode
}

export function FilterBar({
  categories,
  categoryFilter,
  onCategoryFilter,
  tags,
  tagFilter,
  onTagFilter,
  statusFilter,
  onStatusFilter,
  hasActiveFilters,
  onClearFilters,
  count,
  totals,
  pendingCount,
  autoMutation,
  onShowShortcuts,
  bulkActions,
}: FilterBarProps) {
  const category = categoryFilter ? categories.find((c) => c.id === categoryFilter) : undefined
  const tag = tagFilter ? tags.find((t) => t.id === tagFilter) : undefined
  const { expenseTotal, incomeTotal } = totals

  return (
    <div className="toolbar" style={{ marginTop: 8 }}>
      {category && (
        <span className="chip on">
          {category.name}
          <button
            type="button"
            aria-label="Remove category filter"
            onClick={() => onCategoryFilter('')}
            className="chip-x"
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      )}
      {tag && (
        <span className="chip on">
          {tag.name}
          <button
            type="button"
            aria-label="Remove tag filter"
            onClick={() => onTagFilter('')}
            className="chip-x"
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      )}
      {statusFilter === 'income' && (
        <span className="chip on">
          Income only
          <button
            type="button"
            aria-label="Remove income filter"
            onClick={() => onStatusFilter('all')}
            className="chip-x"
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      )}
      {statusFilter === 'processed' && (
        <span className="chip on">
          Processed only
          <button
            type="button"
            aria-label="Remove processed filter"
            onClick={() => onStatusFilter('all')}
            className="chip-x"
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      )}
      {hasActiveFilters && (
        <button onClick={onClearFilters} className="btn ghost sm">
          Clear filters
        </button>
      )}

      <span className="small" data-testid="txn-summary">
        {count} transaction{count === 1 ? '' : 's'} ·{' '}
        {formatCurrency(expenseTotal, { fractionDigits: 0 })} out ·{' '}
        {formatCurrency(incomeTotal, { fractionDigits: 0 })} in
      </span>

      {statusFilter === 'pending' && pendingCount > 0 && (
        <button
          onClick={() => autoMutation.mutate(undefined)}
          disabled={autoMutation.isPending}
          className="btn ghost sm"
          title="Auto-categorise every pending transaction"
        >
          <Icon
            name={autoMutation.isPending ? 'progress_activity' : 'auto_awesome'}
            size={13}
            spin={autoMutation.isPending}
          />
          Auto-categorise
        </button>
      )}

      {bulkActions}

      <span className="push" />

      {/* Shortcuts hint — desktop only since mobile has no keyboard */}
      <span
        className="hidden items-center gap-1 text-[11px] md:inline-flex"
        style={{ color: 'var(--ink-4)', userSelect: 'none' }}
      >
        <Icon name="keyboard" size={12} />
        1–9 categorize · ↑↓ navigate ·{' '}
        <button
          onClick={onShowShortcuts}
          className="btn ghost"
          style={{
            padding: '1px 5px',
            fontSize: 10,
            height: 'auto',
            minHeight: 0,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
            background: 'var(--surface-2)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--ink-3)',
            lineHeight: 1.4,
          }}
          title="Show keyboard shortcuts"
          aria-label="Show keyboard shortcuts"
        >
          ?
        </button>
      </span>
    </div>
  )
}
