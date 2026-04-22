import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getRawTransactions,
  deleteRawTransaction,
  restoreRawTransaction,
  getProcessedTransactions,
  deleteProcessedTransaction,
  editProcessedTransaction,
  patchShareSettled,
  autoCategorise,
  getCategories,
  createCategory,
  getPersons,
  createPerson,
  processTransaction,
  getTags,
  bulkTagTransactions,
} from '../lib/api'
import type { RawTransaction, ProcessedTransactionItem, PersonShareIn } from '../types/transaction'
import type { Tag } from '../types/settings'
import type { Category } from '../types/settings'
import { YearMonthSelector } from '../components/ui/YearMonthSelector'
import { SkeletonTable } from '../components/ui/Skeleton'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { PersonShareBuilder } from '../components/ui/PersonShareBuilder'
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
  categories: Category[]
  onClose: () => void
  onProcessed: () => void
}

function ProcessPanel({ txn, categories, onClose, onProcessed }: ProcessPanelProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [categoryId, setCategoryId] = useState('')
  const [saveMapping, setSaveMapping] = useState(true)
  const [shares, setShares] = useState<PersonShareIn[]>([])
  const [notes, setNotes] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const personsQuery = useQuery({ queryKey: ['persons'], queryFn: getPersons })
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  async function handleCreatePerson(name: string) {
    const newPerson = await createPerson(name)
    void qc.invalidateQueries({ queryKey: ['persons'] })
    return newPerson
  }

  async function handleCreateCategory(label: string): Promise<string> {
    const newCat = await createCategory(label)
    void qc.invalidateQueries({ queryKey: ['categories'] })
    return newCat.id
  }

  const processMutation = useMutation({
    mutationFn: processTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rawTransactions'] })
      void qc.invalidateQueries({ queryKey: ['processedTransactions'] })
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
      toast.success('Transaction processed')
      onProcessed()
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  function handleProcess() {
    if (!categoryId) {
      setCategoryError('Please select a category')
      return
    }
    const pctSum = shares
      .filter((s) => s.share_type === 'percentage')
      .reduce((a, s) => a + s.share_value, 0)
    if (pctSum > 100) {
      toast.error('Percentage shares exceed 100%')
      return
    }
    setCategoryError('')
    processMutation.mutate({
      raw_txn_id: txn.id,
      category_id: categoryId,
      save_mapping: saveMapping,
      shares,
      notes: notes.trim() || null,
      tag_ids: selectedTagIds.length ? selectedTagIds : undefined,
    })
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))
  const totalAmount = Number(txn.amount)

  return (
    <div className="flex h-full flex-col">
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

      <div className="flex flex-col gap-5 overflow-y-auto p-5">
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_24px_rgba(24,28,32,0.08)]">
          <p className="text-on-surface-variant mb-2 text-[10px] leading-relaxed font-bold tracking-widest uppercase">
            {txn.description}
          </p>
          <p className="text-on-surface text-4xl font-black tracking-tight">
            {formatCurrency(totalAmount)}
          </p>
          <p className="text-outline mt-1.5 text-xs">{txn.txn_date?.slice(0, 10)}</p>
        </div>

        <SearchableSelect
          label="Category"
          options={categoryOptions}
          value={categoryId}
          onChange={(val) => {
            setCategoryId(val)
            if (val) setCategoryError('')
          }}
          error={categoryError}
          allowCreate
          onCreateOption={handleCreateCategory}
        />

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

        {personsQuery.data && (
          <PersonShareBuilder
            persons={personsQuery.data}
            shares={shares}
            onChange={setShares}
            totalAmount={totalAmount}
            onCreatePerson={handleCreatePerson}
          />
        )}

        <div>
          <label className="text-on-surface-variant mb-1 block text-xs font-semibold tracking-wider uppercase">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="input-field w-full resize-none"
          />
        </div>

        <div>
          <p className="text-on-surface-variant mb-2 text-xs font-semibold tracking-wider uppercase">
            Tags (optional)
          </p>
          {(tagsQuery.data ?? []).length === 0 ? (
            <p className="text-on-surface-variant text-xs">No tags yet. Create tags in Settings.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(tagsQuery.data ?? []).map((tag) => {
                const active = selectedTagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setSelectedTagIds((ids) =>
                        active ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      active
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

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
  const [selectedTxnState, setSelectedTxnState] = useState<{
    txn: RawTransaction
    year: number
    month: number
  } | null>(null)
  const selectedTxn =
    selectedTxnState?.year === year && selectedTxnState?.month === month
      ? selectedTxnState.txn
      : null

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [bulkCategoryError, setBulkCategoryError] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

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

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const deleteMutation = useMutation({
    mutationFn: deleteRawTransaction,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['rawTransactions', year, month] })
      const prev = qc.getQueryData<RawTransaction[]>(['rawTransactions', year, month])
      qc.setQueryData<RawTransaction[]>(
        ['rawTransactions', year, month],
        (old) => old?.map((t) => (t.id === id ? { ...t, status: 'deleted' } : t)) ?? []
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
        (old) => old?.map((t) => (t.id === id ? { ...t, status: 'pending' } : t)) ?? []
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

  async function handleBulkCreateCategory(label: string): Promise<string> {
    const newCat = await createCategory(label)
    void qc.invalidateQueries({ queryKey: ['categories'] })
    return newCat.id
  }

  async function handleBulkProcess() {
    if (!bulkCategoryId) {
      setBulkCategoryError('Please select a category')
      return
    }
    if (selectedBulkIds.size === 0) {
      toast.warning('Select at least one transaction')
      return
    }
    setBulkCategoryError('')
    setBulkProcessing(true)
    try {
      await Promise.all(
        [...selectedBulkIds].map((id) =>
          processTransaction({
            raw_txn_id: id,
            category_id: bulkCategoryId,
            save_mapping: false,
            shares: [],
            notes: null,
          })
        )
      )
      toast.success(
        `${selectedBulkIds.size} transaction${selectedBulkIds.size > 1 ? 's' : ''} processed`
      )
      setSelectedBulkIds(new Set())
      setBulkCategoryId('')
      void qc.invalidateQueries({ queryKey: ['rawTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
    } catch {
      toast.error('Some transactions failed to process')
    } finally {
      setBulkProcessing(false)
    }
  }

  if (rawQuery.isLoading) return <SkeletonTable />

  const allTxns = rawQuery.data ?? []

  const filtered = allTxns.filter(
    (t) => !search || t.description.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'txn_date') cmp = a.txn_date.localeCompare(b.txn_date)
    else if (sortField === 'description') cmp = a.description.localeCompare(b.description)
    else if (sortField === 'amount') cmp = Number(a.amount) - Number(b.amount)
    else if (sortField === 'status') cmp = a.status.localeCompare(b.status)
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div>
      <div className="border-outline-variant/15 flex items-center gap-3 border-b px-6 py-3">
        {bulkMode ? (
          <>
            <button
              onClick={() => {
                const pendingIds = sorted.filter((t) => t.status === 'pending').map((t) => t.id)
                setSelectedBulkIds(
                  selectedBulkIds.size === pendingIds.length ? new Set() : new Set(pendingIds)
                )
              }}
              className="text-primary text-sm font-medium whitespace-nowrap hover:underline"
            >
              {selectedBulkIds.size === sorted.filter((t) => t.status === 'pending').length
                ? 'Deselect all'
                : 'Select all'}
            </button>
            <span className="text-on-surface-variant text-sm">
              {selectedBulkIds.size > 0
                ? `${selectedBulkIds.size} selected`
                : 'Select transactions'}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => {
                setBulkMode(false)
                setSelectedBulkIds(new Set())
                setBulkCategoryId('')
                setBulkCategoryError('')
              }}
              className="text-on-surface-variant hover:bg-surface-container rounded-lg p-1.5 transition-colors"
              aria-label="Exit bulk mode"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </>
        ) : (
          <>
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
            <button
              onClick={() => {
                setBulkMode(true)
                setSelectedTxnState(null)
              }}
              className="text-on-surface-variant hover:bg-surface-container-high rounded-lg p-2 transition-colors"
              title="Bulk categorise"
              aria-label="Bulk categorise"
            >
              <span className="material-symbols-outlined text-[20px]">checklist</span>
            </button>
          </>
        )}
      </div>

      {allTxns.length === 0 ? (
        <p className="text-on-surface-variant py-12 text-center text-sm">
          No raw transactions for this period.
        </p>
      ) : (
        <div className="flex min-h-0">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-outline-variant/15 border-b">
                  {bulkMode && <th className="w-10 px-4 py-4" />}
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
                    const isDeleted = txn.status === 'deleted'
                    const isSelected = selectedTxn?.id === txn.id
                    const isBulkChecked = selectedBulkIds.has(txn.id)
                    const isPending = txn.status === 'pending'
                    return (
                      <tr
                        key={txn.id}
                        onClick={
                          bulkMode
                            ? isPending
                              ? () =>
                                  setSelectedBulkIds((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(txn.id)) next.delete(txn.id)
                                    else next.add(txn.id)
                                    return next
                                  })
                              : undefined
                            : isDeleted
                              ? undefined
                              : () => setSelectedTxnState({ txn, year, month })
                        }
                        className={`text-sm transition-colors ${
                          isDeleted
                            ? 'opacity-40'
                            : bulkMode
                              ? isPending
                                ? isBulkChecked
                                  ? 'bg-primary/8 cursor-pointer'
                                  : 'hover:bg-surface-container cursor-pointer'
                                : 'opacity-40'
                              : isSelected
                                ? 'bg-primary/8'
                                : i % 2 === 0
                                  ? 'bg-surface-container-lowest hover:bg-surface-container cursor-pointer'
                                  : 'bg-surface-container-low hover:bg-surface-container cursor-pointer'
                        }`}
                      >
                        {bulkMode && (
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {isPending && !isDeleted && (
                              <input
                                type="checkbox"
                                checked={isBulkChecked}
                                onChange={() =>
                                  setSelectedBulkIds((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(txn.id)) next.delete(txn.id)
                                    else next.add(txn.id)
                                    return next
                                  })
                                }
                                className="accent-primary h-4 w-4"
                              />
                            )}
                          </td>
                        )}
                        <td className="text-on-surface-variant px-6 py-3 whitespace-nowrap">
                          {txn.txn_date?.slice(0, 10)}
                        </td>
                        <td className="text-on-surface px-6 py-3 font-medium">
                          <span className={isDeleted ? 'line-through' : ''}>{txn.description}</span>
                        </td>
                        <td className="text-on-surface px-6 py-3 text-right font-semibold">
                          {formatCurrency(Number(txn.amount))}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isDeleted
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {isDeleted ? (
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
              &middot; {allTxns.filter((t) => t.status === 'deleted').length} deleted
            </div>
          </div>

          {bulkMode && (
            <div className="border-outline-variant/15 flex w-[340px] shrink-0 flex-col gap-4 border-l p-5">
              <p className="text-on-surface text-sm font-bold">Apply Category</p>
              <SearchableSelect
                label="Category"
                options={(categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                value={bulkCategoryId}
                onChange={(val) => {
                  setBulkCategoryId(val)
                  if (val) setBulkCategoryError('')
                }}
                error={bulkCategoryError}
                allowCreate
                onCreateOption={handleBulkCreateCategory}
                placeholder="Search or create category…"
              />
              <Button
                variant="primary"
                className="w-full"
                onClick={() => void handleBulkProcess()}
                loading={bulkProcessing}
                disabled={selectedBulkIds.size === 0}
              >
                Process {selectedBulkIds.size > 0 ? selectedBulkIds.size : ''} Selected
              </Button>
            </div>
          )}

          {!bulkMode && selectedTxn && (
            <div className="border-outline-variant/15 w-[380px] shrink-0 border-l">
              <ProcessPanel
                key={selectedTxn.id}
                txn={selectedTxn}
                categories={categoriesQuery.data ?? []}
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
  const [tagFilter, setTagFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCategoryId, setEditCategoryId] = useState('')

  // Bulk tag mode
  const [bulkTagMode, setBulkTagMode] = useState(false)
  const [selectedBulkTagIds, setSelectedBulkTagIds] = useState<Set<string>>(new Set())
  const [tagsToApply, setTagsToApply] = useState<string[]>([])
  const [bulkTagging, setBulkTagging] = useState(false)

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field as ProcessedSortField)
      setSortDir('asc')
    }
  }

  const processedQuery = useQuery({
    queryKey: ['processedTransactions', year, month, categoryFilter, tagFilter],
    queryFn: () =>
      getProcessedTransactions(year, month, categoryFilter || undefined, tagFilter || undefined),
  })

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  const deleteMutation = useMutation({
    mutationFn: deleteProcessedTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
    },
    onError: () => toast.error('Failed to delete transaction'),
  })

  const editCategoryMutation = useMutation({
    mutationFn: ({ id, category_id }: { id: string; category_id: string }) =>
      editProcessedTransaction(id, { category_id, save_mapping: false }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
      toast.success('Category updated')
      setEditingId(null)
    },
    onError: () => toast.error('Failed to update category'),
  })

  const settledMutation = useMutation({
    mutationFn: ({
      txnId,
      personId,
      settled,
    }: {
      txnId: string
      personId: string
      settled: boolean
    }) => patchShareSettled(txnId, personId, settled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
    },
    onError: () => toast.error('Failed to update share'),
  })

  async function handleCreateCategory(label: string): Promise<string> {
    const newCat = await createCategory(label)
    void qc.invalidateQueries({ queryKey: ['categories'] })
    return newCat.id
  }

  async function handleBulkTag() {
    if (tagsToApply.length === 0) {
      toast.warning('Select at least one tag to apply')
      return
    }
    if (selectedBulkTagIds.size === 0) {
      toast.warning('Select at least one transaction')
      return
    }
    setBulkTagging(true)
    try {
      await bulkTagTransactions([...selectedBulkTagIds], tagsToApply)
      toast.success(
        `Tags applied to ${selectedBulkTagIds.size} transaction${selectedBulkTagIds.size > 1 ? 's' : ''}`
      )
      setSelectedBulkTagIds(new Set())
      setTagsToApply([])
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
    } catch {
      toast.error('Failed to apply tags')
    } finally {
      setBulkTagging(false)
    }
  }

  function startEditCategory(txn: ProcessedTransactionItem) {
    setEditingId(txn.id)
    setEditCategoryId(txn.category_id)
  }

  function submitEditCategory(id: string) {
    if (!editCategoryId) return
    editCategoryMutation.mutate({ id, category_id: editCategoryId })
  }

  if (processedQuery.isLoading) return <SkeletonTable />

  const allTxns = processedQuery.data ?? []

  const filtered = allTxns.filter(
    (t) => !search || t.description.toLowerCase().includes(search.toLowerCase())
  )

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

  const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))

  return (
    <div>
      <div className="border-outline-variant/15 flex flex-col gap-3 border-b px-6 py-3 sm:flex-row sm:items-center">
        {bulkTagMode ? (
          <>
            <button
              onClick={() => {
                const allIds = new Set(allTxns.map((t) => t.id))
                setSelectedBulkTagIds(
                  selectedBulkTagIds.size === allTxns.length ? new Set() : allIds
                )
              }}
              className="text-primary text-sm font-medium whitespace-nowrap hover:underline"
            >
              {selectedBulkTagIds.size === allTxns.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-on-surface-variant text-sm">
              {selectedBulkTagIds.size > 0
                ? `${selectedBulkTagIds.size} selected`
                : 'Select transactions'}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => {
                setBulkTagMode(false)
                setSelectedBulkTagIds(new Set())
                setTagsToApply([])
              }}
              className="text-on-surface-variant hover:bg-surface-container rounded-lg p-1.5 transition-colors"
              aria-label="Exit bulk tag mode"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </>
        ) : (
          <>
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
              {(categoriesQuery.data ?? [])
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="input-field"
              aria-label="Filter by tag"
            >
              <option value="">All tags</option>
              {(tagsQuery.data ?? [])
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            {(search || categoryFilter || tagFilter) && (
              <button
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('')
                  setTagFilter('')
                }}
                className="text-primary text-sm font-medium whitespace-nowrap hover:underline"
              >
                Clear filters
              </button>
            )}
            <button
              onClick={() => setBulkTagMode(true)}
              className="text-on-surface-variant hover:bg-surface-container-high rounded-lg p-2 transition-colors"
              title="Bulk tag transactions"
              aria-label="Bulk tag"
            >
              <span className="material-symbols-outlined text-[20px]">label</span>
            </button>
          </>
        )}
      </div>

      <div className="flex min-h-0">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-outline-variant/15 border-b">
                {bulkTagMode && <th className="w-10 px-4 py-4" />}
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
                  Shares
                </th>
                <th className="w-12 px-4 py-4" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={bulkTagMode ? 7 : 6}
                    className="text-on-surface-variant px-6 py-8 text-center text-sm"
                  >
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                sorted.map((txn: ProcessedTransactionItem, i) => {
                  const isBulkChecked = selectedBulkTagIds.has(txn.id)
                  return (
                    <tr
                      key={txn.id}
                      onClick={
                        bulkTagMode
                          ? () =>
                              setSelectedBulkTagIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(txn.id)) next.delete(txn.id)
                                else next.add(txn.id)
                                return next
                              })
                          : undefined
                      }
                      className={`text-sm ${
                        bulkTagMode
                          ? isBulkChecked
                            ? 'bg-primary/8 cursor-pointer'
                            : 'hover:bg-surface-container cursor-pointer'
                          : i % 2 === 0
                            ? 'bg-surface-container-lowest'
                            : 'bg-surface-container-low'
                      }`}
                    >
                      {bulkTagMode && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isBulkChecked}
                            onChange={() =>
                              setSelectedBulkTagIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(txn.id)) next.delete(txn.id)
                                else next.add(txn.id)
                                return next
                              })
                            }
                            className="accent-primary h-4 w-4"
                          />
                        </td>
                      )}
                      <td className="text-on-surface-variant px-6 py-3 whitespace-nowrap">
                        {txn.txn_date?.slice(0, 10)}
                      </td>
                      <td className="text-on-surface max-w-[220px] truncate px-6 py-3 font-medium">
                        <div>
                          {txn.description}
                          {txn.notes && (
                            <p className="text-on-surface-variant truncate text-xs font-normal">
                              {txn.notes}
                            </p>
                          )}
                          {txn.tags.length > 0 && (
                            <div className="mt-0.5 flex gap-1">
                              {txn.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="bg-secondary-container text-on-secondary-container rounded-full px-2 py-0.5 text-[10px] font-bold"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                        {editingId === txn.id ? (
                          <div className="flex min-w-[200px] items-center gap-1.5">
                            <div className="flex-1">
                              <SearchableSelect
                                label=""
                                options={categoryOptions}
                                value={editCategoryId}
                                onChange={setEditCategoryId}
                                allowCreate
                                onCreateOption={handleCreateCategory}
                              />
                            </div>
                            <button
                              onClick={() => submitEditCategory(txn.id)}
                              disabled={editCategoryMutation.isPending || !editCategoryId}
                              className="text-primary hover:bg-primary/10 rounded p-0.5 transition-colors disabled:opacity-50"
                              aria-label="Confirm"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
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
                      </td>
                      <td className="px-6 py-3">
                        {txn.shares.length > 0 ? (
                          <div className="space-y-0.5">
                            {txn.shares.map((share) => (
                              <div
                                key={share.person_id}
                                className="flex items-center gap-1.5 text-xs"
                              >
                                <span className="text-on-surface-variant">{share.person_name}</span>
                                <span className="text-on-surface font-medium">
                                  {formatCurrency(Number(share.share_amount))}
                                </span>
                                <button
                                  onClick={() =>
                                    settledMutation.mutate({
                                      txnId: txn.id,
                                      personId: share.person_id,
                                      settled: !share.settled,
                                    })
                                  }
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                                    share.settled
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-surface-container text-on-surface-variant hover:bg-primary/10'
                                  }`}
                                  title={share.settled ? 'Mark unsettled' : 'Mark settled'}
                                >
                                  {share.settled ? 'settled' : 'pending'}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMutation.mutate(txn.id)
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-outline hover:bg-error-container hover:text-on-error-container rounded-lg p-1.5 transition-colors disabled:opacity-50"
                          aria-label="Delete transaction"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div className="text-on-surface-variant border-outline-variant/15 border-t px-6 py-3 text-xs">
            {sorted.length} of {allTxns.length} transaction{allTxns.length !== 1 ? 's' : ''}
          </div>
        </div>
        {/* end overflow-x-auto */}

        {bulkTagMode && (
          <div className="border-outline-variant/15 flex w-[300px] shrink-0 flex-col gap-4 border-l p-5">
            <p className="text-on-surface text-sm font-bold">Apply Tags</p>
            {(tagsQuery.data ?? []).length === 0 ? (
              <p className="text-on-surface-variant text-xs">
                No tags yet. Create tags in Settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(tagsQuery.data ?? []).map((tag: Tag) => {
                  const active = tagsToApply.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setTagsToApply((ids) =>
                          active ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            )}
            <Button
              variant="primary"
              className="mt-auto w-full"
              onClick={() => void handleBulkTag()}
              loading={bulkTagging}
              disabled={selectedBulkTagIds.size === 0 || tagsToApply.length === 0}
            >
              Apply to {selectedBulkTagIds.size > 0 ? selectedBulkTagIds.size : ''} Selected
            </Button>
          </div>
        )}
      </div>
      {/* end flex min-h-0 */}
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
