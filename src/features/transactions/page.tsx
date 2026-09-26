import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { AddTransactionDialog } from '@/components/ui/AddTransactionDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { useWorldSupported } from '@/components/world/support'
import { IgnoreRulesSection } from '@/features/settings/components/IgnoreRulesSection'
import { MappingsSection } from '@/features/settings/components/MappingsSection'
import { usePeriod } from '@/hooks/usePeriod'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useThemeContext } from '@/hooks/useThemeContext'
import { useToastContext } from '@/hooks/useToastContext'
import { getCategoryMappings } from '@/lib/api/categories'
import { getPendingManual } from '@/lib/api/transactions'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import { calendarToPeriod, monthLongLabel, resolvePeriodMonth } from '@/lib/period'
import { qk } from '@/lib/queryKeys'
import { getMultiParam } from '@/lib/searchParams'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { BulkActionsBar } from './components/BulkActionsBar'
import { CopyToMonthDialog } from './components/CopyToMonthDialog'
import { DragDropOverlay } from './components/DragDropOverlay'
import { FilterBar } from './components/FilterBar'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { MergeDialog } from './components/MergeDialog'
import { TransactionsHeader } from './components/TransactionsHeader'
import { TransactionsList } from './components/TransactionsList'
import { TransactionsTabs } from './components/TransactionsTabs'
import type { TxnTab } from './components/TransactionsTabs'
import { useAutoCategorise } from './hooks/useAutoCategorise'
import { useCopyTransaction } from './hooks/useCopyTransaction'
import { useProcessedMutations } from './hooks/useProcessedMutations'
import { useRawMutations } from './hooks/useRawMutations'
import { useTransactionKeyboard } from './hooks/useTransactionKeyboard'
import { useTransactionsData } from './hooks/useTransactionsData'
import { buildUnified } from './lib/buildUnified'
import { formatAmount, txnTotals } from './lib/txnFormat'
import type { SortCol, SortDir, StatusFilter, UnifiedTxn } from './types'
import { buildSkyline } from './world/skyline'
import { SkylineHero } from './world/SkylineHero'
import './transactions.css'

/**
 * Per-row failures in a bulk action are reported with the server's own
 * reason, not just a count. The rows are dispatched in parallel and their
 * toasts suppressed, so without this the user is told "Failed to categorise
 * 1 transaction" and has nothing to act on.
 */
function bulkFailureMessage(
  verb: string,
  failed: number,
  results: PromiseSettledResult<unknown>[]
): string {
  const base = `Failed to ${verb} ${failed} transaction${failed === 1 ? '' : 's'}`
  const first = results.find((r) => r.status === 'rejected')
  const detail =
    first && first.status === 'rejected'
      ? ((first.reason as { detail?: string } | undefined)?.detail ?? '')
      : ''
  return detail ? `${base} — ${detail}` : base
}

export function TransactionsPage() {
  const { mode } = usePeriodMode()
  const [searchParams, setSearchParams] = useSearchParams()
  const { year, month, setPeriod } = usePeriod()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  // URL-driven, multi-value — supports both repeated (`?category=a&category=b`)
  // and comma-separated (`?category=a,b`) params so an older single-value
  // link (Category's "Open in Transactions") still pre-filters correctly.
  // Semantics: OR within a filter type, AND across types — see `filtered`
  // below.
  const categoryFilter = getMultiParam(searchParams, 'category')
  function setCategoryFilter(ids: string[]) {
    setSearchParams(
      (p) => {
        p.delete('category')
        for (const id of ids) p.append('category', id)
        return p
      },
      { replace: true }
    )
  }
  const tagFilter = getMultiParam(searchParams, 'tag')
  function setTagFilter(ids: string[]) {
    setSearchParams(
      (p) => {
        p.delete('tag')
        for (const id of ids) p.append('tag', id)
        return p
      },
      { replace: true }
    )
  }
  const [showDeleted, setShowDeleted] = useState(false)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<ProcessedTransactionItem | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [copyingTxn, setCopyingTxn] = useState<UnifiedTxn | null>(null)
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null)
  const [draggingUids, setDraggingUids] = useState<Set<string>>(new Set())
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null)
  const [checkedUids, setCheckedUids] = useState<Set<string>>(new Set())
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null)
  const [pendingTagIds, setPendingTagIds] = useState<Set<string>>(new Set())
  const droppedOnCategoryRef = useRef(false)
  const [sortCol, setSortCol] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [activeTab, setActiveTab] = useState<TxnTab>('transactions')

  function handleTabChange(tab: TxnTab) {
    setActiveTab(tab)
    if (tab !== 'transactions') {
      setSelectedUid(null)
      setEditingTxn(null)
    }
  }

  const toast = useToastContext()
  // Category/tag filtering (single- or multi-value) happens entirely
  // client-side below — the processed query always fetches the whole month
  // unfiltered, both because the backend only takes one category_id/tag_id
  // and because a single shared cache entry per (year, month, mode) is
  // simpler to keep correctly invalidated (see useProcessedMutations).
  const { rawQuery, processedQuery, categoriesQuery, tagsQuery } = useTransactionsData(
    year,
    month,
    mode,
    showDeleted
  )
  // Rules, for the context a drag-to-category applies. Small list, cached
  // across the app under the same key the settings page uses.
  const mappingsQuery = useQuery({
    queryKey: qk.categoryMappings.all,
    queryFn: getCategoryMappings,
  })
  const { deleteRawMutation, restoreRawMutation, handleBulkDelete } = useRawMutations(
    year,
    month,
    mode,
    selectedUid,
    setSelectedUid
  )
  const {
    deleteProcMutation,
    quickCategorizeMutation,
    changeCategoryMutation,
    unprocessMutation,
    mergeMutation,
  } = useProcessedMutations(year, month, mode)
  const { autoMutation } = useAutoCategorise()
  // A copy usually lands in a month the user is not looking at, so the toast
  // offers to go there. `txn_date` is a calendar date; the period selector
  // speaks period units, which differ under FY mode.
  const copyMutation = useCopyTransaction({
    onViewMonth: (calYear, calMonth) => {
      const p = calendarToPeriod(calYear, calMonth, mode)
      setSelectedUid(null)
      setEditingTxn(null)
      setCheckedUids(new Set())
      setPeriod(p.year, p.month)
    },
  })

  // Global pending count — same query key as useSidebarStats, so it's served
  // from cache on most page loads (zero extra network requests).
  const pendingManualQuery = useQuery({
    queryKey: qk.transactions.pendingManual(),
    queryFn: getPendingManual,
    staleTime: 60_000,
  })
  const allPendingItems = pendingManualQuery.data ?? []

  // ── 3D skyline hero (wide screens with WebGL) ──────────────────────────────
  // The whole month by day, whatever the filters: its own buildUnified so it
  // is memoised on the query data rather than rebuilt every render.
  const worldSupported = useWorldSupported()
  const { isDark } = useThemeContext()
  const cal = resolvePeriodMonth(year, month, mode)
  const skylineMonthLabel = `${monthLongLabel(cal.month, 'calendar')} ${cal.year}`
  const skyline = useMemo(
    () =>
      rawQuery.data && processedQuery.data
        ? buildSkyline(buildUnified(rawQuery.data, processedQuery.data), cal.year, cal.month)
        : null,
    [rawQuery.data, processedQuery.data, cal.year, cal.month]
  )

  const categories = categoriesQuery.data ?? []
  const shortcutCats = categories.slice(0, 9)
  const isLoading = rawQuery.isLoading || processedQuery.isLoading
  const allTxns = buildUnified(rawQuery.data ?? [], processedQuery.data ?? [])

  const filtered = allTxns.filter((t) => {
    if (t.kind === 'deleted' && !showDeleted) return false
    if (search) {
      const q = search.toLowerCase()
      const amtFormatted = formatAmount(t.effectiveAmount, t.txnType).display.toLowerCase()
      const amtRaw = String(Math.abs(Number(t.effectiveAmount)))
      const matchesSearch =
        t.description.toLowerCase().includes(q) ||
        (t.notes ?? '').toLowerCase().includes(q) ||
        amtRaw.includes(q) ||
        amtFormatted.includes(q)
      if (!matchesSearch) return false
    }
    if (statusFilter === 'pending' && t.kind !== 'pending') return false
    if (statusFilter === 'income' && t.txnType !== 'income') return false
    if (statusFilter === 'processed' && t.kind !== 'processed') return false
    if (statusFilter === 'split' && t.shares.length === 0) return false
    // Multi-value category/tag filters: OR within a filter type (any
    // selected category/tag matches), AND across types and the other
    // filters above. Pending rows have neither yet, so they're excluded
    // whenever either filter is active.
    if (categoryFilter.length > 0 && (!t.categoryId || !categoryFilter.includes(t.categoryId)))
      return false
    if (tagFilter.length > 0 && !t.tags.some((tag) => tagFilter.includes(tag.id))) return false
    return true
  })

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir(col === 'amount' || col === 'split' ? 'desc' : 'asc')
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'date') cmp = a.txn_date.localeCompare(b.txn_date)
    else if (sortCol === 'merchant') cmp = a.description.localeCompare(b.description)
    else if (sortCol === 'category') cmp = (a.category ?? '').localeCompare(b.category ?? '')
    else if (sortCol === 'tags') {
      // Sort by first tag name; rows with no tags go to the end of the asc list.
      const ta = a.tags[0]?.name ?? ''
      const tb = b.tags[0]?.name ?? ''
      if (ta === '' && tb !== '') cmp = 1
      else if (ta !== '' && tb === '') cmp = -1
      else cmp = ta.localeCompare(tb)
    } else if (sortCol === 'split') cmp = a.shares.length - b.shares.length
    else if (sortCol === 'amount')
      cmp = Math.abs(Number(a.effectiveAmount)) - Math.abs(Number(b.effectiveAmount))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const pendingCount = allTxns.filter((t) => t.kind === 'pending').length
  const deletedCount = allTxns.filter((t) => t.kind === 'deleted').length
  const allCount = allTxns.filter((t) => t.kind !== 'deleted').length
  // Heading reflects the active tab/filter so the count and sum match the
  // visible table (e.g. "Processed" tab shows the processed-only total).
  const visibleForHeading = filtered.filter((t) => t.kind !== 'deleted')
  const headingCount = visibleForHeading.length
  const headingTotals = txnTotals(visibleForHeading)
  const hasActiveFilters = !!(search || categoryFilter.length > 0 || tagFilter.length > 0)
  const selectedTxn = selectedUid ? filtered.find((t) => t.uid === selectedUid) : null
  // The checked rows, in list order, for the merge dialog. Deleted rows are
  // dropped — there is nothing to club into a live row.
  const mergeCandidates = sorted.filter((t) => checkedUids.has(t.uid) && t.kind !== 'deleted')
  const showProcessPanel =
    selectedTxn?.kind === 'pending' && !!selectedTxn.rawOriginal && !editingTxn
  const showEditPanel = !!editingTxn

  // Show a banner when the current month is empty but pending items exist in
  // other months.  We only show it after queries have settled so we don't
  // flash a false positive while data is loading.
  const pendingInOtherMonths =
    !isLoading &&
    !pendingManualQuery.isLoading &&
    allTxns.length === 0 &&
    allPendingItems.length > 0 &&
    allPendingItems.some((item) => {
      const [calY, calM] = item.txn_date.split('-').map(Number)
      // txn_date is a calendar date; `year`/`month` are period values.
      const p = calendarToPeriod(calY, calM, mode)
      return p.year !== year || p.month !== month
    })
  const pendingElsewhereUrl = pendingInOtherMonths
    ? pendingTransactionsUrl(allPendingItems, mode)
    : null

  function prevMonth() {
    setSelectedUid(null)
    setEditingTxn(null)
    setCheckedUids(new Set())
    if (month === 1) {
      setPeriod(year - 1, 12)
    } else {
      setPeriod(year, month - 1)
    }
  }
  function nextMonth() {
    setSelectedUid(null)
    setEditingTxn(null)
    setCheckedUids(new Set())
    if (month === 12) {
      setPeriod(year + 1, 1)
    } else {
      setPeriod(year, month + 1)
    }
  }

  // The saved rule for a description, if there is one. This used to guess at
  // context by scanning whichever processed transactions happened to be in
  // the cache, so dragging the same row gave different results depending on
  // which month was open. Rules are the one place that context lives now, and
  // they are what auto-categorise reads too.
  function findBaseContext(description: string) {
    const pattern = description.trim().toLowerCase()
    const rule = (mappingsQuery.data ?? []).find(
      (m) => m.description_pattern.trim().toLowerCase() === pattern
    )
    if (!rule) return {}
    return {
      shares: rule.shares.map((s) => ({
        person_id: s.person_id,
        share_type: s.share_type,
        share_value: Number(s.share_value),
      })),
      tag_ids: rule.tags.map((t) => t.id),
    }
  }

  function handleDragStart(uid: string, e: React.DragEvent) {
    droppedOnCategoryRef.current = false
    // If the dragged row is part of a multi-select, drag all checked rows.
    // Otherwise drag just the row the user grabbed — preserves the
    // single-row workflow when no checkboxes are involved.
    const uids =
      checkedUids.has(uid) && checkedUids.size > 1 ? new Set(checkedUids) : new Set([uid])
    setDraggingUids(uids)
    setOpenMenuUid(null)

    if (uids.size > 1) {
      const ghost = document.createElement('div')
      ghost.style.cssText = [
        'position:absolute',
        'top:-9999px',
        'left:-9999px',
        'display:inline-flex',
        'align-items:center',
        'gap:8px',
        'padding:8px 14px',
        'background:var(--accent)',
        'color:white',
        'border-radius:var(--radius)',
        'font-size:13px',
        'font-weight:600',
        'box-shadow:0 4px 12px rgba(0,0,0,0.18)',
        'font-family:var(--font-sans)',
      ].join(';')
      ghost.textContent = `${uids.size} transactions`
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 12, 12)
      // Defer removal so the browser has time to snapshot the element.
      setTimeout(() => ghost.remove(), 0)
    }
  }
  function handleDragEnd() {
    setDragOverCatId(null)
    if (!droppedOnCategoryRef.current) {
      // Dropped outside the overlay — cancel the whole drag
      setDraggingUids(new Set())
    }
    droppedOnCategoryRef.current = false
  }

  function handleDropOnCategory(categoryId: string) {
    droppedOnCategoryRef.current = true
    setPendingCategoryId(categoryId)
  }

  function handleToggleTag(tagId: string) {
    setPendingTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  function handleCancelPending() {
    setPendingCategoryId(null)
    setPendingTagIds(new Set())
    setDraggingUids(new Set())
    setDragOverCatId(null)
  }

  async function handleApply(categoryId: string, tagIds: string[]) {
    const uids = Array.from(draggingUids)
    const isMulti = uids.length > 1

    setPendingCategoryId(null)
    setPendingTagIds(new Set())
    setDraggingUids(new Set())
    setDragOverCatId(null)

    if (!isMulti) {
      const txn = allTxns.find((t) => t.uid === uids[0])
      if (!txn) return
      const baseCtx = findBaseContext(txn.description)
      if (txn.kind === 'pending' && txn.rawId)
        quickCategorizeMutation.mutate({
          rawId: txn.rawId,
          categoryId,
          shares: baseCtx.shares,
          tag_ids: tagIds.length > 0 ? tagIds : baseCtx.tag_ids,
        })
      else if (txn.kind === 'processed' && txn.processedId)
        changeCategoryMutation.mutate({
          procId: txn.processedId,
          categoryId,
          tag_ids: tagIds.length > 0 ? tagIds : undefined,
        })
      if (txn.kind === 'pending') setSelectedUid(null)
      return
    }

    // Multi-row: dispatch in parallel, suppress per-row toasts, show one summary.
    const tasks = uids
      .map((uid) => allTxns.find((t) => t.uid === uid))
      .filter((txn): txn is NonNullable<typeof txn> => !!txn)
      .map((txn) => {
        if (txn.kind === 'pending' && txn.rawId) {
          const baseCtx = findBaseContext(txn.description)
          return quickCategorizeMutation.mutateAsync({
            rawId: txn.rawId,
            categoryId,
            shares: baseCtx.shares,
            tag_ids: tagIds.length > 0 ? tagIds : baseCtx.tag_ids,
            silent: true,
          })
        }
        if (txn.kind === 'processed' && txn.processedId)
          return changeCategoryMutation.mutateAsync({
            procId: txn.processedId,
            categoryId,
            tag_ids: tagIds.length > 0 ? tagIds : undefined,
            silent: true,
          })
        return Promise.resolve()
      })

    setSelectedUid(null)

    const results = await Promise.allSettled(tasks)
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - succeeded
    if (succeeded > 0)
      toast.success(`Categorized ${succeeded} transaction${succeeded === 1 ? '' : 's'}`)
    if (failed > 0) toast.error(bulkFailureMessage('categorize', failed, results))
    if (succeeded > 0) setCheckedUids(new Set())
  }

  useTransactionKeyboard({
    selectedUid,
    rows: sorted,
    shortcutCats,
    editingTxn,
    setSelectedUid,
    setEditingTxn,
    quickCategorize: (p) => {
      const txn = filtered.find((t) => t.rawId === p.rawId && t.kind === 'pending')
      quickCategorizeMutation.mutate({ ...p, ...(txn ? findBaseContext(txn.description) : {}) })
    },
    changeCategory: (p) => changeCategoryMutation.mutate(p),
    onShowShortcuts: () => setShowShortcuts(true),
  })

  useEffect(() => {
    if (!openMenuUid) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-menu-uid]')) setOpenMenuUid(null)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openMenuUid])

  // Selection count + bulk actions — rendered inline in the toolbar's second
  // row (FilterBar) rather than as a floating bar. Kept as a variable (not
  // JSX inline) so the closures below stay readable.
  let bulkActionsNode: React.ReactNode = null
  if (checkedUids.size > 0) {
    // Only PENDING rows can be auto-categorised. Filter the selection down
    // to their raw IDs so the backend's selective endpoint gets exactly the
    // rows the user expects.
    const pendingRawIds = filtered
      .filter((t) => t.kind === 'pending' && t.rawId && checkedUids.has(t.uid))
      .map((t) => t.rawId as string)

    const handleBulkCategorise = async (categoryId: string) => {
      const selected = filtered.filter((t) => checkedUids.has(t.uid) && t.kind !== 'deleted')
      const tasks = selected.map((txn) => {
        if (txn.kind === 'pending' && txn.rawId)
          return quickCategorizeMutation.mutateAsync({
            rawId: txn.rawId,
            categoryId,
            silent: true,
            ...findBaseContext(txn.description),
          })
        if (txn.kind === 'processed' && txn.processedId)
          return changeCategoryMutation.mutateAsync({
            procId: txn.processedId,
            categoryId,
            silent: true,
          })
        return Promise.resolve()
      })
      const results = await Promise.allSettled(tasks)
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      if (succeeded > 0) {
        toast.success(`Categorised ${succeeded} transaction${succeeded === 1 ? '' : 's'}`)
        setCheckedUids(new Set())
      }
      if (failed > 0) toast.error(bulkFailureMessage('categorise', failed, results))
    }

    bulkActionsNode = (
      <BulkActionsBar
        count={checkedUids.size}
        pendingCount={pendingRawIds.length}
        categories={categories}
        autoCategoriseLoading={autoMutation.isPending}
        onAutoCategorise={() =>
          autoMutation.mutate(pendingRawIds, { onSettled: () => setCheckedUids(new Set()) })
        }
        onCategorise={handleBulkCategorise}
        onMerge={() => setShowMerge(true)}
        // Asks first: this deletes every checked row at once, with no undo.
        onDelete={() => setConfirmBulkDelete(true)}
        onClear={() => setCheckedUids(new Set())}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: -4 }}>
      <TransactionsTabs active={activeTab} onChange={handleTabChange} />

      {activeTab === 'mappings' && <MappingsSection />}
      {activeTab === 'ignore-rules' && <IgnoreRulesSection />}

      {activeTab === 'transactions' && (
        <>
          {worldSupported && (
            <SkylineHero model={skyline} monthLabel={skylineMonthLabel} isDark={isDark} />
          )}
          <TransactionsHeader
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            allCount={allCount}
            pendingCount={pendingCount}
            search={search}
            onSearch={setSearch}
            year={year}
            month={month}
            mode={mode}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            categories={categories}
            categoryFilter={categoryFilter}
            onCategoryFilter={setCategoryFilter}
            tags={tagsQuery.data ?? []}
            tagFilter={tagFilter}
            onTagFilter={setTagFilter}
            onAdd={() => setShowManualEntry(true)}
          />
          <FilterBar
            categories={categories}
            categoryFilter={categoryFilter}
            onCategoryFilter={setCategoryFilter}
            tags={tagsQuery.data ?? []}
            tagFilter={tagFilter}
            onTagFilter={setTagFilter}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={() => {
              setSearch('')
              // One combined setSearchParams call, not separate
              // setCategoryFilter([]) + setTagFilter([]) calls — each of
              // those independently reads the CURRENT search params and
              // replaces the URL wholesale, so calling both synchronously
              // has the second call clobber the first's update instead of
              // composing (identical hazard to why prevMonth/nextMonth set
              // year+month together instead of two separate calls).
              setSearchParams(
                (p) => {
                  p.delete('category')
                  p.delete('tag')
                  return p
                },
                { replace: true }
              )
            }}
            count={headingCount}
            totals={headingTotals}
            pendingCount={pendingCount}
            autoMutation={autoMutation}
            onShowShortcuts={() => setShowShortcuts(true)}
            bulkActions={bulkActionsNode}
          />
          {pendingElsewhereUrl &&
            (() => {
              // Compute a human-readable label for the target month (e.g. "April 2026").
              const latestPending = allPendingItems.reduce((max, item) =>
                item.txn_date > max.txn_date ? item : max
              )
              const [targetYear, targetMonth] = latestPending.txn_date.split('-').map(Number)
              const monthLabel = monthLongLabel(targetMonth, 'calendar')
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    margin: '0 0 4px',
                    background: 'var(--accent-soft)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid color-mix(in oklch, var(--accent) 20%, transparent)',
                  }}
                >
                  <Icon name="info" size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--accent)', flex: 1 }}>
                    {allPendingItems.length} pending transaction
                    {allPendingItems.length === 1 ? '' : 's'} in {monthLabel} {targetYear}
                  </span>
                  <Link
                    to={pendingElsewhereUrl}
                    className="btn sm"
                    style={{ gap: 5, flexShrink: 0 }}
                  >
                    Go
                    <Icon name="arrow_forward" size={12} />
                  </Link>
                </div>
              )
            })()}
          {/* Nothing to drag in an empty month, so no drop targets either. */}
          {categories.length > 0 && allCount > 0 && (
            <DragDropOverlay
              categories={categories}
              tags={tagsQuery.data ?? []}
              isDragging={draggingUids.size > 0 && pendingCategoryId === null}
              dragOverCatId={dragOverCatId}
              setDragOverCatId={setDragOverCatId}
              pendingCategoryId={pendingCategoryId}
              pendingTagIds={pendingTagIds}
              onDropOnCategory={handleDropOnCategory}
              onToggleTag={handleToggleTag}
              onApply={handleApply}
              onCancel={handleCancelPending}
            />
          )}
          <TransactionsList
            sorted={sorted}
            filtered={filtered}
            allTxns={allTxns}
            isLoading={isLoading}
            checkedUids={checkedUids}
            setCheckedUids={setCheckedUids}
            showDeleted={showDeleted}
            setShowDeleted={setShowDeleted}
            deletedCount={deletedCount}
            sortCol={sortCol}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            selectedUid={selectedUid}
            setSelectedUid={setSelectedUid}
            editingTxn={editingTxn}
            setEditingTxn={setEditingTxn}
            openMenuUid={openMenuUid}
            setOpenMenuUid={setOpenMenuUid}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            draggingUids={draggingUids}
            categories={categories}
            deleteRawMutation={deleteRawMutation}
            restoreRawMutation={restoreRawMutation}
            deleteProcMutation={deleteProcMutation}
            unprocessMutation={unprocessMutation}
            onCopyTxn={setCopyingTxn}
            showProcessPanel={showProcessPanel}
            showEditPanel={showEditPanel}
            selectedTxn={selectedTxn}
          />
          {copyingTxn && (
            <CopyToMonthDialog
              txn={copyingTxn}
              loading={copyMutation.isPending}
              onCancel={() => setCopyingTxn(null)}
              onCopy={(txnDate) =>
                copyMutation.mutate(
                  { source: copyingTxn, txnDate },
                  { onSuccess: () => setCopyingTxn(null) }
                )
              }
            />
          )}
          {showMerge && mergeCandidates.length > 1 && (
            <MergeDialog
              txns={mergeCandidates}
              loading={mergeMutation.isPending}
              onCancel={() => setShowMerge(false)}
              onMerge={(payload) =>
                mergeMutation.mutate(payload, {
                  onSuccess: () => {
                    setShowMerge(false)
                    setCheckedUids(new Set())
                    setSelectedUid(null)
                    setEditingTxn(null)
                  },
                })
              }
            />
          )}
          <ConfirmDialog
            isOpen={confirmBulkDelete && checkedUids.size > 0}
            title={`Delete ${checkedUids.size} transaction${checkedUids.size === 1 ? '' : 's'}?`}
            message="They move to this month’s deleted list. Restoring one sends it back to Needs review, uncategorised."
            confirmLabel="Delete"
            danger
            onCancel={() => setConfirmBulkDelete(false)}
            onConfirm={() => {
              setConfirmBulkDelete(false)
              void handleBulkDelete(filtered, checkedUids, setCheckedUids)
            }}
          />
          {showManualEntry && <AddTransactionDialog onClose={() => setShowManualEntry(false)} />}
          {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
        </>
      )}
    </div>
  )
}
