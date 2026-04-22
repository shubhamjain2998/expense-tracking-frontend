import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getRawTransactions,
  deleteRawTransaction,
  restoreRawTransaction,
  autoCategorise,
  getPendingManual,
  processTransaction,
  getCategories,
  createCategory,
  getPersons,
  createPerson,
  getTags,
} from '../lib/api'
import type { RawTransaction, PendingManualTransaction, PersonShareIn } from '../types/transaction'
import type { Category } from '../types/settings'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { SkeletonTable } from '../components/ui/Skeleton'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { PersonShareBuilder } from '../components/ui/PersonShareBuilder'
import { YearMonthSelector } from '../components/ui/YearMonthSelector'
import { useToastContext } from '../hooks/useToastContext'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

interface CategoriseFormProps {
  txn: PendingManualTransaction
  categories: Category[]
  totalPending: number
  currentIndex: number
  onDone: () => void
  onPrev: () => void
  onNext: () => void
}

function CategoriseForm({
  txn,
  categories,
  totalPending,
  currentIndex,
  onDone,
  onPrev,
  onNext,
}: CategoriseFormProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [categoryId, setCategoryId] = useState('')
  const [saveMapping, setSaveMapping] = useState(true)
  const [shares, setShares] = useState<PersonShareIn[]>([])
  const [notes, setNotes] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [categoryError, setCategoryError] = useState('')

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
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
      void qc.invalidateQueries({ queryKey: ['rawTransactions'] })
      onDone()
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

  const totalAmount = Number(txn.amount)
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="flex flex-col gap-5">
      {/* Progress + Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-on-surface-variant text-sm font-medium">Reviewing</span>
          <span className="bg-primary/10 text-primary rounded-full px-3 py-0.5 text-sm font-bold">
            {currentIndex + 1} / {totalPending}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="text-on-surface-variant hover:bg-surface-container-high disabled:text-outline/40 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed"
            aria-label="Previous transaction"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={onNext}
            disabled={currentIndex >= totalPending - 1}
            className="text-on-surface-variant hover:bg-surface-container-high disabled:text-outline/40 rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed"
            aria-label="Next transaction"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Transaction card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_24px_rgba(24,28,32,0.08)]">
        <p className="text-on-surface-variant mb-3 text-[11px] leading-relaxed font-bold tracking-widest uppercase">
          {txn.description}
        </p>
        <p className="text-on-surface text-5xl font-black tracking-tight">
          {formatCurrency(totalAmount)}
        </p>
        <p className="text-outline mt-2 text-xs">{txn.txn_date?.slice(0, 10)}</p>
      </div>

      {/* Category */}
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

      {/* Save as Rule */}
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

      {/* Person shares */}
      {personsQuery.data && (
        <PersonShareBuilder
          persons={personsQuery.data}
          shares={shares}
          onChange={setShares}
          totalAmount={totalAmount}
          onCreatePerson={handleCreatePerson}
        />
      )}

      {/* Notes */}
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
          aria-label="Transaction notes"
        />
      </div>

      {/* Tags */}
      {tagsQuery.data && tagsQuery.data.length > 0 && (
        <div>
          <p className="text-on-surface-variant mb-2 text-xs font-semibold tracking-wider uppercase">
            Tags (optional)
          </p>
          <div className="flex flex-wrap gap-2">
            {tagsQuery.data.map((tag) => {
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
        </div>
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
  )
}

interface RawTxnRowProps {
  txn: RawTransaction
  onDelete: (id: string) => void
  onRestore: (id: string) => void
}

function RawTxnRow({ txn, onDelete, onRestore }: RawTxnRowProps) {
  const isDeleted = txn.status === 'deleted'
  return (
    <div
      className={`border-outline-variant/10 flex items-center gap-3 border-b px-4 py-3 transition-colors ${
        isDeleted ? 'opacity-40' : 'hover:bg-surface-container-low'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-on-surface truncate text-sm font-medium ${isDeleted ? 'line-through' : ''}`}
        >
          {txn.description}
        </p>
        <p className="text-on-surface-variant mt-0.5 text-xs">{txn.txn_date?.slice(0, 10)}</p>
      </div>
      <p className="text-on-surface shrink-0 text-sm font-semibold">
        {formatCurrency(Number(txn.amount))}
      </p>
      {isDeleted ? (
        <button
          onClick={() => onRestore(txn.id)}
          className="text-primary hover:bg-secondary-container shrink-0 rounded-lg px-2 py-1 text-xs font-medium"
          aria-label="Restore transaction"
        >
          Restore
        </button>
      ) : (
        <button
          onClick={() => onDelete(txn.id)}
          className="text-outline hover:bg-error-container hover:text-on-error-container shrink-0 rounded-lg p-1.5 transition-colors"
          aria-label="Delete transaction"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      )}
    </div>
  )
}

export function ReviewPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activeIndex, setActiveIndex] = useState(0)
  const toast = useToastContext()
  const qc = useQueryClient()

  // Bulk categorisation state
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set())
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkCategoryError, setBulkCategoryError] = useState('')

  const rawQuery = useQuery({
    queryKey: ['rawTransactions', year, month],
    queryFn: () => getRawTransactions(year, month),
  })

  const pendingQuery = useQuery({
    queryKey: ['pendingManual'],
    queryFn: getPendingManual,
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

  const pendingTxns = pendingQuery.data ?? []
  const clampedIndex = Math.min(activeIndex, Math.max(0, pendingTxns.length - 1))
  const activePending = pendingTxns[clampedIndex]

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
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
      void qc.invalidateQueries({ queryKey: ['rawTransactions'] })
    } catch {
      toast.error('Some transactions failed to process')
    } finally {
      setBulkProcessing(false)
    }
  }

  async function handleBulkCreateCategory(label: string): Promise<string> {
    const newCat = await createCategory(label)
    void qc.invalidateQueries({ queryKey: ['categories'] })
    return newCat.id
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-on-surface text-3xl font-black tracking-tight">
            Review Transactions
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Categorise pending transactions and audit your raw data.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* PRIMARY: Pending categorisation */}
        <section className="lg:col-span-7">
          {pendingQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-container-low h-16 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : pendingTxns.length === 0 ? (
            <div className="bg-surface-container-lowest flex h-72 flex-col items-center justify-center rounded-2xl p-8 text-center shadow-[0_4px_24px_rgba(24,28,32,0.06)]">
              <span className="material-symbols-outlined text-primary mb-3 text-5xl">task_alt</span>
              <p className="text-on-surface text-xl font-bold">All caught up!</p>
              <p className="text-on-surface-variant mt-2 max-w-xs text-sm">
                All transactions have been categorised. Use Auto-Categorise to process new uploads.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-5"
                onClick={() => autoMutation.mutate()}
                loading={autoMutation.isPending}
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Auto-Categorise
              </Button>
            </div>
          ) : bulkMode ? (
            /* ── Bulk mode ──────────────────────────────────────────── */
            <div className="bg-surface-container-lowest space-y-4 rounded-2xl p-6 shadow-[0_4px_24px_rgba(24,28,32,0.06)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-on-surface text-sm font-bold">Bulk Categorise</h2>
                  <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-bold">
                    {pendingTxns.length} pending
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allIds = new Set(pendingTxns.map((t) => t.id))
                      setSelectedBulkIds(
                        selectedBulkIds.size === pendingTxns.length ? new Set() : allIds
                      )
                    }}
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    {selectedBulkIds.size === pendingTxns.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <button
                    onClick={() => {
                      setBulkMode(false)
                      setSelectedBulkIds(new Set())
                      setBulkCategoryId('')
                      setBulkCategoryError('')
                    }}
                    className="text-on-surface-variant hover:bg-surface-container rounded-lg p-1"
                    aria-label="Exit bulk mode"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto">
                {pendingTxns.map((txn) => {
                  const checked = selectedBulkIds.has(txn.id)
                  return (
                    <label
                      key={txn.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        checked
                          ? 'bg-primary/8 text-on-surface'
                          : 'hover:bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedBulkIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(txn.id)) next.delete(txn.id)
                            else next.add(txn.id)
                            return next
                          })
                        }
                        className="accent-primary h-4 w-4 rounded"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {txn.description}
                      </span>
                      <span className="text-on-surface-variant shrink-0 text-xs">
                        {txn.txn_date?.slice(0, 10)}
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatCurrency(Number(txn.amount))}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="border-outline-variant/15 border-t pt-4">
                <SearchableSelect
                  label="Apply category to selected"
                  options={(categoriesQuery.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
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
                  className="mt-3 w-full"
                  onClick={() => void handleBulkProcess()}
                  loading={bulkProcessing}
                  disabled={selectedBulkIds.size === 0}
                >
                  Process {selectedBulkIds.size > 0 ? selectedBulkIds.size : ''} Selected
                </Button>
              </div>
            </div>
          ) : (
            /* ── One-by-one mode ────────────────────────────────────── */
            activePending && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => setBulkMode(true)}
                    className="bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                    title="Switch to bulk categorisation"
                  >
                    <span className="material-symbols-outlined text-[16px]">checklist</span>
                    Bulk mode
                  </button>
                </div>
                <CategoriseForm
                  key={activePending.id}
                  txn={activePending}
                  categories={categoriesQuery.data ?? []}
                  totalPending={pendingTxns.length}
                  currentIndex={clampedIndex}
                  onDone={() => {
                    const nextIndex = Math.min(clampedIndex, pendingTxns.length - 2)
                    setActiveIndex(Math.max(0, nextIndex))
                  }}
                  onPrev={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  onNext={() => setActiveIndex((i) => Math.min(pendingTxns.length - 1, i + 1))}
                />
              </div>
            )
          )}
        </section>

        {/* SECONDARY: Raw transactions sidebar */}
        <section className="lg:col-span-5">
          <div className="bg-surface-container-lowest overflow-hidden rounded-2xl shadow-[0_4px_24px_rgba(24,28,32,0.06)]">
            <div className="border-outline-variant/10 flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-on-surface text-sm font-bold">Raw Transactions</h2>
                {rawQuery.data?.length ? (
                  <Chip variant="neutral">{rawQuery.data.length}</Chip>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <YearMonthSelector
                  year={year}
                  month={month}
                  onYearChange={setYear}
                  onMonthChange={setMonth}
                />
                <button
                  onClick={() => autoMutation.mutate()}
                  disabled={autoMutation.isPending}
                  title="Auto-Categorise"
                  className="text-on-surface-variant hover:bg-surface-container-high rounded-lg p-1.5 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {autoMutation.isPending ? 'progress_activity' : 'auto_awesome'}
                  </span>
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
              {rawQuery.isLoading ? (
                <div className="p-4">
                  <SkeletonTable />
                </div>
              ) : !rawQuery.data?.length ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-on-surface-variant text-sm">
                    No transactions for this period.
                  </p>
                </div>
              ) : (
                rawQuery.data.map((txn) => (
                  <RawTxnRow
                    key={txn.id}
                    txn={txn}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onRestore={(id) => restoreMutation.mutate(id)}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
