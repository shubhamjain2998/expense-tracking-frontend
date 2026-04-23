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
    <th className={`cursor-pointer select-none ${className}`} onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 12, opacity: isActive ? 1 : 0.3 }}
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
      <div
        className="flex items-center justify-between"
        style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
      >
        <span
          className="text-[13px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
        >
          Process transaction
        </span>
        <button onClick={onClose} className="btn ghost icon sm" aria-label="Close panel">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            close
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto" style={{ padding: 16 }}>
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: 14,
          }}
        >
          <p className="text-[12px] font-medium" style={{ color: 'var(--ink-3)' }}>
            {txn.description}
          </p>
          <p
            className="num mt-1 text-[26px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            {formatCurrency(totalAmount)}
          </p>
          <p className="num mt-0.5 text-[11px]" style={{ color: 'var(--ink-4)' }}>
            {txn.txn_date?.slice(0, 10)}
          </p>
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
          className="flex w-full items-center justify-between"
          style={{
            background: saveMapping ? 'var(--accent-soft)' : 'var(--surface-2)',
            color: saveMapping ? 'var(--accent)' : 'var(--ink-2)',
            border: '1px solid ' + (saveMapping ? 'transparent' : 'var(--line)'),
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
            fontSize: 12.5,
            fontWeight: 500,
            transition: 'background .1s ease',
          }}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              rule
            </span>
            Save as rule
            <span
              style={{
                color: saveMapping
                  ? 'color-mix(in oklch, var(--accent) 70%, transparent)'
                  : 'var(--ink-4)',
                fontWeight: 400,
              }}
            >
              — auto-map next time
            </span>
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
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
          <label className="eyebrow mb-1 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="textarea"
          />
        </div>

        <div>
          <p className="eyebrow mb-1.5">Tags (optional)</p>
          {(tagsQuery.data ?? []).length === 0 ? (
            <p className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
              No tags yet. Create tags in Settings.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
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
                    className={active ? 'chip accent' : 'chip'}
                    style={{ cursor: 'pointer' }}
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
          Process transaction →
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
      <div
        className="flex items-center gap-2"
        style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}
      >
        {bulkMode ? (
          <>
            <button
              onClick={() => {
                const pendingIds = sorted.filter((t) => t.status === 'pending').map((t) => t.id)
                setSelectedBulkIds(
                  selectedBulkIds.size === pendingIds.length ? new Set() : new Set(pendingIds)
                )
              }}
              className="btn ghost sm"
            >
              {selectedBulkIds.size === sorted.filter((t) => t.status === 'pending').length
                ? 'Deselect all'
                : 'Select all'}
            </button>
            <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
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
              className="btn ghost icon sm"
              aria-label="Exit bulk mode"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                close
              </span>
            </button>
          </>
        ) : (
          <>
            <div className="relative max-w-sm flex-1">
              <span
                className="material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
                style={{ fontSize: 14, color: 'var(--ink-4)' }}
              >
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description…"
                className="input"
                style={{ paddingLeft: 28 }}
              />
            </div>
            <button
              onClick={() => autoMutation.mutate()}
              disabled={autoMutation.isPending}
              className="btn ghost icon sm"
              title="Auto-categorise pending transactions"
              aria-label="Auto-categorise"
            >
              <span
                className={`material-symbols-outlined ${autoMutation.isPending ? 'animate-spin' : ''}`}
                style={{ fontSize: 14 }}
              >
                {autoMutation.isPending ? 'progress_activity' : 'auto_awesome'}
              </span>
            </button>
            <button
              onClick={() => {
                setBulkMode(true)
                setSelectedTxnState(null)
              }}
              className="btn ghost icon sm"
              title="Bulk categorise"
              aria-label="Bulk categorise"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                checklist
              </span>
            </button>
          </>
        )}
      </div>

      {allTxns.length === 0 ? (
        <p className="py-10 text-center text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
          No raw transactions for this period.
        </p>
      ) : (
        <div className="flex min-h-0">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  {bulkMode && <th style={{ width: 36 }} />}
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
                    className="num"
                  />
                  <SortHeader
                    label="Status"
                    field="status"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center" style={{ color: 'var(--ink-3)' }}>
                      No transactions match your search.
                    </td>
                  </tr>
                ) : (
                  sorted.map((txn) => {
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
                        className={
                          bulkMode
                            ? isPending
                              ? isBulkChecked
                                ? 'row sel'
                                : 'row'
                              : ''
                            : isDeleted
                              ? ''
                              : isSelected
                                ? 'row sel'
                                : 'row'
                        }
                        style={{
                          opacity: isDeleted || (bulkMode && !isPending) ? 0.4 : 1,
                        }}
                      >
                        {bulkMode && (
                          <td onClick={(e) => e.stopPropagation()}>
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
                                style={{ accentColor: 'var(--accent)' }}
                              />
                            )}
                          </td>
                        )}
                        <td className="num whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                          {txn.txn_date?.slice(0, 10)}
                        </td>
                        <td style={{ color: 'var(--ink)', fontWeight: 500 }}>
                          <span style={{ textDecoration: isDeleted ? 'line-through' : undefined }}>
                            {txn.description}
                          </span>
                        </td>
                        <td className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                          {formatCurrency(Number(txn.amount))}
                        </td>
                        <td>
                          <span className={isDeleted ? 'chip neg' : 'chip'}>{txn.status}</span>
                        </td>
                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          {isDeleted ? (
                            <button
                              onClick={() => restoreMutation.mutate(txn.id)}
                              className="btn ghost sm"
                              style={{ color: 'var(--accent)' }}
                              aria-label="Restore transaction"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => deleteMutation.mutate(txn.id)}
                              className="btn ghost icon sm"
                              aria-label="Delete transaction"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                delete
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            <div
              className="px-4 py-2.5 text-[11.5px]"
              style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-3)' }}
            >
              {sorted.length} of {allTxns.length} transaction{allTxns.length !== 1 ? 's' : ''}{' '}
              &middot; {allTxns.filter((t) => t.status === 'deleted').length} deleted
            </div>
          </div>

          {bulkMode && (
            <div
              className="flex w-[320px] shrink-0 flex-col gap-3"
              style={{ borderLeft: '1px solid var(--line)', padding: 16 }}
            >
              <p className="card-title">Apply category</p>
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
                Process {selectedBulkIds.size > 0 ? selectedBulkIds.size : ''} selected
              </Button>
            </div>
          )}

          {!bulkMode && selectedTxn && (
            <div className="w-[360px] shrink-0" style={{ borderLeft: '1px solid var(--line)' }}>
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
      <p className="py-10 text-center text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
        No processed transactions for this period.
      </p>
    )
  }

  const categoryOptions = (categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))

  return (
    <div>
      <div
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}
      >
        {bulkTagMode ? (
          <>
            <button
              onClick={() => {
                const allIds = new Set(allTxns.map((t) => t.id))
                setSelectedBulkTagIds(
                  selectedBulkTagIds.size === allTxns.length ? new Set() : allIds
                )
              }}
              className="btn ghost sm"
            >
              {selectedBulkTagIds.size === allTxns.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
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
              className="btn ghost icon sm"
              aria-label="Exit bulk tag mode"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                close
              </span>
            </button>
          </>
        ) : (
          <>
            <div className="relative max-w-sm flex-1">
              <span
                className="material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
                style={{ fontSize: 14, color: 'var(--ink-4)' }}
              >
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description…"
                className="input"
                style={{ paddingLeft: 28 }}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input"
              style={{ width: 'auto' }}
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
              className="input"
              style={{ width: 'auto' }}
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
                className="btn ghost sm"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setBulkTagMode(true)}
              className="btn ghost icon sm"
              title="Bulk tag transactions"
              aria-label="Bulk tag"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                label
              </span>
            </button>
          </>
        )}
      </div>

      <div className="flex min-h-0">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                {bulkTagMode && <th style={{ width: 36 }} />}
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
                  className="num"
                />
                <th>Shares</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={bulkTagMode ? 7 : 6}
                    className="text-center"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    No transactions match your filters.
                  </td>
                </tr>
              ) : (
                sorted.map((txn: ProcessedTransactionItem) => {
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
                      className={bulkTagMode ? (isBulkChecked ? 'row sel' : 'row') : ''}
                    >
                      {bulkTagMode && (
                        <td onClick={(e) => e.stopPropagation()}>
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
                            style={{ accentColor: 'var(--accent)' }}
                          />
                        </td>
                      )}
                      <td className="num whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                        {txn.txn_date?.slice(0, 10)}
                      </td>
                      <td
                        className="max-w-[240px]"
                        style={{ color: 'var(--ink)', fontWeight: 500 }}
                      >
                        <div>
                          <span className="block truncate">{txn.description}</span>
                          {txn.notes && (
                            <p
                              className="truncate text-[11px] font-normal"
                              style={{ color: 'var(--ink-3)' }}
                            >
                              {txn.notes}
                            </p>
                          )}
                          {txn.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {txn.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="chip"
                                  style={{ height: 18, padding: '0 6px', fontSize: 9.5 }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {editingId === txn.id ? (
                          <div className="flex min-w-[220px] items-center gap-1">
                            <div className="flex-1">
                              <SearchableSelect
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
                              className="btn ghost icon sm"
                              style={{ color: 'var(--accent)' }}
                              aria-label="Confirm"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                check
                              </span>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn ghost icon sm"
                              aria-label="Cancel"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                close
                              </span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditCategory(txn)}
                            className="group inline-flex items-center gap-1"
                            title="Edit category"
                            style={{ background: 'transparent', border: 'none' }}
                          >
                            <span className="chip">{txn.category}</span>
                            <span
                              className="material-symbols-outlined opacity-0 transition-opacity group-hover:opacity-100"
                              style={{ fontSize: 12, color: 'var(--ink-4)' }}
                            >
                              edit
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {formatCurrency(Number(txn.effective_amount))}
                      </td>
                      <td>
                        {txn.shares.length > 0 ? (
                          <div className="space-y-1">
                            {txn.shares.map((share) => (
                              <div
                                key={share.person_id}
                                className="flex items-center gap-1.5 text-[11.5px]"
                              >
                                <span style={{ color: 'var(--ink-3)' }}>{share.person_name}</span>
                                <span className="num font-medium" style={{ color: 'var(--ink)' }}>
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
                                  className={share.settled ? 'chip pos' : 'chip'}
                                  style={{
                                    height: 18,
                                    padding: '0 6px',
                                    fontSize: 9.5,
                                    cursor: 'pointer',
                                  }}
                                  title={share.settled ? 'Mark unsettled' : 'Mark settled'}
                                >
                                  {share.settled ? 'settled' : 'pending'}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMutation.mutate(txn.id)
                          }}
                          disabled={deleteMutation.isPending}
                          className="btn ghost icon sm"
                          aria-label="Delete transaction"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            delete
                          </span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div
            className="px-4 py-2.5 text-[11.5px]"
            style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-3)' }}
          >
            {sorted.length} of {allTxns.length} transaction{allTxns.length !== 1 ? 's' : ''}
          </div>
        </div>

        {bulkTagMode && (
          <div
            className="flex w-[280px] shrink-0 flex-col gap-3"
            style={{ borderLeft: '1px solid var(--line)', padding: 16 }}
          >
            <p className="card-title">Apply tags</p>
            {(tagsQuery.data ?? []).length === 0 ? (
              <p className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                No tags yet. Create tags in Settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
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
                      className={active ? 'chip accent' : 'chip'}
                      style={{ cursor: 'pointer' }}
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
              Apply to {selectedBulkTagIds.size > 0 ? selectedBulkTagIds.size : ''} selected
            </Button>
          </div>
        )}
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
    <div className="space-y-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="card-eyebrow">Transactions</p>
          <h1
            className="text-[22px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            All transactions
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
            View and manage your raw and processed transactions.
          </p>
        </div>
        <YearMonthSelector
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
        />
      </header>

      <div className="seg">
        {(['raw', 'processed'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'on' : ''}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card card-flush overflow-hidden">
        {activeTab === 'raw' ? (
          <RawTab year={year} month={month} />
        ) : (
          <ProcessedTab year={year} month={month} />
        )}
      </div>
    </div>
  )
}
