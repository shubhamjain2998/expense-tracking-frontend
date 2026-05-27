import type { UseMutationResult } from '@tanstack/react-query'

import { Icon } from '@/components/ui/Icon'
import type { Category, Tag } from '@/types/settings'

import type { StatusFilter } from '../types'

interface FilterBarProps {
  search: string
  onSearch: (v: string) => void
  statusFilter: StatusFilter
  onStatusFilter: (f: StatusFilter) => void
  pendingCount: number
  incomeCount: number
  categories: Category[]
  categoryFilter: string
  onCategoryFilter: (v: string) => void
  tags: Tag[]
  tagFilter: string
  onTagFilter: (v: string) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  // FilterBar only calls mutate() (no args — sweeps all pending) and reads
  // isPending. Variables type matches `useAutoCategorise`'s optional rawTxnIds,
  // so the unparameterised call here resolves to "categorise everything".
  autoMutation: Pick<
    UseMutationResult<unknown, { detail: string }, string[] | undefined>,
    'mutate' | 'isPending'
  >
}

export function FilterBar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  pendingCount,
  incomeCount,
  categories,
  categoryFilter,
  onCategoryFilter,
  tags,
  tagFilter,
  onTagFilter,
  hasActiveFilters,
  onClearFilters,
  autoMutation,
}: FilterBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}
    >
      {/* Search */}
      <div className="relative w-full md:w-[210px]">
        <Icon
          name="search"
          size={14}
          style={{ color: 'var(--ink-4)' }}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search merchant…"
          className="input"
          style={{ paddingLeft: 28 }}
        />
      </div>

      {/* Status tabs — underline-style, horizontal scroll on mobile */}
      <div className="seg tabs max-w-full overflow-x-auto">
        {(['all', 'pending', 'income', 'processed', 'split'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => onStatusFilter(f)}
            className={`capitalize ${statusFilter === f ? 'on' : ''}`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span
                className="ml-1.5 rounded-[4px] px-1.5 text-[10px] leading-[1.4] font-bold"
                style={{
                  background: 'var(--warn-soft)',
                  color: 'var(--warn)',
                }}
              >
                {pendingCount}
              </span>
            )}
            {f === 'income' && incomeCount > 0 && (
              <span
                className="ml-1.5 rounded-[4px] px-1.5 text-[10px] leading-[1.4] font-bold"
                style={{
                  background: 'var(--pos-soft)',
                  color: 'var(--pos)',
                }}
              >
                {incomeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilter(e.target.value)}
        className="input"
        style={{ width: 'auto' }}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {[...categories]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>

      {/* Tag filter */}
      {tags.length > 0 && (
        <select
          value={tagFilter}
          onChange={(e) => onTagFilter(e.target.value)}
          className="input"
          style={{ width: 'auto' }}
          aria-label="Filter by tag"
        >
          <option value="">All tags</option>
          {[...tags]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      )}

      {hasActiveFilters && (
        <button onClick={onClearFilters} className="btn ghost sm">
          Clear filters
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Auto-categorise */}
      <button
        onClick={() => autoMutation.mutate(undefined)}
        disabled={autoMutation.isPending}
        className="btn ghost sm"
        title="Auto-categorise pending transactions"
      >
        <Icon
          name={autoMutation.isPending ? 'progress_activity' : 'auto_awesome'}
          size={14}
          spin={autoMutation.isPending}
        />
        Auto-categorise
      </button>

      {/* Shortcuts hint — desktop only since mobile has no keyboard */}
      <span
        className="hidden items-center gap-1 text-[11px] md:inline-flex"
        style={{ color: 'var(--ink-4)', userSelect: 'none' }}
      >
        <Icon name="keyboard" size={12} />
        1–9 categorize · ↑↓ navigate
      </span>
    </div>
  )
}
