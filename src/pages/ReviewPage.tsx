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
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="card-eyebrow">Reviewing</span>
          <span className="chip accent">
            <span className="num">
              {currentIndex + 1} / {totalPending}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="btn ghost icon sm"
            aria-label="Previous transaction"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              chevron_left
            </span>
          </button>
          <button
            onClick={onNext}
            disabled={currentIndex >= totalPending - 1}
            className="btn ghost icon sm"
            aria-label="Next transaction"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* Txn hero */}
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: 16,
        }}
      >
        <p className="text-[12.5px] font-medium" style={{ color: 'var(--ink-3)' }}>
          {txn.description}
        </p>
        <p
          className="num mt-1 text-[28px] font-semibold"
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
          aria-label="Transaction notes"
        />
      </div>

      {tagsQuery.data && tagsQuery.data.length > 0 && (
        <div>
          <p className="eyebrow mb-1.5">Tags (optional)</p>
          <div className="flex flex-wrap gap-1.5">
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
                  className={active ? 'chip accent' : 'chip'}
                  style={{ cursor: 'pointer' }}
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
        Process transaction →
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
      className="flex items-center gap-3"
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--line)',
        opacity: isDeleted ? 0.4 : 1,
        transition: 'background .1s ease',
      }}
      onMouseEnter={(e) => {
        if (!isDeleted) e.currentTarget.style.background = 'var(--surface-2)'
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[12.5px] font-medium"
          style={{
            color: 'var(--ink)',
            textDecoration: isDeleted ? 'line-through' : undefined,
          }}
        >
          {txn.description}
        </p>
        <p className="num mt-0.5 text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {txn.txn_date?.slice(0, 10)}
        </p>
      </div>
      <p className="num shrink-0 text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
        {formatCurrency(Number(txn.amount))}
      </p>
      {isDeleted ? (
        <button
          onClick={() => onRestore(txn.id)}
          className="btn ghost sm"
          style={{ color: 'var(--accent)' }}
          aria-label="Restore transaction"
        >
          Restore
        </button>
      ) : (
        <button
          onClick={() => onDelete(txn.id)}
          className="btn ghost icon sm"
          aria-label="Delete transaction"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            delete
          </span>
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
    <div className="space-y-5">
      <header>
        <p className="card-eyebrow">Review</p>
        <h1
          className="text-[22px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          Review transactions
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
          Categorise pending transactions and audit your raw data.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Pending review */}
        <section className="lg:col-span-7">
          {pendingQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-shimmer"
                  style={{ height: 48, borderRadius: 'var(--radius)' }}
                />
              ))}
            </div>
          ) : pendingTxns.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-center">
              <span
                className="material-symbols-outlined mb-2"
                style={{ fontSize: 22, color: 'var(--pos)' }}
              >
                task_alt
              </span>
              <p
                className="text-[15px] font-semibold"
                style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
              >
                All caught up
              </p>
              <p className="mt-1 max-w-xs text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
                All transactions have been categorised. Use auto-categorise to process new uploads.
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => autoMutation.mutate()}
                  loading={autoMutation.isPending}
                >
                  Auto-categorise
                </Button>
              </div>
            </div>
          ) : bulkMode ? (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="card-title">Bulk categorise</p>
                  <span className="chip accent">
                    <span className="num">{pendingTxns.length}</span> pending
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const allIds = new Set(pendingTxns.map((t) => t.id))
                      setSelectedBulkIds(
                        selectedBulkIds.size === pendingTxns.length ? new Set() : allIds
                      )
                    }}
                    className="btn ghost sm"
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
                    className="btn ghost icon sm"
                    aria-label="Exit bulk mode"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      close
                    </span>
                  </button>
                </div>
              </div>

              <div
                className="max-h-64 overflow-y-auto"
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                }}
              >
                {pendingTxns.map((txn, i) => {
                  const checked = selectedBulkIds.has(txn.id)
                  return (
                    <label
                      key={txn.id}
                      className="flex cursor-pointer items-center gap-2.5"
                      style={{
                        padding: '8px 12px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                        background: checked ? 'var(--accent-soft)' : 'transparent',
                        transition: 'background .1s ease',
                      }}
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
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span
                        className="min-w-0 flex-1 truncate text-[12.5px] font-medium"
                        style={{ color: 'var(--ink)' }}
                      >
                        {txn.description}
                      </span>
                      <span className="num shrink-0 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                        {txn.txn_date?.slice(0, 10)}
                      </span>
                      <span
                        className="num shrink-0 text-[12.5px] font-medium"
                        style={{ color: 'var(--ink)' }}
                      >
                        {formatCurrency(Number(txn.amount))}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
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
                  Process {selectedBulkIds.size > 0 ? selectedBulkIds.size : ''} selected
                </Button>
              </div>
            </div>
          ) : (
            activePending && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => setBulkMode(true)}
                    className="btn ghost sm"
                    title="Switch to bulk categorisation"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      checklist
                    </span>
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

        {/* Raw transactions sidebar */}
        <section className="lg:col-span-5">
          <div className="card card-flush overflow-hidden">
            <div
              className="flex items-center justify-between"
              style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}
            >
              <div className="flex items-center gap-2">
                <p className="card-title">Raw transactions</p>
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
                  title="Auto-categorise"
                  className="btn ghost icon sm"
                >
                  <span
                    className={`material-symbols-outlined ${autoMutation.isPending ? 'animate-spin' : ''}`}
                    style={{ fontSize: 14 }}
                  >
                    {autoMutation.isPending ? 'progress_activity' : 'auto_awesome'}
                  </span>
                </button>
              </div>
            </div>

            <div
              className="max-h-[calc(100vh-16rem)] overflow-y-auto"
              style={{ background: 'var(--surface)' }}
            >
              {rawQuery.isLoading ? (
                <div style={{ padding: 14 }}>
                  <SkeletonTable />
                </div>
              ) : !rawQuery.data?.length ? (
                <div className="py-8 text-center">
                  <p className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
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
