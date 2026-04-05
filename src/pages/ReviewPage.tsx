import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getRawTransactions,
  deleteRawTransaction,
  restoreRawTransaction,
  autoCategorise,
  getPendingManual,
  processTransaction,
  getCategoryList,
  getPersons,
  createPerson,
} from '../lib/api'
import type { RawTransaction, PendingManualTransaction } from '../types/transaction'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { SkeletonTable } from '../components/ui/Skeleton'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { MultiSelect } from '../components/ui/MultiSelect'
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
  categories: string[]
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
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
      void qc.invalidateQueries({ queryKey: ['rawTransactions'] })
      void qc.invalidateQueries({ queryKey: ['categoryList'] })
      onDone()
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
          {formatCurrency(txn.amount)}
        </p>
        <p className="text-outline mt-2 text-xs">{txn.date}</p>
      </div>

      {/* Category */}
      <SearchableSelect
        label="Category"
        options={categories}
        value={category}
        onChange={(val) => {
          setCategory(val)
          if (val && !categories.includes(val)) setSaveMapping(true)
        }}
        error={categoryError}
        allowCreate
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
            <span className="text-outline ml-1 text-xs font-normal">(1/{splitCount})</span>
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
  )
}

interface RawTxnRowProps {
  txn: RawTransaction
  onDelete: (id: string) => void
  onRestore: (id: string) => void
}

function RawTxnRow({ txn, onDelete, onRestore }: RawTxnRowProps) {
  return (
    <div
      className={`border-outline-variant/10 flex items-center gap-3 border-b px-4 py-3 transition-colors ${
        txn.deleted ? 'opacity-40' : 'hover:bg-surface-container-low'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-on-surface truncate text-sm font-medium ${txn.deleted ? 'line-through' : ''}`}
        >
          {txn.description}
        </p>
        <p className="text-on-surface-variant mt-0.5 text-xs">{txn.txn_date?.slice(0, 10)}</p>
      </div>
      <p className="text-on-surface shrink-0 text-sm font-semibold">{formatCurrency(txn.amount)}</p>
      {txn.deleted ? (
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

  const rawQuery = useQuery({
    queryKey: ['rawTransactions', year, month],
    queryFn: () => getRawTransactions(year, month),
  })

  const pendingQuery = useQuery({
    queryKey: ['pendingManual'],
    queryFn: getPendingManual,
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

  const pendingTxns = pendingQuery.data ?? []
  const clampedIndex = Math.min(activeIndex, Math.max(0, pendingTxns.length - 1))
  const activePending = pendingTxns[clampedIndex]

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
          ) : (
            activePending && (
              <CategoriseForm
                key={activePending.id}
                txn={activePending}
                categories={categoryListQuery.data ?? []}
                totalPending={pendingTxns.length}
                currentIndex={clampedIndex}
                onDone={() => {
                  const nextIndex = Math.min(clampedIndex, pendingTxns.length - 2)
                  setActiveIndex(Math.max(0, nextIndex))
                }}
                onPrev={() => setActiveIndex((i) => Math.max(0, i - 1))}
                onNext={() => setActiveIndex((i) => Math.min(pendingTxns.length - 1, i + 1))}
              />
            )
          )}
        </section>

        {/* SECONDARY: Raw transactions sidebar */}
        <section className="lg:col-span-5">
          <div className="bg-surface-container-lowest overflow-hidden rounded-2xl shadow-[0_4px_24px_rgba(24,28,32,0.06)]">
            {/* Sidebar header */}
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

            {/* Transaction list */}
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
