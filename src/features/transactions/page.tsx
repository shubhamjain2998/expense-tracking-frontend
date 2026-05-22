import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { usePeriodMode } from '@/hooks/usePeriodMode'
import { getCurrentPeriod, loadPeriodMode } from '@/lib/period'
import type { ProcessedTransactionItem } from '@/types/transaction'

import { BulkActionsBar } from './components/BulkActionsBar'
import { DragDropCategoryGrid } from './components/DragDropCategoryGrid'
import { FilterBar } from './components/FilterBar'
import { ManualEntryDialog } from './components/ManualEntryDialog'
import { TransactionsHeader } from './components/TransactionsHeader'
import { TransactionsList } from './components/TransactionsList'
import { useAutoCategorise } from './hooks/useAutoCategorise'
import { useProcessedMutations } from './hooks/useProcessedMutations'
import { useRawMutations } from './hooks/useRawMutations'
import { useTransactionKeyboard } from './hooks/useTransactionKeyboard'
import { useTransactionsData } from './hooks/useTransactionsData'
import { buildUnified } from './lib/buildUnified'
import { isIncome } from './lib/txnFormat'
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
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null)
  const [draggingUid, setDraggingUid] = useState<string | null>(null)
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null)
  const [checkedUids, setCheckedUids] = useState<Set<string>>(new Set())
  const [hoveredRowUid, setHoveredRowUid] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const navigate = useNavigate()
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

  const categories = categoriesQuery.data ?? []
  const shortcutCats = categories.slice(0, 9)
  const isLoading = rawQuery.isLoading || processedQuery.isLoading
  const allTxns = buildUnified(rawQuery.data ?? [], processedQuery.data ?? [])

  const filtered = allTxns.filter((t) => {
    if (t.kind === 'deleted' && !showDeleted) return false
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter === 'pending' && t.kind !== 'pending') return false
    if (statusFilter === 'income' && !isIncome(t.amount)) return false
    if (statusFilter === 'processed' && t.kind !== 'processed') return false
    if (statusFilter === 'split' && t.shares.length === 0) return false
    return true
  })

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir(col === 'amount' ? 'desc' : 'asc')
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'date') cmp = a.txn_date.localeCompare(b.txn_date)
    else if (sortCol === 'amount')
      cmp = Math.abs(Number(a.effectiveAmount)) - Math.abs(Number(b.effectiveAmount))
    else if (sortCol === 'category') cmp = (a.category ?? '').localeCompare(b.category ?? '')
    return sortDir === 'asc' ? cmp : -cmp
  })

  const pendingCount = allTxns.filter((t) => t.kind === 'pending').length
  const incomeCount = allTxns.filter((t) => t.kind !== 'deleted' && isIncome(t.amount)).length
  const deletedCount = allTxns.filter((t) => t.kind === 'deleted').length
  // Heading reflects the active tab/filter so the count and sum match the
  // visible table (e.g. "Processed" tab shows the processed-only total).
  const visibleForHeading = filtered.filter((t) => t.kind !== 'deleted')
  const headingCount = visibleForHeading.length
  const total = visibleForHeading.reduce((s, t) => s + Number(t.effectiveAmount), 0)
  const hasActiveFilters = !!(search || categoryFilter || tagFilter)
  const selectedTxn = selectedUid ? filtered.find((t) => t.uid === selectedUid) : null
  const showProcessPanel =
    selectedTxn?.kind === 'pending' && !!selectedTxn.rawOriginal && !editingTxn
  const showEditPanel = !!editingTxn

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

  function handleDragStart(uid: string) {
    setDraggingUid(uid)
    setOpenMenuUid(null)
  }
  function handleDragEnd() {
    setDraggingUid(null)
    setDragOverCatId(null)
  }
  function handleDropOnCategory(categoryId: string) {
    if (!draggingUid) return
    const txn = allTxns.find((t) => t.uid === draggingUid)
    if (!txn) return
    if (txn.kind === 'pending' && txn.rawId)
      quickCategorizeMutation.mutate({
        rawId: txn.rawId,
        categoryId,
        ...findBaseContext(txn.description),
      })
    else if (txn.kind === 'processed' && txn.processedId)
      changeCategoryMutation.mutate({ procId: txn.processedId, categoryId })
    if (txn.kind === 'pending') setSelectedUid(null)
    setDraggingUid(null)
    setDragOverCatId(null)
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
        total={total}
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
      />
      {categories.length > 0 && (
        <DragDropCategoryGrid
          categories={categories}
          dragOverCatId={dragOverCatId}
          setDragOverCatId={setDragOverCatId}
          onDropOnCategory={handleDropOnCategory}
        />
      )}
      {checkedUids.size > 0 && (
        <BulkActionsBar
          count={checkedUids.size}
          onDelete={() => void handleBulkDelete(filtered, checkedUids, setCheckedUids)}
          onClear={() => setCheckedUids(new Set())}
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
        hoveredRowUid={hoveredRowUid}
        setHoveredRowUid={setHoveredRowUid}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        draggingUid={draggingUid}
        categories={categories}
        deleteRawMutation={deleteRawMutation}
        restoreRawMutation={restoreRawMutation}
        deleteProcMutation={deleteProcMutation}
        showProcessPanel={showProcessPanel}
        showEditPanel={showEditPanel}
        selectedTxn={selectedTxn}
      />
      {showManualEntry && <ManualEntryDialog onClose={() => setShowManualEntry(false)} />}
    </div>
  )
}
