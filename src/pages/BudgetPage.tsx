import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getBudget,
  createBudget,
  updateBudgetEntry,
  deleteBudgetEntry,
  getCategories,
  createCategory,
} from '../lib/api'
import type { BudgetEntry } from '../types/budget'
import type { Category } from '../types/settings'
import { Button } from '../components/ui/Button'
import { SkeletonTable } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { useToastContext } from '../hooks/useToastContext'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

interface InlineEditRowProps {
  entry: BudgetEntry
  categories: Category[]
  onDelete: (id: string) => void
}

function InlineEditRow({ entry, categories, onDelete }: InlineEditRowProps) {
  const qc = useQueryClient()
  const toast = useToastContext()
  const [amount, setAmount] = useState(Number(entry.allocated_amount) / 12)

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  const updateMutation = useMutation({
    mutationFn: (payload: { category_id?: string; allocated_amount?: number }) =>
      updateBudgetEntry(entry.id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  return (
    <tr className="group hover:bg-surface-container-low transition-colors">
      <td className="py-3 pr-4">
        <div className="w-[200px]">
          <SearchableSelect
            label=""
            options={categoryOptions}
            value={entry.category_id}
            onChange={(newId) => {
              if (newId !== entry.category_id) {
                updateMutation.mutate({ category_id: newId })
              }
            }}
          />
        </div>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-1">
          <span className="text-outline text-sm">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            onBlur={() =>
              amount !== Number(entry.allocated_amount) / 12 &&
              updateMutation.mutate({ allocated_amount: amount * 12 })
            }
            className="input-field w-28"
            min={0}
            aria-label="Monthly budget amount"
          />
        </div>
      </td>
      <td className="text-on-surface py-3 pr-4 text-right text-sm font-medium">
        {formatCurrency(amount * 12)}
      </td>
      <td className="py-3 text-right">
        <button
          onClick={() => onDelete(entry.id)}
          className="text-outline hover:bg-error-container hover:text-on-error-container rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Delete ${entry.category}`}
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </td>
    </tr>
  )
}

interface NewEntryRow {
  id: number
  category_id: string
  amount: string
}

export function BudgetPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [newRows, setNewRows] = useState<NewEntryRow[]>([{ id: 0, category_id: '', amount: '' }])
  const toast = useToastContext()
  const qc = useQueryClient()

  const budgetQuery = useQuery({
    queryKey: ['budget', year],
    queryFn: () => getBudget(year),
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBudgetEntry,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
      toast.success('Entry deleted')
      setDeleteId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteId(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
      toast.success('Budget entries saved')
      setNewRows([{ id: 0, category_id: '', amount: '' }])
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409)
        toast.error('One or more categories already have a budget for this year')
      else toast.error(err.detail)
    },
  })

  const entries = budgetQuery.data ?? []
  const allCategories = categoriesQuery.data ?? []
  const totalAnnual = entries.reduce((s, e) => s + Number(e.allocated_amount), 0)

  const budgetedIds = new Set(entries.map((e) => e.category_id))
  const unbudgetedCategories = allCategories.filter((c) => !budgetedIds.has(c.id))

  const [unbudgetedAmounts, setUnbudgetedAmounts] = useState<Record<string, string>>({})

  function handleSaveUnbudgeted() {
    const valid = unbudgetedCategories.filter(
      (c) => unbudgetedAmounts[c.id] && Number(unbudgetedAmounts[c.id]) > 0
    )
    if (!valid.length) {
      toast.warning('Enter an amount for at least one category')
      return
    }
    createMutation.mutate({
      year,
      entries: valid.map((c) => ({
        category_id: c.id,
        allocated_amount: Number(unbudgetedAmounts[c.id]) * 12,
      })),
    })
    setUnbudgetedAmounts({})
  }

  async function handleCreateCategory(label: string): Promise<string> {
    const newCat = await createCategory(label)
    void qc.invalidateQueries({ queryKey: ['categories'] })
    return newCat.id
  }

  function handleAddRow() {
    setNewRows((r) => [...r, { id: Date.now(), category_id: '', amount: '' }])
  }

  function handleSaveNew() {
    const valid = newRows.filter((r) => r.category_id && Number(r.amount) > 0)
    if (!valid.length) {
      toast.warning('Fill in at least one category and amount')
      return
    }
    createMutation.mutate({
      year,
      entries: valid.map((r) => ({
        category_id: r.category_id,
        allocated_amount: Number(r.amount) * 12,
      })),
    })
  }

  const categoryOptions = allCategories.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-on-surface text-3xl font-black tracking-tight">Budget Setup</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          Define your financial boundaries for the editorial year ahead.
        </p>
      </header>

      {/* Year nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded-xl p-2"
          aria-label="Previous year"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="bg-surface-container-low flex items-center gap-2 rounded-xl px-4 py-2">
          <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
          <span className="text-on-surface text-sm font-bold">{year}</span>
        </div>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded-xl p-2"
          aria-label="Next year"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left column: budget table + unbudgeted categories */}
        <div className="lg:col-span-7">
          {/* Total hero */}
          {entries.length > 0 && (
            <div className="bg-surface-container-low mb-6 rounded-xl px-6 py-5">
              <p className="text-on-surface-variant text-[11px] font-bold tracking-widest uppercase">
                Total Annual Budget
              </p>
              <p className="text-primary mt-1 text-4xl font-black tracking-tight">
                {formatCurrency(totalAnnual)}
              </p>
              <div className="mt-3 flex gap-2">
                <span className="bg-primary-fixed-dim text-on-primary-fixed rounded-full px-3 py-1 text-xs font-bold">
                  {entries.length} CATEGORIES
                </span>
              </div>
            </div>
          )}

          <div className="bg-surface-container-low rounded-xl p-6">
            {budgetQuery.isLoading ? (
              <SkeletonTable />
            ) : entries.length === 0 && unbudgetedCategories.length === 0 ? (
              <EmptyState
                icon="account_balance_wallet"
                title={`No budget entries for ${year}`}
                description="Use the panel on the right to add your first entries."
              />
            ) : (
              <>
                {entries.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-outline-variant/15 border-b">
                          {['Category', 'Monthly Budget', 'Annual Allocation', 'Action'].map(
                            (h, i) => (
                              <th
                                key={h}
                                className={`text-on-surface-variant pb-4 text-[11px] font-bold tracking-widest uppercase ${i === 2 ? 'text-right' : ''}`}
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <InlineEditRow
                            key={entry.id}
                            entry={entry}
                            categories={allCategories}
                            onDelete={setDeleteId}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Unbudgeted categories */}
                {unbudgetedCategories.length > 0 && (
                  <>
                    {entries.length > 0 && <hr className="border-outline-variant/15 my-6" />}
                    <div className="mb-3 flex items-center gap-2">
                      <p className="text-on-surface-variant text-[11px] font-bold tracking-widest uppercase">
                        No Budget Set
                      </p>
                      <span className="bg-error-container text-on-error-container rounded-full px-2 py-0.5 text-[11px] font-bold">
                        {unbudgetedCategories.length}
                      </span>
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-outline-variant/15 border-b">
                          {['Category', 'Monthly Budget', 'Annual', ''].map((h, i) => (
                            <th
                              key={i}
                              className={`text-on-surface-variant pb-3 text-[11px] font-bold tracking-widest uppercase ${i === 2 ? 'text-right' : ''}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {unbudgetedCategories.map((cat) => (
                          <tr
                            key={cat.id}
                            className="border-outline-variant/10 border-b last:border-0"
                          >
                            <td className="py-3 pr-4">
                              <span className="text-on-surface-variant text-sm">{cat.name}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1">
                                <span className="text-outline text-sm">₹</span>
                                <input
                                  type="number"
                                  value={unbudgetedAmounts[cat.id] ?? ''}
                                  placeholder="0"
                                  min={0}
                                  onChange={(e) =>
                                    setUnbudgetedAmounts((prev) => ({
                                      ...prev,
                                      [cat.id]: e.target.value,
                                    }))
                                  }
                                  className="input-field w-28"
                                  aria-label={`Monthly budget for ${cat.name}`}
                                />
                              </div>
                            </td>
                            <td className="text-on-surface-variant py-3 pr-4 text-right text-sm">
                              {unbudgetedAmounts[cat.id] && Number(unbudgetedAmounts[cat.id]) > 0
                                ? formatCurrency(Number(unbudgetedAmounts[cat.id]) * 12)
                                : '—'}
                            </td>
                            <td className="w-8 py-3" />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4">
                      <Button
                        variant="primary"
                        onClick={handleSaveUnbudgeted}
                        loading={createMutation.isPending}
                      >
                        Save Budget for Selected
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column: batch add */}
        <div className="space-y-4 lg:col-span-5">
          <div className="bg-surface-container-low rounded-xl p-6">
            <h2 className="text-on-surface mb-5 text-base font-bold">Batch Add Entries</h2>
            <div className="space-y-4">
              {newRows.map((row, i) => (
                <div key={row.id} className="bg-surface-container-lowest space-y-3 rounded-xl p-4">
                  <SearchableSelect
                    label="Category"
                    options={categoryOptions}
                    value={row.category_id}
                    onChange={(val) =>
                      setNewRows((rows) =>
                        rows.map((r, ri) => (ri === i ? { ...r, category_id: val } : r))
                      )
                    }
                    placeholder="Search or create category…"
                    allowCreate
                    onCreateOption={handleCreateCategory}
                  />
                  <div>
                    <label className="text-on-surface-variant mb-1 block text-[11px] font-bold tracking-wider uppercase">
                      Monthly Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={row.amount}
                      placeholder="e.g. 5000"
                      onChange={(e) =>
                        setNewRows((rows) =>
                          rows.map((r, ri) => (ri === i ? { ...r, amount: e.target.value } : r))
                        )
                      }
                      className="input-field"
                      min={0}
                      aria-label={`Monthly amount for entry ${i + 1}`}
                    />
                  </div>
                  {newRows.length > 1 && (
                    <button
                      onClick={() => setNewRows((rows) => rows.filter((_, ri) => ri !== i))}
                      className="text-error hover:bg-error-container/30 rounded-lg px-2 py-1 text-xs font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={handleAddRow}
                className="text-primary border-outline-variant/40 hover:border-primary/40 w-full rounded-xl border border-dashed py-3 text-sm font-medium transition-colors"
              >
                + Add Another
              </button>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleSaveNew}
                loading={createMutation.isPending}
              >
                Save Entries
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Budget Entry"
        message="Are you sure you want to delete this budget entry?"
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
