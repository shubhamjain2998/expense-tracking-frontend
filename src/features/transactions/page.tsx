import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AddTransactionDialog } from '@/components/ui/AddTransactionDialog'
import { Icon } from '@/components/ui/Icon'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import { useToastContext } from '@/hooks/useToastContext'
import { getPendingManual } from '@/lib/api/transactions'
import { pendingTransactionsUrl } from '@/lib/pendingNav'
import { getCurrentPeriod, loadPeriodMode, monthLongLabel } from '@/lib/period'
import { qk } from '@/lib/queryKeys'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { BulkActionsBar } from './components/BulkActionsBar'
import { DragDropCategoryGrid } from './components/DragDropCategoryGrid'
import { FilterBar } from './components/FilterBar'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { TransactionsHeader } from './components/TransactionsHeader'
import { TransactionsList } from './components/TransactionsList'
import { useAutoCategorise } from './hooks/useAutoCategorise'
import { useProcessedMutations } from './hooks/useProcessedMutations'
import { useRawMutations } from './hooks/useRawMutations'
import { useTransactionKeyboard } from './hooks/useTransactionKeyboard'
import { useTransactionsData } from './hooks/useTransactionsData'
import { buildUnified } from './lib/buildUnified'
import { formatAmount, txnTotals } from './lib/txnFormat'
import type { SortCol, SortDir, StatusFilter } from './types'

export function TransactionsPage() {
  const { mode } = usePeriodMode()
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = getCurrentPeriod(loadPeriodMode())

  const year = Number(searchParams.get('year')) || initial.year
  const month = Number(searchParams.get('month')) || initial.month

  function setMonth(m: number) {
    setSearchParams(
      (p) => {
        p.set('month', String(m))
        return p
      },
      { replace: true }
    )
  }

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<ProcessedTransactionItem | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null)
  const [draggingUids, setDraggingUids] = useState<Set<string>>(new Set())
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null)
  const [checkedUids, setCheckedUids] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const navigate = useNavigate()
  const toast = useToastContext()
  const { rawQuery, processedQuery, categoriesQuery, tagsQuery } = useTransactionsData(
    year,
    month,
    categoryFilter,
    tagFilter,
    mode,
    showDeleted
  )
  const { deleteRawMutation, restoreRawMutation, handleBulkDelete } = useRawMutations(
    year,
    month,
    mode,
    selectedUid,
    setSelectedUid
  )
  const { deleteProcMutation, quickCategorizeMutation, changeCategoryMutation } =
    useProcessedMutations(year, month, mode)
  const { autoMutation } = useAutoCategorise()

  // Global pending count — same query key as useSidebarStats, so it's served
  // from cache on most page loads (zero extra network requests).
  const pendingManualQuery = useQuery({
    queryKey: qk.transactions.pendingManual(),
    queryFn: getPendingManual,
    staleTime: 60_000,
  })
  const allPendingItems = pendingManualQuery.data ?? []

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
  const incomeCount = allTxns.filter((t) => t.kind !== 'deleted' && t.txnType === 'income').length
  const deletedCount = allTxns.filter((t) => t.kind === 'deleted').length
  // Heading reflects the active tab/filter so the count and sum match the
  // visible table (e.g. "Processed" tab shows the processed-only total).
  const visibleForHeading = filtered.filter((t) => t.kind !== 'deleted')
  const headingCount = visibleForHeading.length
  const headingTotals = txnTotals(visibleForHeading)
  const hasActiveFilters = !!(search || categoryFilter || tagFilter)
  const selectedTxn = selectedUid ? filtered.find((t) => t.uid === selectedUid) : null
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
      const [y, m] = item.txn_date.split('-').map(Number)
      return y !== year || m !== month
    })
  const pendingElsewhereUrl = pendingInOtherMonths ? pendingTransactionsUrl(allPendingItems) : null

  function prevMonth() {
    setSelectedUid(null)
    setEditingTxn(null)
    setCheckedUids(new Set())
    if (month === 1) {
      setSearchParams(
        (p) => {
          p.set('year', String(year - 1))
          p.set('month', '12')
          return p
        },
        { replace: true }
      )
    } else {
      setMonth(month - 1)
    }
  }
  function nextMonth() {
    setSelectedUid(null)
    setEditingTxn(null)
    setCheckedUids(new Set())
    if (month === 12) {
      setSearchParams(
        (p) => {
          p.set('year', String(year + 1))
          p.set('month', '1')
          return p
        },
        { replace: true }
      )
    } else {
      setMonth(month + 1)
    }
  }

  function findBaseContext(description: string) {
    const base = (processedQuery.data ?? [])
      .filter((p) => p.description === description)
      .sort((a, b) => b.txn_date.localeCompare(a.txn_date))[0]
    if (!base) return {}
    return {
      shares: base.shares.map((s) => ({
        person_id: s.person_id,
        share_type: s.share_type as 'percentage' | 'amount',
        share_value: Number(s.share_value),
      })),
      notes: base.notes ?? undefined,
      tag_ids: base.tags.map((t) => t.id),
    }
  }

  function handleDragStart(uid: string, e: React.DragEvent) {
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
    setDraggingUids(new Set())
    setDragOverCatId(null)
  }
  async function handleDropOnCategory(categoryId: string) {
    if (draggingUids.size === 0) return
    const uids = Array.from(draggingUids)
    const isMulti = uids.length > 1

    // Single-drop fast path keeps the prior toast/UX exactly the same.
    if (!isMulti) {
      const txn = allTxns.find((t) => t.uid === uids[0])
      if (!txn) {
        setDraggingUids(new Set())
        setDragOverCatId(null)
        return
      }
      if (txn.kind === 'pending' && txn.rawId)
        quickCategorizeMutation.mutate({
          rawId: txn.rawId,
          categoryId,
          ...findBaseContext(txn.description),
        })
      else if (txn.kind === 'processed' && txn.processedId)
        changeCategoryMutation.mutate({ procId: txn.processedId, categoryId })
      if (txn.kind === 'pending') setSelectedUid(null)
      setDraggingUids(new Set())
      setDragOverCatId(null)
      return
    }

    // Multi-drop: dispatch in parallel, suppress per-row toasts, show one summary.
    const tasks = uids
      .map((uid) => allTxns.find((t) => t.uid === uid))
      .filter((txn): txn is NonNullable<typeof txn> => !!txn)
      .map((txn) => {
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

    setDraggingUids(new Set())
    setDragOverCatId(null)
    setSelectedUid(null)

    const results = await Promise.allSettled(tasks)
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - succeeded
    if (succeeded > 0)
      toast.success(`Categorized ${succeeded} transaction${succeeded === 1 ? '' : 's'}`)
    if (failed > 0)
      toast.error(`Failed to categorize ${failed} transaction${failed === 1 ? '' : 's'}`)
    if (succeeded > 0) setCheckedUids(new Set())
  }

  useTransactionKeyboard({
    selectedUid,
    filtered,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: -4 }}>
      <TransactionsHeader
        year={year}
        month={month}
        mode={mode}
        allTxnsCount={headingCount}
        totals={headingTotals}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onManualEntry={() => setShowManualEntry(true)}
        onUpload={() => navigate('/upload')}
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        pendingCount={pendingCount}
        incomeCount={incomeCount}
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        tags={tagsQuery.data ?? []}
        tagFilter={tagFilter}
        onTagFilter={setTagFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearch('')
          setCategoryFilter('')
          setTagFilter('')
        }}
        autoMutation={autoMutation}
        onShowShortcuts={() => setShowShortcuts(true)}
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
              <Link to={pendingElsewhereUrl} className="btn sm" style={{ gap: 5, flexShrink: 0 }}>
                Go
                <Icon name="arrow_forward" size={12} />
              </Link>
            </div>
          )
        })()}
      {categories.length > 0 && (
        <DragDropCategoryGrid
          categories={categories}
          dragOverCatId={dragOverCatId}
          setDragOverCatId={setDragOverCatId}
          onDropOnCategory={handleDropOnCategory}
        />
      )}
      {checkedUids.size > 0 &&
        (() => {
          // Only PENDING rows can be auto-categorised. Filter the selection
          // down to their raw IDs so the backend's selective endpoint gets
          // exactly the rows the user expects.
          const pendingRawIds = filtered
            .filter((t) => t.kind === 'pending' && t.rawId && checkedUids.has(t.uid))
            .map((t) => t.rawId as string)

          async function handleBulkCategorise(categoryId: string) {
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
            if (failed > 0)
              toast.error(`Failed to categorise ${failed} transaction${failed === 1 ? '' : 's'}`)
          }

          return (
            <BulkActionsBar
              count={checkedUids.size}
              pendingCount={pendingRawIds.length}
              categories={categories}
              autoCategoriseLoading={autoMutation.isPending}
              onAutoCategorise={() =>
                autoMutation.mutate(pendingRawIds, {
                  onSettled: () => setCheckedUids(new Set()),
                })
              }
              onCategorise={handleBulkCategorise}
              onDelete={() => void handleBulkDelete(filtered, checkedUids, setCheckedUids)}
              onClear={() => setCheckedUids(new Set())}
            />
          )
        })()}
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
        showProcessPanel={showProcessPanel}
        showEditPanel={showEditPanel}
        selectedTxn={selectedTxn}
      />
      {showManualEntry && <AddTransactionDialog onClose={() => setShowManualEntry(false)} />}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
