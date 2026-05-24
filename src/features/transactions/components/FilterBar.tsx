import type { UseMutationResult } from '@tanstack/react-query'

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
  // FilterBar only calls mutate() and reads isPending — decouple from data shape.
  autoMutation: Pick<UseMutationResult<unknown, { detail: string }, void>, 'mutate' | 'isPending'>
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
        <span
          className="material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          style={{ fontSize: 14, color: 'var(--ink-4)' }}
        >
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search merchant…"
          className="input"
          style={{ paddingLeft: 28 }}
        />
      </div>

      {/* Status tabs — horizontal scroll on mobile so all five fit */}
      <div
        className="flex max-w-full items-center overflow-x-auto"
        style={{
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
        }}
      >
        {(['all', 'pending', 'income', 'processed', 'split'] as StatusFilter[]).map((f, i, arr) => (
          <button
            key={f}
            onClick={() => onStatusFilter(f)}
            className="flex items-center gap-1.5"
            style={{
              height: 30,
              padding: '0 11px',
              fontSize: 12.5,
              fontWeight: 500,
              background: statusFilter === f ? 'var(--ink)' : 'transparent',
              color: statusFilter === f ? 'var(--bg)' : 'var(--ink-3)',
              border: 'none',
              cursor: 'pointer',
              borderRight: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
              transition: 'background 0.1s, color 0.1s',
              textTransform: 'capitalize',
            }}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span
                style={{
                  background:
                    statusFilter === 'pending' ? 'rgba(255,255,255,0.18)' : 'var(--warn-soft)',
                  color: statusFilter === 'pending' ? 'inherit' : 'var(--warn)',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  lineHeight: 1.4,
                }}
              >
                {pendingCount}
              </span>
            )}
            {f === 'income' && incomeCount > 0 && (
              <span
                style={{
                  background:
                    statusFilter === 'income' ? 'rgba(255,255,255,0.18)' : 'var(--pos-soft)',
                  color: statusFilter === 'income' ? 'inherit' : 'var(--pos)',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  lineHeight: 1.4,
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
        onClick={() => autoMutation.mutate()}
        disabled={autoMutation.isPending}
        className="btn ghost sm"
        title="Auto-categorise pending transactions"
      >
        <span
          className={`material-symbols-outlined ${autoMutation.isPending ? 'animate-spin' : ''}`}
          style={{ fontSize: 14 }}
        >
          {autoMutation.isPending ? 'progress_activity' : 'auto_awesome'}
        </span>
        Auto-categorise
      </button>

      {/* Shortcuts hint — desktop only since mobile has no keyboard */}
      <span
        className="hidden items-center gap-1 text-[11px] md:inline-flex"
        style={{ color: 'var(--ink-4)', userSelect: 'none' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
          keyboard
        </span>
        1–9 categorize · ↑↓ navigate
      </span>
    </div>
  )
}
