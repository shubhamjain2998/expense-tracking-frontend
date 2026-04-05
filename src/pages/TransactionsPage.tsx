import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getRawTransactions,
  deleteRawTransaction,
  restoreRawTransaction,
  getProcessedTransactions,
  deleteProcessedTransaction,
  editProcessedTransaction,
  autoCategorise,
  getCategoryList,
  getPersons,
  createPerson,
  processTransaction,
} from '../lib/api'
import type { RawTransaction, ProcessedTransactionItem } from '../types/transaction'
import { YearMonthSelector } from '../components/ui/YearMonthSelector'
import { SkeletonTable } from '../components/ui/Skeleton'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { MultiSelect } from '../components/ui/MultiSelect'
import { Button } from '../components/ui/Button'
import { useToastContext } from '../hooks/useToastContext'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

type Tab = 'raw' | 'processed'
type SortDir = 'asc' | 'desc'

// ─── Sort header component ─────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string
  field: string
  sortField: string
  sortDir: SortDir
  onSort: (field: string) => void
  className?: string
}

function SortHeader({ label, field, sortField, sortDir, onSort, className = '' }: SortHeaderProps) {
  const isActive = sortField === field
  return (
    <th
      className={`text-on-surface-variant cursor-pointer px-6 py-4 text-[11px] font-bold tracking-widest uppercase select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span
          className={`material-symbols-outlined text-[14px] transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`}
        >
          {isActive && sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward'}
        </span>
      </span>
    </th>
  )
}

// ─── Process panel ─────────────────────────────────────────────────────────────

interface ProcessPanelProps {
  txn: RawTransaction
  categories: string[]
  onClose: () => void
  onProcessed: () => void
}

function ProcessPanel({ txn, categories, onClose, onProcessed }: ProcessPanelProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [saveMapping, setSaveMapping] = useState(true)
  const [splitCount, setSplitCount] = useState(1)
  const [personIds, setPersonIds] = useState<string[]>([])
  const [categoryError, setCategoryError] = useState('')

  const personsQuery = useQuery({ queryKey: ['persons'], queryFn: getPersons })

  async function handleCreatePerson(name: string) {
    const newPerson = await createPerson(name)
    void qc.invalidateQueries({ queryKey: ['persons'] })
    return newPerson
  }

  const processMutation = useMutation({
    mutationFn: processTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rawTransactions'] })
      void qc.invalidateQueries({ queryKey: ['processedTransactions'] })
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
      void qc.invalidateQueries({ queryKey: ['categoryList'] })
      toast.success('Transaction processed')
      onProcessed()
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  function handleProcess() {
    if (!category) {
      setCategoryError('Please select a category')
      return
    }
    setCategoryError('')
    processMutation.mutate({
      raw_txn_id: txn.id,
      category,
      save_mapping: saveMapping,
      split_count: splitCount,
      person_ids: splitCount > 1 ? personIds : [],
    })
  }

  const effectiveAmount = txn.amount / Math.max(splitCount, 1)

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="border-outline-variant/15 flex items-center justify-between border-b px-5 py-4">
        <span className="text-on-surface text-sm font-bold">Process Transaction</span>
        <button
          onClick={onClose}
          className="text-on-surface-variant hover:bg-surface-container rounded-lg p-1.5 transition-colors"
          aria-label="Close panel"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Panel body */}
      <div className="flex flex-col gap-5 overflow-y-auto p-5">
        {/* Transaction card */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_24px_rgba(24,28,32,0.08)]">
          <p className="text-on-surface-variant mb-2 text-[10px] leading-relaxed font-bold tracking-widest uppercase">
            {txn.description}
          </p>
          <p className="text-on-surface text-4xl font-black tracking-tight">
            {formatCurrency(txn.amount)}
          </p>
          <p className="text-outline mt-1.5 text-xs">{txn.txn_date?.slice(0, 10)}</p>
        </div>

        {/* Category */}
        <SearchableSelect
          label="Category"
          options={categories}
          value={category}
          onChange={(val) => {
            setCategory(val)
            if (val) setCategoryError('')
          }}
          error={categoryError}
          allowCreate
        />

        {/* Save as Rule toggle */}
        <button
          type="button"
          onClick={() => setSaveMapping((v) => !v)}
          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors ${
            saveMapping
              ? 'bg-primary/10 text-primary'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px]">rule</span>
            <span className="font-medium">Save as Rule</span>
            <span className={`text-xs ${saveMapping ? 'text-primary/70' : 'text-outline'}`}>
              — auto-map next time
            </span>
          </div>
          <span
            className={`material-symbols-outlined text-[20px] ${saveMapping ? 'text-primary' : 'text-outline'}`}
          >
            {saveMapping ? 'toggle_on' : 'toggle_off'}
          </span>
        </button>

        {/* Split */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-on-surface-variant mb-1 block text-[11px] font-bold tracking-wider uppercase">
              Split Count
            </label>
            <input
              type="number"
              value={splitCount}
              min={1}
              onChange={(e) => setSplitCount(Math.max(1, Number(e.target.value)))}
              className="input-field"
              aria-label="Split count"
            />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-on-surface-variant text-xs">Your Share</p>
            <p className="text-on-surface text-lg font-bold">
              {formatCurrency(effectiveAmount)}
              {splitCount > 1 && (
                <span className="text-outline ml-1 text-xs font-normal">(1/{splitCount})</span>
              )}
            </p>
          </div>
        </div>

        {splitCount > 1 && personsQuery.data && (
          <MultiSelect
            label="Split With Persons"
            persons={personsQuery.data}
            selectedIds={personIds}
            onChange={setPersonIds}
            onCreatePerson={handleCreatePerson}
          />
        )}

        <Button
          variant="primary"
          className="w-full"
          onClick={handleProcess}
          loading={processMutation.isPending}
        >
          Process Transaction →
        </Button>
      </div>
    </div>
  )
}

// ─── Raw transactions tab ─────────────────────────────────────────────────────

type RawSortField = 'txn_date' | 'description' | 'amount' | 'status'

interface RawTabProps {
  year: number
  month: number
}

function RawTab({ year, month }: RawTabProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [sortField, setSortField] = useState<RawSortField>('txn_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')
  // Store selection with the period it was made in; derive null when period changes
  const [selectedTxnState, setSelectedTxnState] = useState<{
    txn: RawTransaction
    year: number
    month: number
  } | null>(null)
  const selectedTxn =
    selectedTxnState?.year === year && selectedTxnState?.month === month
      ? selectedTxnState.txn
      : null

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field as RawSortField)
      setSortDir('asc')
    }
  }

  const rawQuery = useQuery({
    queryKey: ['rawTransactions', year, month],
    queryFn: () => getRawTransactions(year, month),
  })

  const categoryListQuery = useQuery({ queryKey: ['categoryList'], queryFn: getCategoryList })

  const deleteMutation = useMutation({
    mutationFn: deleteRawTransaction,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['rawTransactions', year, month] })
      const prev = qc.getQueryData<RawTransaction[]>(['rawTransactions', year, month])
      qc.setQueryData<RawTransaction[]>(
        ['rawTransactions', year, month],
        (old) => old?.map((t) => (t.id === id ? { ...t, deleted: true } : t)) ?? []
      )
      if (selectedTxn?.id === id) setSelectedTxnState(null)
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['rawTransactions', year, month], ctx.prev)
      toast.error('Failed to delete transaction')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreRawTransaction,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['rawTransactions', year, month] })
      const prev = qc.getQueryData<RawTransaction[]>(['rawTransactions', year, month])
      qc.setQueryData<RawTransaction[]>(
        ['rawTransactions', year, month],
        (old) => old?.map((t) => (t.id === id ? { ...t, deleted: false } : t)) ?? []
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['rawTransactions', year, month], ctx.prev)
      toast.error('Failed to restore transaction')
    },
  })

  const autoMutation = useMutation({
    mutationFn: autoCategorise,
    onSuccess: (data) => {
      toast.success(
        `${data.auto_categorised} auto-categorised, ${data.pending_manual} need manual review`
      )
      void qc.invalidateQueries({ queryKey: ['rawTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  if (rawQuery.isLoading) return <SkeletonTable />

  const allTxns = rawQuery.data ?? []

  const filtered = allTxns.filter(
    (t) => !search || t.description.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'txn_date') cmp = a.txn_date.localeCompare(b.txn_date)
    else if (sortField === 'description') cmp = a.description.localeCompare(b.description)
    else if (sortField === 'amount') cmp = a.amount - b.amount
    else if (sortField === 'status') cmp = Number(a.deleted) - Number(b.deleted)
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div>
      {/* Toolbar */}
      <div className="border-outline-variant/15 flex items-center gap-3 border-b px-6 py-3">
        <div className="relative max-w-sm flex-1">
          <span className="material-symbols-outlined text-outline pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description…"
            className="input-field w-full"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <button
          onClick={() => autoMutation.mutate()}
          disabled={autoMutation.isPending}
          className="text-on-surface-variant hover:bg-surface-container-high rounded-lg p-2 transition-colors disabled:opacity-50"
          title="Auto-Categorise pending transactions"
          aria-label="Auto-Categorise"
        >
          <span
            className={`material-symbols-outlined text-[20px] ${autoMutation.isPending ? 'animate-spin' : ''}`}
          >
            {autoMutation.isPending ? 'progress_activity' : 'auto_awesome'}
          </span>
        </button>
      </div>

      {allTxns.length === 0 ? (
        <p className="text-on-surface-variant py-12 text-center text-sm">
          No raw transactions for this period.
        </p>
      ) : (
        <div className="flex min-h-0">
          {/* Table */}
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-outline-variant/15 border-b">
                  <SortHeader
                    label="Date"
                    field="txn_date"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Description"
                    field="description"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Amount"
                    field="amount"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <SortHeader
                    label="Status"
                    field="status"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="w-12 px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-on-surface-variant px-6 py-8 text-center text-sm"
                    >
                      No transactions match your search.
                    </td>
                  </tr>
                ) : (
                  sorted.map((txn, i) => {
                    const isSelected = selectedTxn?.id === txn.id
                    return (
                      <tr
                        key={txn.id}
                        onClick={
                          txn.deleted ? undefined : () => setSelectedTxnState({ txn, year, month })
                        }
                        className={`text-sm transition-colors ${
                          txn.deleted
                            ? 'opacity-40'
                            : isSelected
                              ? 'bg-primary/8'
                              : i % 2 === 0
                                ? 'bg-surface-container-lowest hover:bg-surface-container cursor-pointer'
                                : 'bg-surface-container-low hover:bg-surface-container cursor-pointer'
                        }`}
                      >
                        <td className="text-on-surface-variant px-6 py-3 whitespace-nowrap">
                          {txn.txn_date?.slice(0, 10)}
                        </td>
                        <td className="text-on-surface px-6 py-3 font-medium">
                          <span className={txn.deleted ? 'line-through' : ''}>
                            {txn.description}
                          </span>
                        </td>
                        <td className="text-on-surface px-6 py-3 text-right font-semibold">
                          {formatCurrency(txn.amount)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              txn.deleted
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {txn.deleted ? 'deleted' : 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {txn.deleted ? (
                            <button
                              onClick={() => restoreMutation.mutate(txn.id)}
                              className="text-primary hover:bg-secondary-container rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                              aria-label="Restore transaction"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => deleteMutation.mutate(txn.id)}
                              className="text-outline hover:bg-error-container hover:text-on-error-container rounded-lg p-1.5 transition-colors"
                              aria-label="Delete transaction"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            <div className="text-on-surface-variant border-outline-variant/15 border-t px-6 py-3 text-xs">
              {sorted.length} of {allTxns.length} transaction{allTxns.length !== 1 ? 's' : ''}{' '}
              &middot; {allTxns.filter((t) => t.deleted).length} deleted
            </div>
          </div>

          {/* Process panel */}
          {selectedTxn && (
            <div className="border-outline-variant/15 w-[380px] shrink-0 border-l">
              <ProcessPanel
                key={selectedTxn.id}
                txn={selectedTxn}
                categories={categoryListQuery.data ?? []}
                onClose={() => setSelectedTxnState(null)}
                onProcessed={() => setSelectedTxnState(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Processed transactions tab ───────────────────────────────────────────────

type ProcessedSortField = 'txn_date' | 'description' | 'category' | 'amount'

interface ProcessedTabProps {
  year: number
  month: number
}

function ProcessedTab({ year, month }: ProcessedTabProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [sortField, setSortField] = useState<ProcessedSortField>('txn_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryValue, setEditingCategoryValue] = useState('')

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field as ProcessedSortField)
      setSortDir('asc')
    }
  }

  const processedQuery = useQuery({
    queryKey: ['processedTransactions', year, month],
    queryFn: () => getProcessedTransactions(year, month),
  })

  const categoryListQuery = useQuery({ queryKey: ['categoryList'], queryFn: getCategoryList })

  const deleteMutation = useMutation({
    mutationFn: deleteProcessedTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
    },
    onError: () => toast.error('Failed to delete transaction'),
  })

  const editCategoryMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      editProcessedTransaction(id, {
        category,
        save_mapping: false,
        split_count: 1,
        person_ids: [],
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['categoryList'] })
      toast.success('Category updated')
      setEditingCategoryId(null)
    },
    onError: () => toast.error('Failed to update category'),
  })

  function startEditCategory(txn: ProcessedTransactionItem) {
    setEditingCategoryId(txn.id)
    setEditingCategoryValue(txn.category)
  }

  function submitEditCategory(id: string) {
    if (!editingCategoryValue) return
    editCategoryMutation.mutate({ id, category: editingCategoryValue })
  }

  if (processedQuery.isLoading) return <SkeletonTable />

  const allTxns = processedQuery.data ?? []

  const uniqueCategories = [...new Set(allTxns.map((t) => t.category))].sort()

  const filtered = allTxns.filter((t) => {
    const matchesSearch = !search || t.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !categoryFilter || t.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'txn_date') cmp = a.txn_date.localeCompare(b.txn_date)
    else if (sortField === 'description') cmp = a.description.localeCompare(b.description)
    else if (sortField === 'category') cmp = a.category.localeCompare(b.category)
    else if (sortField === 'amount') cmp = Number(a.effective_amount) - Number(b.effective_amount)
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (allTxns.length === 0) {
    return (
      <p className="text-on-surface-variant py-12 text-center text-sm">
        No processed transactions for this period.
      </p>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="border-outline-variant/15 flex flex-col gap-3 border-b px-6 py-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <span className="material-symbols-outlined text-outline pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description…"
            className="input-field w-full"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {(search || categoryFilter) && (
          <button
            onClick={() => {
              setSearch('')
              setCategoryFilter('')
            }}
            className="text-primary text-sm font-medium whitespace-nowrap hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-outline-variant/15 border-b">
              <SortHeader
                label="Date"
                field="txn_date"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Description"
                field="description"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Category"
                field="category"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Amount"
                field="amount"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <th className="text-on-surface-variant px-6 py-4 text-[11px] font-bold tracking-widest uppercase">
                Split
              </th>
              <th className="w-12 px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-on-surface-variant px-6 py-8 text-center text-sm">
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              sorted.map((txn: ProcessedTransactionItem, i) => (
                <tr
                  key={txn.id}
                  className={`text-sm ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}`}
                >
                  <td className="text-on-surface-variant px-6 py-3 whitespace-nowrap">
                    {txn.txn_date?.slice(0, 10)}
                  </td>
                  <td className="text-on-surface max-w-[220px] truncate px-6 py-3 font-medium">
                    {txn.description}
                  </td>
                  <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                    {editingCategoryId === txn.id ? (
                      <div className="flex min-w-[200px] items-center gap-1.5">
                        <div className="flex-1">
                          <SearchableSelect
                            label=""
                            options={categoryListQuery.data ?? uniqueCategories}
                            value={editingCategoryValue}
                            onChange={setEditingCategoryValue}
                            allowCreate
                          />
                        </div>
                        <button
                          onClick={() => submitEditCategory(txn.id)}
                          disabled={editCategoryMutation.isPending || !editingCategoryValue}
                          className="text-primary hover:bg-primary/10 rounded p-0.5 transition-colors disabled:opacity-50"
                          aria-label="Confirm"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                        <button
                          onClick={() => setEditingCategoryId(null)}
                          className="text-outline hover:bg-surface-container rounded p-0.5 transition-colors"
                          aria-label="Cancel"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditCategory(txn)}
                        className="group hover:bg-secondary-container/70 flex items-center gap-1 rounded-full transition-colors"
                        title="Edit category"
                      >
                        <span className="bg-secondary-container text-on-secondary-container rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
                          {txn.category}
                        </span>
                        <span className="material-symbols-outlined text-outline pr-1 text-[13px] opacity-0 transition-opacity group-hover:opacity-100">
                          edit
                        </span>
                      </button>
                    )}
                  </td>
                  <td className="text-on-surface px-6 py-3 text-right font-semibold">
                    {formatCurrency(Number(txn.effective_amount))}
                    {txn.split_count > 1 && (
                      <span className="text-outline ml-1 text-xs font-normal">
                        (1/{txn.split_count})
                      </span>
                    )}
                  </td>
                  <td className="text-on-surface-variant px-6 py-3 text-sm">
                    {txn.split_count > 1 ? `÷${txn.split_count}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(txn.id)}
                      disabled={deleteMutation.isPending}
                      className="text-outline hover:bg-error-container hover:text-on-error-container rounded-lg p-1.5 transition-colors disabled:opacity-50"
                      aria-label="Delete transaction"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="text-on-surface-variant border-outline-variant/15 border-t px-6 py-3 text-xs">
          {sorted.length} of {allTxns.length} transaction{allTxns.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TransactionsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activeTab, setActiveTab] = useState<Tab>('raw')

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-on-surface text-3xl font-black tracking-tight">Transactions</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            View and manage all raw and processed transactions.
          </p>
        </div>
        <YearMonthSelector
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
        />
      </header>

      {/* Tabs */}
      <div className="border-outline-variant/20 flex border-b">
        {(['raw', 'processed'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-semibold capitalize transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary border-b-2'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-surface-container-low overflow-hidden rounded-xl">
        {activeTab === 'raw' ? (
          <RawTab year={year} month={month} />
        ) : (
          <ProcessedTab year={year} month={month} />
        )}
      </div>
    </div>
  )
}
