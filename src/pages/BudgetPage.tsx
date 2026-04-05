import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { getBudget, createBudget, updateBudgetEntry, deleteBudgetEntry } from '../lib/api'
import type { BudgetEntry } from '../types/budget'
import { Button } from '../components/ui/Button'
import { SkeletonTable } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
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
  onDelete: (id: string) => void
}

function InlineEditRow({ entry, onDelete }: InlineEditRowProps) {
  const qc = useQueryClient()
  const toast = useToastContext()
  const [category, setCategory] = useState(entry.category)
  const [amount, setAmount] = useState(Number(entry.allocated_amount) / 12)

  const updateMutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: string | number }) =>
      updateBudgetEntry(entry.id, { [field]: value }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  return (
    <tr className="group hover:bg-surface-container-low transition-colors">
      <td className="py-3 pr-4">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={() =>
            category !== entry.category &&
            updateMutation.mutate({ field: 'category', value: category })
          }
          className="input-field w-full max-w-[200px]"
          aria-label="Category name"
        />
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
              updateMutation.mutate({ field: 'allocated_amount', value: amount * 12 })
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
  category: string
  amount: string
}

export function BudgetPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [newRows, setNewRows] = useState<NewEntryRow[]>([{ id: 0, category: '', amount: '' }])
  const toast = useToastContext()
  const qc = useQueryClient()

  const budgetQuery = useQuery({
    queryKey: ['budget', year],
    queryFn: () => getBudget(year),
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
      setNewRows([{ id: 0, category: '', amount: '' }])
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409) toast.error('One or more categories already exist for this year')
      else toast.error(err.detail)
    },
  })

  const entries = budgetQuery.data ?? []
  const totalAnnual = entries.reduce((s, e) => s + Number(e.allocated_amount), 0)

  function handleAddRow() {
    setNewRows((r) => [...r, { id: Date.now(), category: '', amount: '' }])
  }

  function handleSaveNew() {
    const valid = newRows.filter((r) => r.category.trim() && Number(r.amount) > 0)
    if (!valid.length) {
      toast.warning('Fill in at least one category and amount')
      return
    }
    createMutation.mutate({
      year,
      entries: valid.map((r) => ({
        category: r.category.trim(),
        allocated_amount: Number(r.amount) * 12,
      })),
    })
  }

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
        {/* Budget table */}
        <div className="space-y-6 lg:col-span-7">
          <div className="bg-surface-container-low rounded-xl p-6">
            {budgetQuery.isLoading ? (
              <SkeletonTable />
            ) : entries.length === 0 ? (
              <EmptyState
                icon="account_balance_wallet"
                title={`No budget entries for ${year}`}
                description="Use the panel on the right to add your first entries."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-outline-variant/15 border-b">
                      {['Category', 'Monthly Budget', 'Annual Allocation', 'Action'].map((h, i) => (
                        <th
                          key={h}
                          className={`text-on-surface-variant pb-4 text-[11px] font-bold tracking-widest uppercase ${i === 2 ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <InlineEditRow key={entry.id} entry={entry} onDelete={setDeleteId} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Total hero */}
          {entries.length > 0 && (
            <div className="bg-surface-container-low rounded-xl px-6 py-5">
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
        </div>

        {/* Batch add */}
        <div className="space-y-4 lg:col-span-5">
          <div className="bg-surface-container-low rounded-xl p-6">
            <h2 className="text-on-surface mb-5 text-base font-bold">Batch Add Entries</h2>
            <div className="space-y-4">
              {newRows.map((row, i) => (
                <div key={row.id} className="bg-surface-container-lowest space-y-3 rounded-xl p-4">
                  <div>
                    <label className="text-on-surface-variant mb-1 block text-[11px] font-bold tracking-wider uppercase">
                      Category Name
                    </label>
                    <input
                      value={row.category}
                      placeholder="e.g. Entertainment"
                      onChange={(e) =>
                        setNewRows((rows) =>
                          rows.map((r, ri) => (ri === i ? { ...r, category: e.target.value } : r))
                        )
                      }
                      className="input-field"
                      aria-label={`New category name ${i + 1}`}
                    />
                  </div>
                  <div>
                    <label className="text-on-surface-variant mb-1 block text-[11px] font-bold tracking-wider uppercase">
                      Monthly
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-outline text-sm">₹</span>
                      <input
                        type="number"
                        value={row.amount}
                        placeholder="0.00"
                        min={0}
                        onChange={(e) =>
                          setNewRows((rows) =>
                            rows.map((r, ri) => (ri === i ? { ...r, amount: e.target.value } : r))
                          )
                        }
                        className="input-field flex-1"
                        aria-label={`Monthly amount ${i + 1}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddRow}
              className="text-primary mt-4 flex items-center gap-1 text-sm font-medium hover:underline"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Add Another Row
            </button>
            <Button
              variant="primary"
              className="mt-4 w-full"
              onClick={handleSaveNew}
              loading={createMutation.isPending}
            >
              Save All New Entries
            </Button>
          </div>

          {/* Insight card */}
          <div className="bg-primary-container relative overflow-hidden rounded-xl p-6">
            <span className="material-symbols-outlined text-on-primary-container/10 absolute top-4 right-4 text-4xl">
              lightbulb
            </span>
            <p className="text-on-primary-container text-[11px] font-bold tracking-widest uppercase">
              Wealth Insight
            </p>
            <p className="text-on-primary-container/80 mt-3 text-sm leading-relaxed italic">
              &ldquo;A budget is telling your money where to go instead of wondering where it
              went.&rdquo;
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Budget Entry"
        message="This will permanently remove this category from your budget. This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
