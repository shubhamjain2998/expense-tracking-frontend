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
    <tr className="group">
      <td style={{ paddingRight: 12 }}>
        <div style={{ width: 220 }}>
          <SearchableSelect
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
      <td style={{ paddingRight: 12 }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          onBlur={() =>
            amount !== Number(entry.allocated_amount) / 12 &&
            updateMutation.mutate({ allocated_amount: amount * 12 })
          }
          className="input num"
          style={{ width: 130, textAlign: 'right' }}
          min={0}
          aria-label="Monthly budget amount"
        />
      </td>
      <td className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>
        {formatCurrency(amount * 12)}
      </td>
      <td className="text-right">
        <button
          onClick={() => onDelete(entry.id)}
          className="btn ghost icon sm opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Delete ${entry.category}`}
          title="Delete entry"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            delete
          </span>
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
    <div className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="card-eyebrow">Budget</p>
          <h1
            className="text-[22px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            Annual budget · {year}
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
            Define your monthly allocation per category for the year.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="btn icon sm"
            aria-label="Previous year"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              chevron_left
            </span>
          </button>
          <span
            className="num text-[13px] font-semibold"
            style={{ color: 'var(--ink)', minWidth: 48, textAlign: 'center' }}
          >
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="btn icon sm"
            aria-label="Next year"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              chevron_right
            </span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-7">
          {entries.length > 0 && (
            <div className="card">
              <p className="card-eyebrow">Total annual budget</p>
              <p
                className="num mt-1 text-[30px] font-semibold"
                style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
              >
                {formatCurrency(totalAnnual)}
              </p>
              <div className="mt-2 flex gap-1.5">
                <span className="chip">{entries.length} categories</span>
                <span className="chip">
                  <span className="num">{formatCurrency(totalAnnual / 12)}</span>
                  <span style={{ color: 'var(--ink-4)' }}>·</span>
                  <span style={{ color: 'var(--ink-3)' }}>monthly</span>
                </span>
              </div>
            </div>
          )}

          <div className="card card-flush">
            {budgetQuery.isLoading ? (
              <div style={{ padding: 20 }}>
                <SkeletonTable />
              </div>
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
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Monthly</th>
                          <th className="num">Annual</th>
                          <th style={{ width: 36 }} />
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

                {unbudgetedCategories.length > 0 && (
                  <div style={{ padding: 20 }}>
                    {entries.length > 0 && (
                      <hr
                        style={{
                          border: 0,
                          borderTop: '1px solid var(--line)',
                          margin: '0 0 16px',
                        }}
                      />
                    )}
                    <div className="mb-3 flex items-center gap-2">
                      <p className="eyebrow">No budget set</p>
                      <span className="chip neg" style={{ height: 18, padding: '0 6px' }}>
                        {unbudgetedCategories.length}
                      </span>
                    </div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Monthly</th>
                          <th className="num">Annual</th>
                          <th style={{ width: 36 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {unbudgetedCategories.map((cat) => (
                          <tr key={cat.id}>
                            <td style={{ color: 'var(--ink-2)' }}>{cat.name}</td>
                            <td>
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
                                className="input num"
                                style={{ width: 110, textAlign: 'right' }}
                                aria-label={`Monthly budget for ${cat.name}`}
                              />
                            </td>
                            <td className="num" style={{ color: 'var(--ink-3)' }}>
                              {unbudgetedAmounts[cat.id] && Number(unbudgetedAmounts[cat.id]) > 0
                                ? formatCurrency(Number(unbudgetedAmounts[cat.id]) * 12)
                                : '—'}
                            </td>
                            <td />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveUnbudgeted}
                        loading={createMutation.isPending}
                      >
                        Save selected
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-5">
          <div className="card">
            <div className="card-head">
              <div>
                <p className="card-title">Add entries</p>
                <p className="card-sub">Batch-add new categories and budgets.</p>
              </div>
            </div>
            <div className="space-y-3">
              {newRows.map((row, i) => (
                <div
                  key={row.id}
                  className="space-y-2.5"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: 12,
                  }}
                >
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
                    <label className="eyebrow mb-1 block">Monthly amount (₹)</label>
                    <input
                      type="number"
                      value={row.amount}
                      placeholder="e.g. 5000"
                      onChange={(e) =>
                        setNewRows((rows) =>
                          rows.map((r, ri) => (ri === i ? { ...r, amount: e.target.value } : r))
                        )
                      }
                      className="input num"
                      min={0}
                      aria-label={`Monthly amount for entry ${i + 1}`}
                    />
                  </div>
                  {newRows.length > 1 && (
                    <button
                      onClick={() => setNewRows((rows) => rows.filter((_, ri) => ri !== i))}
                      className="btn ghost sm"
                      style={{ color: 'var(--neg)' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={handleAddRow}
                className="w-full text-[12px] font-medium"
                style={{
                  border: '1px dashed var(--line-strong)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--ink-3)',
                  padding: '10px',
                  background: 'transparent',
                  transition: 'border-color .1s ease, color .1s ease',
                }}
              >
                + Add another
              </button>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleSaveNew}
                loading={createMutation.isPending}
              >
                Save entries
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete budget entry"
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
