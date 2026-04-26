import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useRef } from 'react'

import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { SkeletonTable } from '../components/ui/Skeleton'
import { usePeriodMode } from '../hooks/usePeriodMode'
import { useToastContext } from '../hooks/useToastContext'
import {
  getBudget,
  getDashboardSummary,
  getYTD,
  updateBudgetEntry,
  createBudget,
  deleteBudgetEntry,
  setMonthlyBudget,
  deleteMonthlyBudgetOverride,
  getMonthlyBudgetOverrides,
  getCategories,
  createCategory,
} from '../lib/api'
import {
  formatYearLabel,
  getCurrentPeriod,
  loadPeriodMode,
  monthLongLabel,
  monthShortLabel,
} from '../lib/period'
import type { Category } from '../types/settings'

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_COLORS = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
  'var(--cat-7)',
  'var(--cat-8)',
]

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

function heatColor(pct: number | null): { bg: string; fg: string } {
  if (pct === null) return { bg: 'transparent', fg: 'transparent' }
  if (pct >= 100) return { bg: 'var(--neg-soft)', fg: 'var(--neg)' }
  if (pct >= 80) return { bg: 'var(--warn-soft)', fg: 'var(--warn)' }
  return { bg: 'var(--accent-soft)', fg: 'var(--accent)' }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryTableRow {
  id: string
  categoryId: string
  categoryName: string
  colorIndex: number
  monthlyBudget: number
  thisMonthSpent: number
  ytdSpent: number
  annualBudget: number
  pctUsed: number | null
  hasOverride: boolean
}

interface HeatmapRowData {
  categoryId: string
  categoryName: string
  colorIndex: number
  cells: { month: number; spend: number | null; budget: number; percent: number | null }[]
  avgPercent: number | null
}

interface UnbudgetedCategoryRow {
  categoryId: string
  categoryName: string
  colorIndex: number
  thisMonthSpent: number
  ytdSpent: number
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  const color = pct >= 100 ? 'var(--neg)' : pct >= 80 ? 'var(--warn)' : 'var(--pos)'
  return (
    <div
      style={{
        position: 'relative',
        height: 4,
        background: 'var(--line)',
        borderRadius: 2,
        minWidth: 80,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${capped}%`,
          background: color,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: -2,
          bottom: -2,
          width: 1,
          background: 'var(--line-strong)',
        }}
      />
    </div>
  )
}

// ─── HeatmapCard ─────────────────────────────────────────────────────────────

function HeatmapCard({
  data,
  selectedMonth,
  onMonthClick,
}: {
  data: HeatmapRowData[]
  selectedMonth: number
  onMonthClick: (month: number) => void
}) {
  const { mode } = usePeriodMode()
  return (
    <div className="card">
      <div style={{ marginBottom: 16 }}>
        <p className="card-title">Monthly spend heatmap</p>
        <p className="card-sub" style={{ marginTop: 2 }}>
          Each cell is that month&apos;s spend as % of category budget. Click to drill in.
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '2px 3px',
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: 130,
                  textAlign: 'left',
                  paddingBottom: 6,
                  color: 'var(--ink-4)',
                  fontWeight: 500,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              />
              {Array.from({ length: 12 }, (_, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: 'center',
                    width: 52,
                    paddingBottom: 6,
                    color: i + 1 === selectedMonth ? 'var(--accent)' : 'var(--ink-4)',
                    fontWeight: i + 1 === selectedMonth ? 600 : 400,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {monthShortLabel(i + 1, mode).charAt(0)}
                </th>
              ))}
              <th
                style={{
                  textAlign: 'right',
                  paddingLeft: 16,
                  paddingBottom: 6,
                  color: 'var(--ink-4)',
                  fontWeight: 500,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}
              >
                AVG
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.categoryId}>
                <td style={{ paddingRight: 12 }}>
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: CAT_COLORS[row.colorIndex],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        color: 'var(--ink-2)',
                        fontSize: 12,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.categoryName}
                    </span>
                  </div>
                </td>
                {row.cells.map((cell) => {
                  const { bg, fg } = heatColor(cell.percent)
                  const isSelected = cell.month === selectedMonth
                  return (
                    <td key={cell.month} style={{ padding: '1px 2px' }}>
                      {cell.percent !== null ? (
                        <button
                          onClick={() => onMonthClick(cell.month)}
                          title={`${row.categoryName} – ${monthLongLabel(cell.month, mode)}: ${cell.percent}%`}
                          style={{
                            display: 'block',
                            width: '100%',
                            background: bg,
                            color: fg,
                            borderRadius: 4,
                            border: isSelected
                              ? '1.5px solid currentColor'
                              : '1.5px solid transparent',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '5px 2px',
                            cursor: 'pointer',
                            fontVariantNumeric: 'tabular-nums',
                            transition: 'opacity 0.1s',
                            textAlign: 'center',
                          }}
                        >
                          {cell.percent}
                        </button>
                      ) : (
                        <div
                          style={{
                            display: 'block',
                            width: '100%',
                            height: 27,
                            background: 'var(--surface-2)',
                            borderRadius: 4,
                            border: isSelected
                              ? '1.5px solid var(--line-strong)'
                              : '1.5px solid transparent',
                          }}
                        />
                      )}
                    </td>
                  )
                })}
                <td style={{ textAlign: 'right', paddingLeft: 16 }}>
                  <span
                    className="num"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color:
                        row.avgPercent !== null && row.avgPercent >= 100
                          ? 'var(--neg)'
                          : 'var(--ink-3)',
                    }}
                  >
                    {row.avgPercent !== null ? `${row.avgPercent}%` : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── BudgetRow ────────────────────────────────────────────────────────────────

function BudgetRow({
  row,
  onSaveBudget,
  onResetBudget,
  onDelete,
}: {
  row: CategoryTableRow
  onSaveBudget: (amount: number) => void
  onResetBudget: () => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditValue(String(Math.round(row.monthlyBudget)))
    setEditing(true)
    queueMicrotask(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  function handleSave() {
    const amount = Number(editValue)
    if (amount > 0 && Math.abs(amount - row.monthlyBudget) > 0.5) {
      onSaveBudget(amount)
    }
    setEditing(false)
  }

  const overBudget = row.pctUsed !== null && row.pctUsed >= 100

  return (
    <tr className="group">
      {/* Category */}
      <td>
        <div className="flex items-center gap-2">
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: CAT_COLORS[row.colorIndex],
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{row.categoryName}</span>
        </div>
      </td>

      {/* Monthly Budget — inline editable */}
      <td className="num">
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="input num"
            style={{ width: 110, textAlign: 'right' }}
            min={0}
            aria-label={`Monthly budget for ${row.categoryName}`}
          />
        ) : (
          <span className="flex items-center justify-end gap-1">
            {row.hasOverride && (
              <span
                title="Custom budget for this month"
                style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  flexShrink: 0,
                }}
              />
            )}
            <button
              onClick={startEdit}
              title="Click to edit monthly budget"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'var(--ink)',
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span className="num">{fmt(row.monthlyBudget)}</span>
              <span
                className="material-symbols-outlined opacity-0 transition-opacity group-hover:opacity-100"
                style={{ fontSize: 12, color: 'var(--ink-4)' }}
              >
                edit
              </span>
            </button>
            {row.hasOverride && (
              <button
                onClick={onResetBudget}
                title="Reset to default (annual / 12)"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--ink-4)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                  restart_alt
                </span>
              </button>
            )}
          </span>
        )}
      </td>

      {/* This Month */}
      <td className="num" style={{ color: overBudget ? 'var(--neg)' : 'var(--ink)' }}>
        {fmt(row.thisMonthSpent)}
      </td>

      {/* Progress bar */}
      <td style={{ padding: '0 12px' }}>
        {row.pctUsed !== null ? (
          <ProgressBar pct={row.pctUsed} />
        ) : (
          <div
            style={{
              height: 4,
              background: 'var(--line)',
              borderRadius: 2,
              position: 'relative',
              minWidth: 80,
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: -2,
                bottom: -2,
                width: 1,
                background: 'var(--line-strong)',
              }}
            />
          </div>
        )}
      </td>

      {/* YTD Spent */}
      <td
        className="num"
        style={{
          color: row.ytdSpent > row.annualBudget ? 'var(--neg)' : 'var(--ink)',
          fontWeight: row.ytdSpent > row.annualBudget ? 600 : 400,
        }}
      >
        {fmt(row.ytdSpent)}
      </td>

      {/* Annual Budget */}
      <td className="num" style={{ color: 'var(--ink-3)' }}>
        {fmt(row.annualBudget)}
      </td>

      {/* Delete */}
      <td>
        <button
          onClick={onDelete}
          className="btn ghost icon sm opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Delete budget for ${row.categoryName}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            delete
          </span>
        </button>
      </td>
    </tr>
  )
}

// ─── UnbudgetedRow ────────────────────────────────────────────────────────────

function UnbudgetedRow({
  row,
  onSetBudget,
  isSaving,
}: {
  row: UnbudgetedCategoryRow
  onSetBudget: (categoryId: string, monthlyAmount: number) => void
  isSaving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditValue('')
    setEditing(true)
    queueMicrotask(() => inputRef.current?.focus())
  }

  function handleSave() {
    const amount = Number(editValue)
    if (amount > 0) {
      onSetBudget(row.categoryId, amount)
    }
    setEditing(false)
  }

  return (
    <tr className="group" style={{ opacity: 0.7 }}>
      {/* Category */}
      <td>
        <div className="flex items-center gap-2">
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: CAT_COLORS[row.colorIndex],
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{row.categoryName}</span>
        </div>
      </td>

      {/* Monthly Budget — set budget inline */}
      <td className="num">
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="input num"
            style={{ width: 110, textAlign: 'right' }}
            min={0}
            placeholder="e.g. 5000"
            disabled={isSaving}
            aria-label={`Set monthly budget for ${row.categoryName}`}
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to set monthly budget"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--ink-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 'auto',
            }}
          >
            <span style={{ fontSize: 12 }}>—</span>
            <span
              className="opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--accent)',
                whiteSpace: 'nowrap',
              }}
            >
              + Set
            </span>
          </button>
        )}
      </td>

      {/* This Month */}
      <td className="num" style={{ color: 'var(--ink-3)' }}>
        {row.thisMonthSpent > 0 ? fmt(row.thisMonthSpent) : '—'}
      </td>

      {/* Progress — no budget set */}
      <td style={{ padding: '0 12px' }}>
        <div
          style={{
            height: 4,
            background: 'var(--line)',
            borderRadius: 2,
            position: 'relative',
            minWidth: 80,
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: -2,
              bottom: -2,
              width: 1,
              background: 'var(--line-strong)',
            }}
          />
        </div>
      </td>

      {/* YTD Spent */}
      <td className="num" style={{ color: 'var(--ink-3)' }}>
        {row.ytdSpent > 0 ? fmt(row.ytdSpent) : '—'}
      </td>

      {/* Annual Budget */}
      <td className="num" style={{ color: 'var(--ink-4)', fontSize: 12 }}>
        —
      </td>

      <td />
    </tr>
  )
}

// ─── AddBudgetModal ───────────────────────────────────────────────────────────

function AddBudgetModal({
  categories,
  existingCategoryIds,
  year,
  onClose,
  onSaved,
}: {
  categories: Category[]
  existingCategoryIds: Set<string>
  year: number
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [rows, setRows] = useState([{ id: 0, categoryId: '', amount: '' }])

  const availableOptions = categories
    .filter((c) => !existingCategoryIds.has(c.id) && !c.is_income)
    .map((c) => ({ value: c.id, label: c.name }))

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
      toast.success('Budget entries saved')
      onSaved()
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409)
        toast.error('One or more categories already have a budget for this year')
      else toast.error(err.detail)
    },
  })

  async function handleCreateCategory(name: string): Promise<string> {
    const cat = await createCategory(name)
    void qc.invalidateQueries({ queryKey: ['categories'] })
    return cat.id
  }

  function handleSave() {
    const valid = rows.filter((r) => r.categoryId && Number(r.amount) > 0)
    if (!valid.length) {
      toast.warning('Fill in at least one category and amount')
      return
    }
    createMutation.mutate({
      year,
      entries: valid.map((r) => ({
        category_id: r.categoryId,
        allocated_amount: Number(r.amount) * 12,
      })),
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="card animate-scale-in"
        style={{ width: '100%', maxWidth: 460, maxHeight: '85vh', overflow: 'auto' }}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
          <div>
            <p className="card-title">Add budget entries</p>
            <p className="card-sub" style={{ marginTop: 2 }}>
              Set monthly budgets for new categories in {year}.
            </p>
          </div>
          <button
            className="btn ghost icon sm"
            onClick={onClose}
            aria-label="Close"
            style={{ marginLeft: 12 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              close
            </span>
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={row.id}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: 12,
              }}
            >
              <div className="space-y-2.5">
                <SearchableSelect
                  label="Category"
                  options={availableOptions}
                  value={row.categoryId}
                  onChange={(val) =>
                    setRows((rs) => rs.map((r, ri) => (ri === i ? { ...r, categoryId: val } : r)))
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
                      setRows((rs) =>
                        rs.map((r, ri) => (ri === i ? { ...r, amount: e.target.value } : r))
                      )
                    }
                    className="input num"
                    min={0}
                    aria-label={`Monthly amount for entry ${i + 1}`}
                  />
                </div>
                {rows.length > 1 && (
                  <button
                    onClick={() => setRows((rs) => rs.filter((_, ri) => ri !== i))}
                    className="btn ghost sm"
                    style={{ color: 'var(--neg)' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => setRows((rs) => [...rs, { id: Date.now(), categoryId: '', amount: '' }])}
            style={{
              display: 'block',
              width: '100%',
              border: '1px dashed var(--line-strong)',
              borderRadius: 'var(--radius)',
              color: 'var(--ink-3)',
              padding: '10px',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            + Add another category
          </button>

          <div className="flex gap-2">
            <Button variant="tertiary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSave}
              loading={createMutation.isPending}
            >
              Save entries
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyBudgetState({ year, onAdd }: { year: number; onAdd: () => void }) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 40, color: 'var(--ink-4)', marginBottom: 16 }}
      >
        account_balance_wallet
      </span>
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: 6,
        }}
      >
        No budget set for {year}
      </p>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20, maxWidth: 300 }}>
        Define monthly allocations per category to track your spend against targets.
      </p>
      <Button variant="primary" size="sm" onClick={onAdd}>
        + Add first budget entry
      </Button>
    </div>
  )
}

// ─── BudgetPage ───────────────────────────────────────────────────────────────

export function BudgetPage() {
  const now = new Date()
  const { mode } = usePeriodMode()
  const initial = getCurrentPeriod(loadPeriodMode(), now)
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const toast = useToastContext()
  const qc = useQueryClient()

  // ── Queries ──────────────────────────────────────────────────────────────

  const budgetQuery = useQuery({
    queryKey: ['budget', year],
    queryFn: () => getBudget(year),
  })

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', year, month, mode],
    queryFn: () => getDashboardSummary(year, month, undefined, mode),
  })

  const ytdQuery = useQuery({
    queryKey: ['ytd', year, mode],
    queryFn: () => getYTD(year, mode),
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  // Monthly overrides — gracefully ignore if endpoint not yet implemented
  const overridesQuery = useQuery({
    queryKey: ['budget-overrides', year],
    queryFn: () => getMonthlyBudgetOverrides(year),
    retry: false,
    // treat 404 as "not yet implemented" — don't fail the whole page
    throwOnError: false,
  })

  // Parallel heatmap queries — one per month up to the current month within the period.
  const todayPeriod = getCurrentPeriod(mode, now)
  const currentYearMonth =
    year === todayPeriod.year ? todayPeriod.month : year < todayPeriod.year ? 12 : 0
  const monthQueries = useQueries({
    queries: Array.from({ length: 12 }, (_, i) => ({
      queryKey: ['dashboard-summary', year, i + 1, mode],
      queryFn: () => getDashboardSummary(year, i + 1, undefined, mode),
      enabled: i + 1 <= currentYearMonth,
      staleTime: 5 * 60 * 1000,
    })),
  })

  // ── Derived data ──────────────────────────────────────────────────────────

  const entries = budgetQuery.data ?? []
  const summary = summaryQuery.data ?? []
  const ytd = ytdQuery.data ?? []
  const allCategories = categoriesQuery.data ?? []
  const overrides = overridesQuery.data ?? []

  // Build a lookup: month+categoryId → override amount
  const overrideMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of overrides) {
      map.set(`${o.month}:${o.category_id}`, o.allocated_amount)
    }
    return map
  }, [overrides])

  // Per-category table rows with effective monthly budget for selected month
  const tableData = useMemo((): CategoryTableRow[] => {
    const summaryByName = new Map(summary.map((s) => [s.category, s]))
    const ytdByName = new Map(ytd.map((y) => [y.category, y]))

    return entries.map((entry, i) => {
      const annualBudget = Number(entry.allocated_amount)
      const defaultMonthly = annualBudget / 12

      // Use override if available for the selected month
      const overrideKey = `${month}:${entry.category_id}`
      const hasOverride = overrideMap.has(overrideKey)
      const monthlyBudget = hasOverride
        ? (overrideMap.get(overrideKey) ?? defaultMonthly)
        : defaultMonthly

      const s = summaryByName.get(entry.category)
      const y = ytdByName.get(entry.category)
      const thisMonthSpent = Number(s?.actual ?? 0)
      const ytdSpent = Number(y?.actual_ytd ?? 0)
      const pctUsed = monthlyBudget > 0 ? (thisMonthSpent / monthlyBudget) * 100 : null

      return {
        id: entry.id,
        categoryId: entry.category_id,
        categoryName: entry.category,
        colorIndex: i % 8,
        monthlyBudget,
        thisMonthSpent,
        ytdSpent,
        annualBudget,
        pctUsed,
        hasOverride,
      }
    })
  }, [entries, summary, ytd, overrideMap, month])

  // Heatmap data — built from parallel month queries
  const heatmapData = useMemo((): HeatmapRowData[] => {
    return entries.map((entry, i) => {
      const defaultMonthly = Number(entry.allocated_amount) / 12

      const cells = Array.from({ length: 12 }, (_, mi) => {
        const m = mi + 1
        if (m > currentYearMonth) {
          return { month: m, spend: null, budget: defaultMonthly, percent: null }
        }
        const overrideKey = `${m}:${entry.category_id}`
        const budget = overrideMap.has(overrideKey)
          ? (overrideMap.get(overrideKey) ?? defaultMonthly)
          : defaultMonthly
        const qResult = monthQueries[mi]
        const row = qResult.data?.find((s) => s.category === entry.category)
        const spend = Number(row?.actual ?? 0)
        const percent = budget > 0 ? Math.round((spend / budget) * 100) : 0
        return { month: m, spend, budget, percent }
      })

      const doneMonths = cells.filter((c) => c.percent !== null)
      const avgPercent =
        doneMonths.length > 0
          ? Math.round(doneMonths.reduce((sum, c) => sum + (c.percent ?? 0), 0) / doneMonths.length)
          : null

      return {
        categoryId: entry.category_id,
        categoryName: entry.category,
        colorIndex: i % 8,
        cells,
        avgPercent,
      }
    })
  }, [entries, monthQueries, overrideMap, currentYearMonth])

  // Unbudgeted categories — expense categories that exist but have no budget entry this year
  const unbudgetedData = useMemo((): UnbudgetedCategoryRow[] => {
    const budgetedIds = new Set(entries.map((e) => e.category_id))
    const summaryByName = new Map(summary.map((s) => [s.category, s]))
    const ytdByName = new Map(ytd.map((y) => [y.category, y]))

    return allCategories
      .filter((c) => !budgetedIds.has(c.id) && !c.is_income)
      .map((c, i) => ({
        categoryId: c.id,
        categoryName: c.name,
        colorIndex: (entries.length + i) % 8,
        thisMonthSpent: Number(summaryByName.get(c.name)?.actual ?? 0),
        ytdSpent: Number(ytdByName.get(c.name)?.actual_ytd ?? 0),
      }))
  }, [allCategories, entries, summary, ytd])

  // Totals
  const totalAnnual = entries.reduce((s, e) => s + Number(e.allocated_amount), 0)
  const totalMonthlyBudget = tableData.reduce((s, r) => s + r.monthlyBudget, 0)
  const totalThisMonth = tableData.reduce((s, r) => s + r.thisMonthSpent, 0)
  const totalYTDSpent = tableData.reduce((s, r) => s + r.ytdSpent, 0)
  const totalPct = totalMonthlyBudget > 0 ? (totalThisMonth / totalMonthlyBudget) * 100 : null

  // Pace indicator
  const expectedYTD = (totalAnnual / 12) * currentYearMonth
  const paceStatus =
    totalAnnual === 0
      ? null
      : totalYTDSpent < expectedYTD * 0.97
        ? 'under'
        : totalYTDSpent > expectedYTD * 1.03
          ? 'over'
          : 'on_track'

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateAnnualMutation = useMutation({
    mutationFn: ({ id, monthlyAmount }: { id: string; monthlyAmount: number }) =>
      updateBudgetEntry(id, { allocated_amount: monthlyAmount * 12 }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      void qc.invalidateQueries({ queryKey: ['ytd'] })
      toast.success('Annual budget updated')
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const monthlyOverrideMutation = useMutation({
    mutationFn: ({ categoryId, amount }: { categoryId: string; amount: number; entryId: string }) =>
      setMonthlyBudget(year, month, categoryId, amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget-overrides', year] })
      void qc.invalidateQueries({ queryKey: ['dashboard-summary', year, month] })
      toast.success(`Budget for ${monthLongLabel(month, mode)} updated`)
    },
    onError: (err: { detail: string; status?: number }, vars) => {
      // Backend endpoint not yet implemented — fall back to annual update
      if (err.status === 404 || err.status === 405 || err.status === 422) {
        updateAnnualMutation.mutate({ id: vars.entryId, monthlyAmount: vars.amount })
        toast.warning(
          'Saved as annual budget. Implement /budget/{year}/{month}/categories/{id} for per-month overrides.'
        )
      } else {
        toast.error(err.detail)
      }
    },
  })

  const resetOverrideMutation = useMutation({
    mutationFn: (categoryId: string) => deleteMonthlyBudgetOverride(year, month, categoryId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget-overrides', year] })
      toast.success('Reset to default monthly budget')
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBudgetEntry,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      void qc.invalidateQueries({ queryKey: ['ytd'] })
      toast.success('Budget entry deleted')
      setDeleteId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteId(null)
    },
  })

  const createInlineMutation = useMutation({
    mutationFn: (vars: { categoryId: string; monthlyAmount: number }) =>
      createBudget({
        year,
        entries: [{ category_id: vars.categoryId, allocated_amount: vars.monthlyAmount * 12 }],
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget'] })
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      void qc.invalidateQueries({ queryKey: ['ytd'] })
      toast.success('Budget entry created')
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navigateMonth(dir: -1 | 1) {
    const next = month + dir
    if (next < 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else if (next > 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth(next)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLoading = budgetQuery.isLoading || summaryQuery.isLoading || ytdQuery.isLoading

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="card-eyebrow">Budget · {formatYearLabel(year, mode)}</p>
          <h1
            className="text-[22px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            Annual allocation
          </h1>
          {!isLoading && entries.length > 0 && (
            <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
              <span className="num">{fmt(totalYTDSpent)}</span> spent YTD ·{' '}
              <span className="num">{fmt(totalAnnual)}</span> annual budget
              {paceStatus !== null && (
                <>
                  {' '}
                  ·{' '}
                  <span
                    style={{
                      fontWeight: 500,
                      color:
                        paceStatus === 'under'
                          ? 'var(--pos)'
                          : paceStatus === 'over'
                            ? 'var(--neg)'
                            : 'var(--ink-3)',
                    }}
                  >
                    {paceStatus === 'under'
                      ? 'under pace'
                      : paceStatus === 'over'
                        ? 'over pace'
                        : 'on pace'}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          {/* Month / year selector */}
          <div
            className="flex items-center gap-1"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '3px 6px',
            }}
          >
            <button
              onClick={() => navigateMonth(-1)}
              className="btn ghost icon sm"
              aria-label="Previous month"
              style={{ padding: '2px 4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                chevron_left
              </span>
            </button>
            <span
              className="num text-[12px] font-semibold"
              style={{ color: 'var(--ink)', minWidth: 100, textAlign: 'center' }}
            >
              {monthLongLabel(month, mode)} {formatYearLabel(year, mode)}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="btn ghost icon sm"
              aria-label="Next month"
              style={{ padding: '2px 4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                chevron_right
              </span>
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            + Add budget
          </Button>
        </div>
      </header>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="card" style={{ padding: 24 }}>
          <SkeletonTable rows={6} />
        </div>
      ) : entries.length === 0 ? (
        <EmptyBudgetState year={year} onAdd={() => setShowAddModal(true)} />
      ) : (
        <>
          {/* Heatmap */}
          {heatmapData.length > 0 && (
            <HeatmapCard data={heatmapData} selectedMonth={month} onMonthClick={setMonth} />
          )}

          {/* Category breakdown table */}
          <div className="card card-flush">
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 820 }}>
                <thead>
                  <tr>
                    <th style={{ width: '26%' }}>Category</th>
                    <th className="num" style={{ whiteSpace: 'nowrap' }}>
                      Monthly Budget
                    </th>
                    <th className="num" style={{ whiteSpace: 'nowrap' }}>
                      This Month
                    </th>
                    <th style={{ width: '22%', whiteSpace: 'nowrap' }}>This Month Progress</th>
                    <th className="num" style={{ whiteSpace: 'nowrap' }}>
                      YTD Spent
                    </th>
                    <th className="num" style={{ whiteSpace: 'nowrap' }}>
                      Annual Budget
                    </th>
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <BudgetRow
                      key={row.id}
                      row={row}
                      onSaveBudget={(amount) =>
                        monthlyOverrideMutation.mutate({
                          categoryId: row.categoryId,
                          amount,
                          entryId: row.id,
                        })
                      }
                      onResetBudget={() => resetOverrideMutation.mutate(row.categoryId)}
                      onDelete={() => setDeleteId(row.id)}
                    />
                  ))}

                  {/* Unbudgeted categories separator + rows */}
                  {unbudgetedData.length > 0 && (
                    <>
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            paddingTop: 20,
                            paddingBottom: 6,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: 'var(--ink-4)',
                              }}
                            >
                              No budget set
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 18,
                                height: 18,
                                padding: '0 5px',
                                background: 'var(--surface-3)',
                                borderRadius: 9,
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--ink-4)',
                              }}
                            >
                              {unbudgetedData.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {unbudgetedData.map((row) => (
                        <UnbudgetedRow
                          key={row.categoryId}
                          row={row}
                          onSetBudget={(categoryId, monthlyAmount) =>
                            createInlineMutation.mutate({ categoryId, monthlyAmount })
                          }
                          isSaving={createInlineMutation.isPending}
                        />
                      ))}
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      style={{
                        borderTop: '2px solid var(--line)',
                        paddingTop: 14,
                        color: 'var(--ink-3)',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Total
                    </td>
                    <td
                      className="num"
                      style={{
                        borderTop: '2px solid var(--line)',
                        paddingTop: 14,
                        fontWeight: 600,
                        color: 'var(--ink)',
                      }}
                    >
                      {fmt(totalMonthlyBudget)}
                    </td>
                    <td
                      className="num"
                      style={{
                        borderTop: '2px solid var(--line)',
                        paddingTop: 14,
                        fontWeight: 600,
                        color: 'var(--ink)',
                      }}
                    >
                      {fmt(totalThisMonth)}
                    </td>
                    <td style={{ borderTop: '2px solid var(--line)', padding: '14px 12px 0' }}>
                      {totalPct !== null && <ProgressBar pct={totalPct} />}
                    </td>
                    <td
                      className="num"
                      style={{
                        borderTop: '2px solid var(--line)',
                        paddingTop: 14,
                        fontWeight: 600,
                        color: totalYTDSpent > totalAnnual ? 'var(--neg)' : 'var(--ink)',
                      }}
                    >
                      {fmt(totalYTDSpent)}
                    </td>
                    <td
                      className="num"
                      style={{
                        borderTop: '2px solid var(--line)',
                        paddingTop: 14,
                        fontWeight: 600,
                        color: 'var(--ink-3)',
                      }}
                    >
                      {fmt(totalAnnual)}
                    </td>
                    <td style={{ borderTop: '2px solid var(--line)' }} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Hint about per-month budget editing */}
          <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>
            Click any{' '}
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 11, verticalAlign: 'middle' }}
            >
              edit
            </span>{' '}
            budget amount to set a custom budget for {monthLongLabel(month, mode)}.
          </p>
        </>
      )}

      {/* Add budget modal */}
      {showAddModal && (
        <AddBudgetModal
          categories={allCategories}
          existingCategoryIds={new Set(entries.map((e) => e.category_id))}
          year={year}
          onClose={() => setShowAddModal(false)}
          onSaved={() => setShowAddModal(false)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete budget entry"
        message="Are you sure? This will remove the annual budget for this category."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
