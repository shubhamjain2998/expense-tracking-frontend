import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { formatYearLabel, monthLongLabel } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'
import type { Category, Tag } from '@/types/settings'

import type { StatusFilter } from '../types'

import { ImportMenu } from './ImportMenu'

interface TransactionsHeaderProps {
  statusFilter: StatusFilter
  onStatusFilter: (f: StatusFilter) => void
  allCount: number
  pendingCount: number
  search: string
  onSearch: (v: string) => void
  year: number
  month: number
  mode: PeriodMode
  onPrevMonth: () => void
  onNextMonth: () => void
  categories: Category[]
  categoryFilter: string[]
  onCategoryFilter: (ids: string[]) => void
  tags: Tag[]
  tagFilter: string[]
  onTagFilter: (ids: string[]) => void
  onAdd: () => void
}

/**
 * Toolbar row 1 (design-mock/ledger/transactions.html): status segmented
 * control, search, period stepper, a Filters popover (category / tag /
 * income-only / processed-only — the filter dimensions that don't have a
 * dedicated segmented tab), the Import menu, and the primary Add button.
 * Row 2 (chips, summary, bulk actions) is `FilterBar`.
 */
export function TransactionsHeader({
  statusFilter,
  onStatusFilter,
  allCount,
  pendingCount,
  search,
  onSearch,
  year,
  month,
  mode,
  onPrevMonth,
  onNextMonth,
  categories,
  categoryFilter,
  onCategoryFilter,
  tags,
  tagFilter,
  onTagFilter,
  onAdd,
}: TransactionsHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)
  const filtersRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!showFilters) return
    function handleClick(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFilters])

  const isExtraStatus = statusFilter === 'income' || statusFilter === 'processed'
  // Counts VALUES, not filter types — two categories + one tag = 3, not 2.
  const activeFilterCount = categoryFilter.length + tagFilter.length + (isExtraStatus ? 1 : 0)

  return (
    <div className="toolbar">
      <span className="seg" role="group" aria-label="Status">
        <button
          type="button"
          aria-pressed={statusFilter === 'all'}
          className={statusFilter === 'all' ? 'on' : ''}
          onClick={() => onStatusFilter('all')}
        >
          All <span className="badge quiet">{allCount}</span>
        </button>
        <button
          type="button"
          aria-pressed={statusFilter === 'pending'}
          className={statusFilter === 'pending' ? 'on' : ''}
          onClick={() => onStatusFilter('pending')}
        >
          Needs review {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
        </button>
        <button
          type="button"
          aria-pressed={statusFilter === 'split'}
          className={statusFilter === 'split' ? 'on' : ''}
          onClick={() => onStatusFilter('split')}
        >
          Split
        </button>
      </span>

      <span className="field grow">
        <Icon name="search" size={14} />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search merchant, notes, amount…"
          aria-label="Search transactions"
        />
      </span>

      <div className="ym-nav">
        <button onClick={onPrevMonth} className="btn ghost ym-nav-btn" aria-label="Previous month">
          <Icon name="chevron_left" size={16} />
        </button>
        <span className="ym-nav-label num">
          {monthLongLabel(month, mode).slice(0, 3)} {formatYearLabel(year, mode)}
        </span>
        <button onClick={onNextMonth} className="btn ghost ym-nav-btn" aria-label="Next month">
          <Icon name="chevron_right" size={16} />
        </button>
      </div>

      <span className="menu-wrap" ref={filtersRef}>
        <button
          type="button"
          className="btn"
          aria-expanded={showFilters}
          aria-haspopup="menu"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Icon name="filter_alt" size={14} />
          Filters {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}
        </button>
        {showFilters && (
          <div className="menu" role="menu" style={{ minWidth: 260 }}>
            <div style={{ padding: '6px 10px' }}>
              <MultiSelect
                label="Category"
                items={[...categories].sort((a, b) => a.name.localeCompare(b.name))}
                selectedIds={categoryFilter}
                onChange={onCategoryFilter}
                icon="category"
                itemIcon="category"
                placeholder="Search categories…"
                showInitials={false}
              />
            </div>
            {tags.length > 0 && (
              <div style={{ padding: '6px 10px' }}>
                <MultiSelect
                  label="Tag"
                  items={[...tags].sort((a, b) => a.name.localeCompare(b.name))}
                  selectedIds={tagFilter}
                  onChange={onTagFilter}
                  icon="tag"
                  itemIcon="tag"
                  placeholder="Search tags…"
                  showInitials={false}
                />
              </div>
            )}
            <div style={{ padding: '6px 10px', display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={statusFilter === 'income' ? 'chip accent' : 'chip'}
                onClick={() => onStatusFilter(statusFilter === 'income' ? 'all' : 'income')}
              >
                Income only
              </button>
              <button
                type="button"
                className={statusFilter === 'processed' ? 'chip accent' : 'chip'}
                onClick={() => onStatusFilter(statusFilter === 'processed' ? 'all' : 'processed')}
              >
                Processed only
              </button>
            </div>
          </div>
        )}
      </span>

      <ImportMenu />

      <button onClick={onAdd} className="btn primary" aria-label="Add transaction">
        <Icon name="add" size={14} />
        <span className="desktop-only">Add</span>
      </button>
    </div>
  )
}
