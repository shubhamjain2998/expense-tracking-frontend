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
  onDone: () => void
}

function CategoriseForm({ txn, categories, onDone }: CategoriseFormProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [saveMapping, setSaveMapping] = useState(true)
  const [splitCount, setSplitCount] = useState(1)
  const [personIds, setPersonIds] = useState<string[]>([])
  const [categoryError, setCategoryError] = useState('')

  const personsQuery = useQuery({ queryKey: ['persons'], queryFn: getPersons })

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
    <div className="bg-surface-container-lowest space-y-4 rounded-xl p-5 shadow-[0_4px_24px_rgba(24,28,32,0.06)]">
      <div>
        <p className="text-on-surface-variant text-[11px] font-bold tracking-wider uppercase">
          {txn.description}
        </p>
        <p className="text-on-surface text-3xl font-black tracking-tight">
          {formatCurrency(txn.amount)}
        </p>
        <p className="text-outline mt-0.5 text-xs">{txn.date}</p>
      </div>

      <SearchableSelect
        label="Category"
        options={categories}
        value={category}
        onChange={setCategory}
        error={categoryError}
      />

      <div className="flex items-center gap-3">
        <label className="text-on-surface-variant flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={saveMapping}
            onChange={(e) => setSaveMapping(e.target.checked)}
            className="border-outline-variant text-primary focus:ring-primary rounded"
          />
          <span className="font-medium">Save Rule</span>
          <span className="text-outline">— Always map</span>
        </label>
      </div>

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
          <p className="text-on-surface text-base font-bold">
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
    <tr
      className={`group transition-colors ${txn.deleted ? 'opacity-50' : 'hover:bg-surface-container-low'}`}
    >
      <td className="text-on-surface-variant py-3 pl-4 text-sm">{txn.date}</td>
      <td
        className={`text-on-surface py-3 text-sm font-medium ${txn.deleted ? 'line-through' : ''}`}
      >
        {txn.description}
      </td>
      <td className="text-on-surface py-3 text-right text-sm font-semibold">
        {formatCurrency(txn.amount)}
      </td>
      <td className="py-3 pr-4 text-right">
        {txn.deleted ? (
          <button
            onClick={() => onRestore(txn.id)}
            className="text-primary hover:bg-secondary-container rounded-lg px-2 py-1 text-xs font-medium"
            aria-label="Restore transaction"
          >
            Restore
          </button>
        ) : (
          <button
            onClick={() => onDelete(txn.id)}
            className="text-outline hover:bg-error-container hover:text-on-error-container rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Delete transaction"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        )}
      </td>
    </tr>
  )
}

export function ReviewPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activePendingId, setActivePendingId] = useState<string | null>(null)
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
      toast.success(`${data.categorised} auto-categorised, ${data.pending} need manual review`)
      void qc.invalidateQueries({ queryKey: ['rawTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const pendingTxns = pendingQuery.data ?? []
  const activePending = activePendingId
    ? pendingTxns.find((t) => t.id === activePendingId)
    : pendingTxns[0]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-on-surface text-3xl font-black tracking-tight">
            Review Transactions
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Manage and audit your raw financial data.
          </p>
        </div>
        <YearMonthSelector
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
        />
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Raw transactions */}
        <section className="lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-on-surface text-base font-bold">Raw Transactions</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => autoMutation.mutate()}
              loading={autoMutation.isPending}
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Auto-Categorise
            </Button>
          </div>
          <div className="bg-surface-container-low rounded-xl">
            {rawQuery.isLoading ? (
              <div className="p-6">
                <SkeletonTable />
              </div>
            ) : !rawQuery.data?.length ? (
              <div className="p-6">
                <p className="text-on-surface-variant text-center text-sm">
                  No transactions for this period.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-outline-variant/15 border-b">
                      {['Date', 'Description', 'Amount', 'Actions'].map((h, i) => (
                        <th
                          key={h}
                          className={`text-on-surface-variant px-4 py-4 text-[11px] font-bold tracking-widest uppercase ${i >= 2 ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-outline-variant/5 divide-y">
                    {rawQuery.data.map((txn) => (
                      <RawTxnRow
                        key={txn.id}
                        txn={txn}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onRestore={(id) => restoreMutation.mutate(id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Pending categorisation */}
        <section className="lg:col-span-5">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-on-surface text-base font-bold">Pending Categorization</h2>
            {pendingTxns.length > 0 && <Chip variant="warning">{pendingTxns.length} ITEMS</Chip>}
          </div>

          {pendingQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-surface-container-low h-48 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : pendingTxns.length === 0 ? (
            <div className="bg-primary/5 rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-primary mb-2 text-3xl">bolt</span>
              <p className="text-on-surface font-semibold">That&apos;s all for now</p>
              <p className="text-on-surface-variant mt-1 text-sm">
                All transactions have been categorised.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Queue navigator */}
              {pendingTxns.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {pendingTxns.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => setActivePendingId(t.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        (activePending?.id ?? pendingTxns[0]?.id) === t.id
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      #{i + 1}
                    </button>
                  ))}
                </div>
              )}
              {activePending && (
                <CategoriseForm
                  key={activePending.id}
                  txn={activePending}
                  categories={categoryListQuery.data ?? []}
                  onDone={() => {
                    const remaining = pendingTxns.filter((t) => t.id !== activePending.id)
                    setActivePendingId(remaining[0]?.id ?? null)
                  }}
                />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
