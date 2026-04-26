import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { PersonShareBuilder } from '../components/ui/PersonShareBuilder'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { SkeletonTable } from '../components/ui/Skeleton'
import { usePeriodMode } from '../hooks/usePeriodMode'
import { useToastContext } from '../hooks/useToastContext'
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
  createTag,
  createRawTransaction,
} from '../lib/api'
import { formatYearLabel, getCurrentPeriod, loadPeriodMode, monthLongLabel } from '../lib/period'
import type { Tag } from '../types/settings'
import type { Category } from '../types/settings'
import type {
  EditProcessedPayload,
  ProcessedTransactionItem,
  PersonShareIn,
  RawTransaction,
} from '../types/transaction'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function isIncome(amount: string | number): boolean {
  return Number(amount) < 0
}

function formatAmount(effectiveAmount: string | number): { display: string; income: boolean } {
  const n = Number(effectiveAmount)
  const income = n < 0
  return {
    display: formatCurrency(Math.abs(n)),
    income,
  }
}

const CAT_PALETTE = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
  'var(--cat-7)',
  'var(--cat-8)',
]

function categoryColor(categoryId: string): string {
  let h = 0
  for (let i = 0; i < categoryId.length; i++) h = (h * 31 + categoryId.charCodeAt(i)) & 0xffffffff
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length]
}

// ─── Unified transaction model ──────────────────────────────────────────────────

type TxnKind = 'pending' | 'processed' | 'deleted'

interface UnifiedTxn {
  uid: string
  txn_date: string
  description: string
  amount: string
  effectiveAmount: string
  kind: TxnKind
  category?: string
  categoryId?: string
  tags: Tag[]
  shares: ProcessedTransactionItem['shares']
  notes?: string | null
  rawId?: string
  processedId?: string
  rawOriginal?: RawTransaction
  processedOriginal?: ProcessedTransactionItem
}

function buildUnified(raw: RawTransaction[], processed: ProcessedTransactionItem[]): UnifiedTxn[] {
  const list: UnifiedTxn[] = []

  for (const r of raw) {
    list.push({
      uid: 'raw_' + r.id,
      txn_date: r.txn_date,
      description: r.description,
      amount: r.amount,
      effectiveAmount: r.amount,
      kind: r.status === 'deleted' ? 'deleted' : 'pending',
      tags: [],
      shares: [],
      rawId: r.id,
      rawOriginal: r,
    })
  }

  for (const p of processed) {
    list.push({
      uid: 'proc_' + p.id,
      txn_date: p.txn_date,
      description: p.description,
      amount: p.amount,
      effectiveAmount: p.effective_amount,
      kind: 'processed',
      category: p.category,
      categoryId: p.category_id,
      tags: p.tags,
      shares: p.shares,
      notes: p.notes,
      rawId: p.raw_txn_id,
      processedId: p.id,
      processedOriginal: p,
    })
  }

  list.sort(
    (a, b) => b.txn_date.localeCompare(a.txn_date) || a.description.localeCompare(b.description)
  )
  return list
}

// ─── Manual entry dialog ────────────────────────────────────────────────────────

interface ManualEntryDialogProps {
  onClose: () => void
}

function ManualEntryDialog({ onClose }: ManualEntryDialogProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createRawTransaction({
        txn_date: date,
        description: description.trim(),
        amount: Number(amount),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rawTransactions'] })
      toast.success('Transaction added')
      onClose()
    },
    onError: () => toast.error('Failed to add transaction'),
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      toast.error('Description required')
      return
    }
    const n = Number(amount)
    if (isNaN(n) || n === 0) {
      toast.error('Amount must not be zero')
      return
    }
    mutation.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex w-[380px] flex-col gap-4"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
          >
            Manual entry
          </span>
          <button onClick={onClose} className="btn ghost icon sm">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="eyebrow mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Coffee at Blue Tokai"
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input num"
              step="0.01"
            />
            <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-4)' }}>
              Use a negative value (e.g. −1200) for income, refunds, or salary.
            </p>
          </div>
          <Button variant="primary" className="mt-1 w-full" loading={mutation.isPending}>
            Add transaction
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── NewTagChip ──────────────────────────────────────────────────────────────────
// Inline "+ New tag" chip that expands to a text input on click.

function NewTagChip({ onCreated }: { onCreated: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const toast = useToastContext()

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function cancel() {
    setEditing(false)
    setValue('')
  }

  async function handleCreate() {
    const name = value.trim()
    if (!name) {
      cancel()
      return
    }
    setBusy(true)
    try {
      const tag = await createTag(name)
      void qc.invalidateQueries({ queryKey: ['tags'] })
      onCreated(tag.id)
      cancel()
    } catch {
      toast.error('Failed to create tag')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleCreate()
            }
            if (e.key === 'Escape') cancel()
          }}
          onBlur={() => {
            if (!busy) cancel()
          }}
          disabled={busy}
          placeholder="Tag name…"
          style={{
            height: 24,
            fontSize: 12,
            padding: '0 8px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--accent)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            outline: 'none',
            width: 110,
          }}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            void handleCreate()
          }}
          disabled={busy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 'var(--radius)',
            background: 'var(--accent)',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 13, color: 'var(--surface)' }}
          >
            check
          </span>
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="chip"
      onClick={() => setEditing(true)}
      style={{ cursor: 'pointer', gap: 3, color: 'var(--ink-3)' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
        add
      </span>
      New tag
    </button>
  )
}

// ─── Process panel ──────────────────────────────────────────────────────────────

interface ProcessPanelProps {
  txn: RawTransaction
  categories: Category[]
  onClose: () => void
  onProcessed: () => void
}

function ProcessPanel({ txn, categories, onClose, onProcessed }: ProcessPanelProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [amount, setAmount] = useState(txn.amount)
  const [txnDate, setTxnDate] = useState(txn.txn_date?.slice(0, 10) ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [saveMapping, setSaveMapping] = useState(true)
  const [shares, setShares] = useState<PersonShareIn[]>([])
  const [notes, setNotes] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const personsQuery = useQuery({ queryKey: ['persons'], queryFn: getPersons })
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  async function handleCreatePerson(name: string) {
    const p = await createPerson(name)
    void qc.invalidateQueries({ queryKey: ['persons'] })
    return p
  }

  async function handleCreateCategory(label: string): Promise<string> {
    const c = await createCategory(label)
    void qc.invalidateQueries({ queryKey: ['categories'] })
    return c.id
  }

  const processMutation = useMutation({
    mutationFn: processTransaction,
    onSuccess: async (data) => {
      const parsedAmount = Number(amount)
      const amountChanged =
        !isNaN(parsedAmount) && parsedAmount !== 0 && parsedAmount !== Number(txn.amount)
      const dateChanged = txnDate && txnDate !== txn.txn_date?.slice(0, 10)
      if (amountChanged || dateChanged) {
        try {
          await editProcessedTransaction(data.id, {
            ...(amountChanged ? { amount: parsedAmount } : {}),
            ...(dateChanged ? { txn_date: txnDate } : {}),
          })
        } catch {
          /* ignore */
        }
      }
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
    const n = Number(amount)
    if (isNaN(n) || n === 0) {
      toast.error('Amount must not be zero')
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
  const totalAmount = Math.abs(Number(amount) || Number(txn.amount))
  const txnIsIncome = isIncome(txn.amount)

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
        <button onClick={onClose} className="btn ghost icon sm">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            close
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto" style={{ padding: 16 }}>
        {txnIsIncome && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 11px',
              borderRadius: 'var(--radius)',
              background: 'var(--pos-soft)',
              border: '1px solid color-mix(in oklch, var(--pos) 25%, transparent)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--pos)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              south_america
            </span>
            Income transaction — money received
          </div>
        )}
        <div
          style={{
            background: txnIsIncome
              ? 'color-mix(in oklch, var(--pos-soft) 60%, var(--surface-2))'
              : 'var(--surface-2)',
            border:
              '1px solid ' +
              (txnIsIncome ? 'color-mix(in oklch, var(--pos) 20%, transparent)' : 'var(--line)'),
            borderRadius: 'var(--radius)',
            padding: 14,
          }}
        >
          <p className="text-[12px] font-medium" style={{ color: 'var(--ink-3)' }}>
            {txn.description}
          </p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input num mt-1 w-full"
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              height: 38,
              color: txnIsIncome ? 'var(--pos)' : 'var(--ink)',
            }}
            step="0.01"
          />
          <input
            type="date"
            value={txnDate}
            onChange={(e) => setTxnDate(e.target.value)}
            className="input num mt-1"
            style={{ fontSize: 11.5, height: 26, padding: '0 6px', width: 'auto' }}
          />
        </div>

        <SearchableSelect
          label="Category"
          options={categoryOptions}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v)
            if (v) setCategoryError('')
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
          }}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              rule
            </span>
            Save as rule
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
            <NewTagChip onCreated={(id) => setSelectedTagIds((ids) => [...ids, id])} />
          </div>
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

// ─── Edit panel ─────────────────────────────────────────────────────────────────

interface EditPanelProps {
  txn: ProcessedTransactionItem
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

function EditPanel({ txn, categories, onClose, onSaved }: EditPanelProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [amount, setAmount] = useState(txn.amount)
  const [description, setDescription] = useState(txn.description)
  const [txnDate, setTxnDate] = useState(txn.txn_date?.slice(0, 10) ?? '')
  const [categoryId, setCategoryId] = useState(txn.category_id)
  const [saveMapping, setSaveMapping] = useState(false)
  const [shares, setShares] = useState<PersonShareIn[]>(
    txn.shares.map((s) => ({
      person_id: s.person_id,
      share_type: s.share_type as 'percentage' | 'amount',
      share_value: Number(s.share_value),
    }))
  )
  const [notes, setNotes] = useState(txn.notes ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(txn.tags.map((t) => t.id))
  const [categoryError, setCategoryError] = useState('')

  const personsQuery = useQuery({ queryKey: ['persons'], queryFn: getPersons })
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  async function handleCreatePerson(name: string) {
    const p = await createPerson(name)
    void qc.invalidateQueries({ queryKey: ['persons'] })
    return p
  }

  async function handleCreateCategory(label: string): Promise<string> {
    const c = await createCategory(label)
    void qc.invalidateQueries({ queryKey: ['categories'] })
    return c.id
  }

  const editMutation = useMutation({
    mutationFn: (payload: EditProcessedPayload) => editProcessedTransaction(txn.id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['processedTransactions'] })
      toast.success('Transaction updated')
      onSaved()
    },
    onError: (err: { detail: string }) => toast.error(err.detail ?? 'Failed to update'),
  })

  const settledMutation = useMutation({
    mutationFn: ({ personId, settled }: { personId: string; settled: boolean }) =>
      patchShareSettled(txn.id, personId, settled),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['processedTransactions'] }),
    onError: () => toast.error('Failed to update settlement'),
  })

  function handleSave() {
    if (!categoryId) {
      setCategoryError('Please select a category')
      return
    }
    const n = Number(amount)
    if (isNaN(n) || n === 0) {
      toast.error('Amount must not be zero')
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
    editMutation.mutate({
      amount: n,
      description: description.trim() || undefined,
      txn_date: txnDate || undefined,
      category_id: categoryId,
      save_mapping: saveMapping,
      shares,
      notes: notes.trim() || null,
      tag_ids: selectedTagIds,
    })
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))
  const totalAmount = Math.abs(Number(amount) || Number(txn.amount))
  const txnIsIncome = isIncome(txn.amount)

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
          Edit transaction
        </span>
        <button onClick={onClose} className="btn ghost icon sm">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            close
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto" style={{ padding: 16 }}>
        {txnIsIncome && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 11px',
              borderRadius: 'var(--radius)',
              background: 'var(--pos-soft)',
              border: '1px solid color-mix(in oklch, var(--pos) 25%, transparent)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--pos)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              south_america
            </span>
            Income transaction — money received
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="eyebrow mb-1 block">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input num"
              style={{ color: txnIsIncome ? 'var(--pos)' : undefined }}
              step="0.01"
            />
          </div>
          <div className="flex-1">
            <label className="eyebrow mb-1 block">Date</label>
            <input
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="eyebrow mb-1 block">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
          />
        </div>

        <SearchableSelect
          label="Category"
          options={categoryOptions}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v)
            if (v) setCategoryError('')
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
          }}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              rule
            </span>
            Save as rule
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

        {/* Settlement status for existing shares */}
        {txn.shares.length > 0 && (
          <div>
            <p className="eyebrow mb-1.5">Settlement</p>
            <div className="space-y-1.5">
              {txn.shares.map((share) => (
                <div key={share.person_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <span style={{ color: 'var(--ink)' }}>{share.person_name}</span>
                    <span className="num" style={{ color: 'var(--ink-3)' }}>
                      {formatCurrency(Number(share.share_amount))}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      settledMutation.mutate({ personId: share.person_id, settled: !share.settled })
                    }
                    className={share.settled ? 'chip pos' : 'chip'}
                    style={{ cursor: 'pointer', height: 20, padding: '0 8px', fontSize: 10.5 }}
                    title={share.settled ? 'Mark unsettled' : 'Mark settled'}
                  >
                    {share.settled ? 'settled' : 'pending'}
                  </button>
                </div>
              ))}
            </div>
          </div>
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
            <NewTagChip onCreated={(id) => setSelectedTagIds((ids) => [...ids, id])} />
          </div>
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={handleSave}
          loading={editMutation.isPending}
        >
          Save changes
        </Button>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'income' | 'processed' | 'split'
type SortCol = 'date' | 'amount' | 'category'
type SortDir = 'asc' | 'desc'

export function TransactionsPage() {
  const { mode } = usePeriodMode()
  const initial = getCurrentPeriod(loadPeriodMode())
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [editingTxn, setEditingTxn] = useState<ProcessedTransactionItem | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null)
  const [draggingUid, setDraggingUid] = useState<string | null>(null)
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null)
  const [checkedUids, setCheckedUids] = useState<Set<string>>(new Set())
  const [hoveredRowUid, setHoveredRowUid] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const navigate = useNavigate()
  const toast = useToastContext()
  const qc = useQueryClient()

  // ── Queries ──
  const rawQuery = useQuery({
    queryKey: ['rawTransactions', year, month, mode],
    queryFn: () => getRawTransactions(year, month, mode),
  })
  const processedQuery = useQuery({
    queryKey: ['processedTransactions', year, month, categoryFilter, tagFilter, mode],
    queryFn: () =>
      getProcessedTransactions(
        year,
        month,
        categoryFilter || undefined,
        tagFilter || undefined,
        mode
      ),
  })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags })

  const isLoading = rawQuery.isLoading || processedQuery.isLoading
  const categories = categoriesQuery.data ?? []
  const shortcutCats = categories.slice(0, 9)

  // ── Unified list ──
  const allTxns = buildUnified(rawQuery.data ?? [], processedQuery.data ?? [])

  // ── Filter ──
  const filtered = allTxns.filter((t) => {
    if (t.kind === 'deleted' && !showDeleted) return false
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter === 'pending' && t.kind !== 'pending') return false
    if (statusFilter === 'income' && !isIncome(t.amount)) return false
    if (statusFilter === 'processed' && t.kind !== 'processed') return false
    if (statusFilter === 'split' && t.shares.length === 0) return false
    return true
  })

  // ── Sort ──
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir(col === 'amount' ? 'desc' : 'asc')
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'date') cmp = a.txn_date.localeCompare(b.txn_date)
    else if (sortCol === 'amount')
      cmp = Math.abs(Number(a.effectiveAmount)) - Math.abs(Number(b.effectiveAmount))
    else if (sortCol === 'category') cmp = (a.category ?? '').localeCompare(b.category ?? '')
    return sortDir === 'asc' ? cmp : -cmp
  })

  const pendingCount = allTxns.filter((t) => t.kind === 'pending').length
  const incomeCount = allTxns.filter((t) => t.kind !== 'deleted' && isIncome(t.amount)).length
  const deletedCount = allTxns.filter((t) => t.kind === 'deleted').length
  const total = allTxns
    .filter((t) => t.kind !== 'deleted')
    .reduce((s, t) => s + Number(t.effectiveAmount), 0)

  // ── Month navigation ──
  function prevMonth() {
    setSelectedUid(null)
    setEditingTxn(null)
    setCheckedUids(new Set())
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    setSelectedUid(null)
    setEditingTxn(null)
    setCheckedUids(new Set())
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else setMonth((m) => m + 1)
  }

  async function handleBulkDelete() {
    const toDelete = filtered.filter((t) => checkedUids.has(t.uid) && t.kind !== 'deleted')
    if (toDelete.length === 0) return
    await Promise.allSettled([
      ...toDelete
        .filter((t) => t.kind === 'pending' && t.rawId)
        .map((t) => deleteRawTransaction(t.rawId!)),
      ...toDelete
        .filter((t) => t.kind === 'processed' && t.processedId)
        .map((t) => deleteProcessedTransaction(t.processedId!)),
    ])
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['rawTransactions', year, month] }),
      qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] }),
    ])
    setCheckedUids(new Set())
    toast.success(`Deleted ${toDelete.length} transaction${toDelete.length > 1 ? 's' : ''}`)
  }

  // ── Mutations ──
  const deleteRawMutation = useMutation({
    mutationFn: deleteRawTransaction,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['rawTransactions', year, month] })
      const prev = qc.getQueryData<RawTransaction[]>(['rawTransactions', year, month])
      qc.setQueryData<RawTransaction[]>(
        ['rawTransactions', year, month],
        (old) => old?.map((t) => (t.id === id ? { ...t, status: 'deleted' } : t)) ?? []
      )
      if (selectedUid === 'raw_' + id) setSelectedUid(null)
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['rawTransactions', year, month], ctx.prev)
      toast.error('Failed to delete')
    },
  })

  const restoreRawMutation = useMutation({
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
      toast.error('Failed to restore')
    },
  })

  const deleteProcMutation = useMutation({
    mutationFn: deleteProcessedTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['rawTransactions', year, month] })
      toast.success('Transaction deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const quickCategorizeMutation = useMutation({
    mutationFn: ({ rawId, categoryId }: { rawId: string; categoryId: string }) =>
      processTransaction({
        raw_txn_id: rawId,
        category_id: categoryId,
        save_mapping: true,
        shares: [],
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rawTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
      toast.success('Categorized')
    },
    onError: (err: { detail: string }) => toast.error(err.detail ?? 'Failed to categorize'),
  })

  const changeCategoryMutation = useMutation({
    mutationFn: ({ procId, categoryId }: { procId: string; categoryId: string }) =>
      editProcessedTransaction(procId, { category_id: categoryId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
      toast.success('Category updated')
    },
    onError: () => toast.error('Failed to update category'),
  })

  const autoMutation = useMutation({
    mutationFn: autoCategorise,
    onSuccess: (data) => {
      toast.success(
        `${data.auto_categorised} auto-categorised, ${data.pending_manual} need manual review`
      )
      void qc.invalidateQueries({ queryKey: ['rawTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['processedTransactions', year, month] })
      void qc.invalidateQueries({ queryKey: ['pendingManual'] })
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  // ── Drag & drop ──
  function handleDragStart(uid: string) {
    setDraggingUid(uid)
    setOpenMenuUid(null)
  }

  function handleDragEnd() {
    setDraggingUid(null)
    setDragOverCatId(null)
  }

  function handleDropOnCategory(categoryId: string) {
    if (!draggingUid) return
    const txn = allTxns.find((t) => t.uid === draggingUid)
    if (!txn) return
    if (txn.kind === 'pending' && txn.rawId) {
      quickCategorizeMutation.mutate({ rawId: txn.rawId, categoryId })
      setSelectedUid(null)
    } else if (txn.kind === 'processed' && txn.processedId) {
      changeCategoryMutation.mutate({ procId: txn.processedId, categoryId })
    }
    setDraggingUid(null)
    setDragOverCatId(null)
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = selectedUid ? filtered.findIndex((t) => t.uid === selectedUid) : -1
        if (e.key === 'ArrowDown')
          setSelectedUid(filtered[Math.min(idx + 1, filtered.length - 1)]?.uid ?? null)
        else setSelectedUid(filtered[Math.max(idx - 1, 0)]?.uid ?? null)
      }

      if (e.key >= '1' && e.key <= '9' && selectedUid) {
        const cat = shortcutCats[Number(e.key) - 1]
        if (!cat) return
        const txn = filtered.find((t) => t.uid === selectedUid)
        if (!txn) return
        if (txn.kind === 'pending' && txn.rawId)
          quickCategorizeMutation.mutate({ rawId: txn.rawId, categoryId: cat.id })
        else if (txn.kind === 'processed' && txn.processedId)
          changeCategoryMutation.mutate({ procId: txn.processedId, categoryId: cat.id })
      }

      if (e.key === 'Escape') {
        if (editingTxn) {
          setEditingTxn(null)
          return
        }
        setSelectedUid(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    selectedUid,
    filtered,
    shortcutCats,
    editingTxn,
    quickCategorizeMutation,
    changeCategoryMutation,
  ])

  // Close context menu when clicking outside the menu td
  useEffect(() => {
    if (!openMenuUid) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-menu-uid]')) setOpenMenuUid(null)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openMenuUid])

  // ── Panel logic ──
  const selectedTxn = selectedUid ? filtered.find((t) => t.uid === selectedUid) : null
  const showProcessPanel =
    selectedTxn?.kind === 'pending' && !!selectedTxn.rawOriginal && !editingTxn
  const showEditPanel = !!editingTxn

  const hasActiveFilters = !!(search || categoryFilter || tagFilter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: -4 }}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4" style={{ paddingBottom: 20 }}>
        <div>
          <p className="card-eyebrow mb-1">Transactions</p>
          <h1
            className="flex items-baseline gap-3"
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              color: 'var(--ink)',
              lineHeight: 1.15,
            }}
          >
            <span>{allTxns.filter((t) => t.kind !== 'deleted').length} transactions</span>
            <span
              className="num"
              style={{
                fontSize: 17,
                fontWeight: 500,
                color: total < 0 ? 'var(--pos)' : 'var(--ink-3)',
              }}
              title={total < 0 ? 'Net income this month' : 'Net spend this month'}
            >
              {total < 0 ? '+' : ''}
              {formatCurrency(Math.abs(total))}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Month nav */}
          <div
            className="flex items-center"
            style={{
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={prevMonth}
              className="btn ghost"
              style={{
                borderRadius: 0,
                height: 30,
                width: 30,
                padding: 0,
                borderRight: '1px solid var(--line)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                chevron_left
              </span>
            </button>
            <span
              className="num"
              style={{
                padding: '0 14px',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--ink)',
                minWidth: 80,
                textAlign: 'center',
                letterSpacing: '-0.01em',
              }}
            >
              {monthLongLabel(month, mode).slice(0, 3)} {formatYearLabel(year, mode)}
            </span>
            <button
              onClick={nextMonth}
              className="btn ghost"
              style={{
                borderRadius: 0,
                height: 30,
                width: 30,
                padding: 0,
                borderLeft: '1px solid var(--line)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                chevron_right
              </span>
            </button>
          </div>

          <button onClick={() => setShowManualEntry(true)} className="btn" style={{ gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              add
            </span>
            Manual entry
          </button>

          <button onClick={() => navigate('/upload')} className="btn primary" style={{ gap: 5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              upload
            </span>
            Upload
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        className="flex flex-wrap items-center gap-2"
        style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}
      >
        {/* Search */}
        <div className="relative" style={{ width: 210 }}>
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
            placeholder="Search merchant…"
            className="input"
            style={{ paddingLeft: 28 }}
          />
        </div>

        {/* Status tabs */}
        <div
          className="flex items-center"
          style={{
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          {(['all', 'pending', 'income', 'processed', 'split'] as StatusFilter[]).map(
            (f, i, arr) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className="flex items-center gap-1.5"
                style={{
                  height: 30,
                  padding: '0 11px',
                  fontSize: 12.5,
                  fontWeight: 500,
                  background: statusFilter === f ? 'var(--ink)' : 'transparent',
                  color: statusFilter === f ? 'var(--bg)' : 'var(--ink-3)',
                  border: 'none',
                  cursor: 'pointer',
                  borderRight: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                  transition: 'background 0.1s, color 0.1s',
                  textTransform: 'capitalize',
                }}
              >
                {f}
                {f === 'pending' && pendingCount > 0 && (
                  <span
                    style={{
                      background:
                        statusFilter === 'pending' ? 'rgba(255,255,255,0.18)' : 'var(--warn-soft)',
                      color: statusFilter === 'pending' ? 'inherit' : 'var(--warn)',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      lineHeight: 1.4,
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
                {f === 'income' && incomeCount > 0 && (
                  <span
                    style={{
                      background:
                        statusFilter === 'income' ? 'rgba(255,255,255,0.18)' : 'var(--pos-soft)',
                      color: statusFilter === 'income' ? 'inherit' : 'var(--pos)',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      lineHeight: 1.4,
                    }}
                  >
                    {incomeCount}
                  </span>
                )}
              </button>
            )
          )}
        </div>

        {/* Category filter */}
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

        {/* Tag filter */}
        {(tagsQuery.data ?? []).length > 0 && (
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
        )}

        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch('')
              setCategoryFilter('')
              setTagFilter('')
            }}
            className="btn ghost sm"
          >
            Clear filters
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Auto-categorise */}
        <button
          onClick={() => autoMutation.mutate()}
          disabled={autoMutation.isPending}
          className="btn ghost sm"
          title="Auto-categorise pending transactions"
        >
          <span
            className={`material-symbols-outlined ${autoMutation.isPending ? 'animate-spin' : ''}`}
            style={{ fontSize: 14 }}
          >
            {autoMutation.isPending ? 'progress_activity' : 'auto_awesome'}
          </span>
          Auto-categorise
        </button>

        {/* Shortcuts hint */}
        <span
          className="flex items-center gap-1 text-[11px]"
          style={{ color: 'var(--ink-4)', userSelect: 'none' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
            keyboard
          </span>
          1–9 categorize · ↑↓ navigate
        </span>
      </div>

      {/* ── Category drag strip ── */}
      {categories.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2"
          style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}
        >
          <span className="shrink-0 text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
            Drop to categorize:
          </span>
          {categories.map((cat, idx) => {
            const color = categoryColor(cat.id)
            const isOver = dragOverCatId === cat.id
            return (
              <div
                key={cat.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverCatId(cat.id)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCatId(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDropOnCategory(cat.id)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px 3px 8px',
                  borderRadius: 'var(--radius)',
                  border: '1.5px solid ' + (isOver ? color : 'var(--line)'),
                  background: isOver
                    ? `color-mix(in oklch, ${color} 14%, var(--surface))`
                    : 'var(--surface)',
                  cursor: 'default',
                  transition: 'border-color 0.1s, background 0.1s',
                  fontSize: 12,
                  fontWeight: 500,
                  color: isOver ? color : 'var(--ink-2)',
                  userSelect: 'none',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span>{cat.name}</span>
                {idx < 9 && (
                  <span
                    style={{
                      marginLeft: 2,
                      fontSize: 10,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--ink-4)',
                      fontWeight: 600,
                    }}
                  >
                    {idx + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {checkedUids.size > 0 && (
        <div
          className="animate-fade-down"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            marginTop: 12,
            background: 'var(--accent-soft)',
            border: '1px solid color-mix(in oklch, var(--accent) 30%, transparent)',
            borderRadius: 'var(--radius)',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', flex: 1 }}>
            {checkedUids.size} selected
          </span>
          <button
            onClick={() => void handleBulkDelete()}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 'var(--radius)',
              background: 'var(--neg)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Delete {checkedUids.size}
          </button>
          <button
            onClick={() => setCheckedUids(new Set())}
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 'var(--radius)',
              background: 'none',
              color: 'var(--ink-3)',
              border: '1px solid var(--line)',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Table card ── */}
      <div className="card card-flush mt-4" style={{ overflow: 'clip' }}>
        {isLoading ? (
          <SkeletonTable />
        ) : allTxns.filter((t) => t.kind !== 'deleted').length === 0 ? (
          <p className="py-10 text-center text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
            No transactions for this period.
          </p>
        ) : (
          <div className="flex min-h-0">
            {/* Table */}
            <div className="min-w-0 flex-1 overflow-x-auto">
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 32 }} />
                  <col style={{ width: 78 }} />
                  <col />
                  <col style={{ width: 160 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 54 }} />
                  <col style={{ width: 114 }} />
                  <col style={{ width: 38 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {/* Select-all checkbox */}
                    <th style={{ padding: '8px 0 8px 10px', width: 36 }}>
                      {filtered.filter((t) => t.kind !== 'deleted').length > 0 && (
                        <input
                          type="checkbox"
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                          checked={
                            checkedUids.size > 0 &&
                            filtered
                              .filter((t) => t.kind !== 'deleted')
                              .every((t) => checkedUids.has(t.uid))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCheckedUids(
                                new Set(
                                  filtered.filter((t) => t.kind !== 'deleted').map((t) => t.uid)
                                )
                              )
                            } else {
                              setCheckedUids(new Set())
                            }
                          }}
                        />
                      )}
                    </th>
                    <th style={{ padding: '8px 0 8px 4px' }} />
                    {(
                      [
                        { label: 'Date', col: 'date' as SortCol },
                        { label: 'Merchant', col: null },
                        { label: 'Category', col: 'category' as SortCol },
                        { label: 'Tags', col: null },
                      ] as { label: string; col: SortCol | null }[]
                    ).map(({ label, col }) => (
                      <th
                        key={label}
                        onClick={col ? () => toggleSort(col) : undefined}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: 10.5,
                          fontWeight: 600,
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          color: col && sortCol === col ? 'var(--ink-2)' : 'var(--ink-4)',
                          cursor: col ? 'pointer' : 'default',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                        {col && sortCol === col && (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 12, marginLeft: 3, verticalAlign: 'middle' }}
                          >
                            {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        )}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-4)',
                      }}
                    >
                      Split
                    </th>
                    <th
                      onClick={() => toggleSort('amount')}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: sortCol === 'amount' ? 'var(--ink-2)' : 'var(--ink-4)',
                        fontVariantNumeric: 'tabular-nums',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Amount
                      {sortCol === 'amount' && (
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 12, marginLeft: 3, verticalAlign: 'middle' }}
                        >
                          {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: '40px 0',
                          textAlign: 'center',
                          fontSize: 12.5,
                          color: 'var(--ink-3)',
                        }}
                      >
                        No transactions match your filters.
                      </td>
                    </tr>
                  ) : (
                    sorted.map((txn) => {
                      const isSelected = selectedUid === txn.uid
                      const catColor = txn.categoryId
                        ? categoryColor(txn.categoryId)
                        : 'var(--warn)'
                      const isDragging = draggingUid === txn.uid
                      const isDeleted = txn.kind === 'deleted'
                      const hasMenu = openMenuUid === txn.uid
                      const { display: amtDisplay, income: txnIncome } = formatAmount(
                        txn.effectiveAmount
                      )

                      return (
                        <tr
                          key={txn.uid}
                          draggable={!isDeleted}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            handleDragStart(txn.uid)
                          }}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (isDeleted) return
                            if (txn.kind === 'pending') {
                              setSelectedUid(isSelected ? null : txn.uid)
                              setEditingTxn(null)
                            } else if (txn.processedOriginal) {
                              setEditingTxn(
                                editingTxn?.id === txn.processedId ? null : txn.processedOriginal
                              )
                              setSelectedUid(txn.uid)
                            }
                          }}
                          style={{
                            borderBottom: '1px solid var(--line)',
                            background: isSelected ? 'var(--accent-soft)' : 'transparent',
                            opacity: isDragging || isDeleted ? 0.4 : 1,
                            cursor: isDeleted ? 'default' : 'pointer',
                            transition: 'background 0.08s',
                          }}
                          onMouseEnter={(e) => {
                            setHoveredRowUid(txn.uid)
                            if (!isSelected && !isDeleted)
                              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                          }}
                          onMouseLeave={(e) => {
                            setHoveredRowUid(null)
                            if (!isSelected)
                              (e.currentTarget as HTMLElement).style.background = isSelected
                                ? 'var(--accent-soft)'
                                : 'transparent'
                          }}
                        >
                          {/* Checkbox */}
                          <td
                            style={{ padding: '0 0 0 10px' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isDeleted) return
                              setCheckedUids((prev) => {
                                const next = new Set(prev)
                                if (next.has(txn.uid)) next.delete(txn.uid)
                                else next.add(txn.uid)
                                return next
                              })
                            }}
                          >
                            {(checkedUids.has(txn.uid) || hoveredRowUid === txn.uid) &&
                              !isDeleted && (
                                <input
                                  type="checkbox"
                                  checked={checkedUids.has(txn.uid)}
                                  onChange={() => {}}
                                  style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                                />
                              )}
                          </td>

                          {/* Drag handle */}
                          <td
                            style={{ padding: '0 0 0 6px', cursor: isDeleted ? 'default' : 'grab' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: 16,
                                color: 'var(--ink-4)',
                                display: 'block',
                                opacity: isDeleted ? 0.3 : 1,
                              }}
                            >
                              drag_indicator
                            </span>
                          </td>

                          {/* Date */}
                          <td
                            style={{
                              padding: '11px 12px',
                              fontSize: 12.5,
                              color: 'var(--ink-3)',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatShortDate(txn.txn_date)}
                          </td>

                          {/* Merchant */}
                          <td style={{ padding: '11px 12px', minWidth: 0 }}>
                            <span
                              style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: 13,
                                fontWeight: 500,
                                color: 'var(--ink)',
                                textDecoration: isDeleted ? 'line-through' : 'none',
                              }}
                            >
                              {txn.description}
                            </span>
                            {txn.notes && (
                              <span
                                style={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: 11,
                                  color: 'var(--ink-3)',
                                  marginTop: 1,
                                }}
                              >
                                {txn.notes}
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td style={{ padding: '11px 12px' }}>
                            {txn.kind === 'pending' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: txnIncome ? 'var(--pos-soft)' : 'var(--warn-soft)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: txnIncome ? 'var(--pos)' : 'var(--warn)',
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: txnIncome ? 'var(--pos)' : 'var(--warn)',
                                    flexShrink: 0,
                                  }}
                                />
                                {txnIncome ? 'income' : 'pending'}
                              </span>
                            ) : isDeleted ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--neg-soft)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: 'var(--neg)',
                                }}
                              >
                                deleted
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: `color-mix(in oklch, ${catColor} 13%, var(--surface))`,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: catColor,
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: catColor,
                                    flexShrink: 0,
                                  }}
                                />
                                {txn.category}
                              </span>
                            )}
                          </td>

                          {/* Tags */}
                          <td style={{ padding: '11px 12px' }}>
                            {txn.tags.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
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
                            ) : (
                              <span style={{ color: 'var(--ink-4)', fontSize: 14 }}>—</span>
                            )}
                          </td>

                          {/* Split */}
                          <td
                            style={{ padding: '11px 12px', textAlign: 'center' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                if (txn.processedOriginal) setEditingTxn(txn.processedOriginal)
                                else if (txn.rawOriginal) setSelectedUid(txn.uid)
                              }}
                              className="btn ghost icon sm"
                              title={txn.shares.length > 0 ? 'View split' : 'Add split'}
                              style={{
                                margin: '0 auto',
                                opacity: txn.shares.length > 0 ? 1 : 0.3,
                                color: txn.shares.length > 0 ? 'var(--accent)' : 'var(--ink-3)',
                              }}
                              disabled={isDeleted}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                call_split
                              </span>
                            </button>
                          </td>

                          {/* Amount */}
                          <td
                            style={{
                              padding: '11px 12px',
                              textAlign: 'right',
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: txnIncome ? 'var(--pos)' : 'var(--ink)',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {txnIncome ? '+' : ''}
                            {amtDisplay}
                          </td>

                          {/* Context menu */}
                          <td
                            data-menu-uid={txn.uid}
                            style={{
                              padding: '0 6px 0 0',
                              textAlign: 'right',
                              position: 'relative',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuUid(hasMenu ? null : txn.uid)
                              }}
                              className="btn ghost icon sm"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                more_horiz
                              </span>
                            </button>

                            {hasMenu && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 6,
                                  top: '100%',
                                  zIndex: 30,
                                  background: 'var(--surface)',
                                  border: '1px solid var(--line)',
                                  borderRadius: 'var(--radius)',
                                  boxShadow: 'var(--shadow-pop)',
                                  minWidth: 140,
                                  padding: '4px 0',
                                }}
                              >
                                {txn.kind === 'pending' && txn.rawOriginal && (
                                  <button
                                    onClick={() => {
                                      setSelectedUid(txn.uid)
                                      setEditingTxn(null)
                                      setOpenMenuUid(null)
                                    }}
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '7px 12px',
                                      fontSize: 12.5,
                                      color: 'var(--ink)',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) =>
                                      ((e.currentTarget as HTMLElement).style.background =
                                        'var(--surface-2)')
                                    }
                                    onMouseLeave={(e) =>
                                      ((e.currentTarget as HTMLElement).style.background = 'none')
                                    }
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: 14 }}
                                    >
                                      receipt_long
                                    </span>
                                    Process
                                  </button>
                                )}
                                {txn.kind === 'processed' && txn.processedOriginal && (
                                  <button
                                    onClick={() => {
                                      setEditingTxn(txn.processedOriginal!)
                                      setOpenMenuUid(null)
                                    }}
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '7px 12px',
                                      fontSize: 12.5,
                                      color: 'var(--ink)',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) =>
                                      ((e.currentTarget as HTMLElement).style.background =
                                        'var(--surface-2)')
                                    }
                                    onMouseLeave={(e) =>
                                      ((e.currentTarget as HTMLElement).style.background = 'none')
                                    }
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: 14 }}
                                    >
                                      edit
                                    </span>
                                    Edit
                                  </button>
                                )}
                                {isDeleted ? (
                                  <button
                                    onClick={() => {
                                      if (txn.rawId) restoreRawMutation.mutate(txn.rawId)
                                      setOpenMenuUid(null)
                                    }}
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '7px 12px',
                                      fontSize: 12.5,
                                      color: 'var(--accent)',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) =>
                                      ((e.currentTarget as HTMLElement).style.background =
                                        'var(--surface-2)')
                                    }
                                    onMouseLeave={(e) =>
                                      ((e.currentTarget as HTMLElement).style.background = 'none')
                                    }
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: 14 }}
                                    >
                                      restore
                                    </span>
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (txn.kind === 'pending' && txn.rawId)
                                        deleteRawMutation.mutate(txn.rawId)
                                      else if (txn.kind === 'processed' && txn.processedId)
                                        deleteProcMutation.mutate(txn.processedId)
                                      setOpenMenuUid(null)
                                    }}
                                    style={{
                                      display: 'flex',
                                      width: '100%',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '7px 12px',
                                      fontSize: 12.5,
                                      color: 'var(--neg)',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) =>
                                      ((e.currentTarget as HTMLElement).style.background =
                                        'var(--surface-2)')
                                    }
                                    onMouseLeave={(e) =>
                                      ((e.currentTarget as HTMLElement).style.background = 'none')
                                    }
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: 14 }}
                                    >
                                      delete
                                    </span>
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>

              {/* Footer */}
              <div
                style={{
                  padding: '8px 14px',
                  borderTop: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 11.5,
                  color: 'var(--ink-3)',
                }}
              >
                <span>
                  {filtered.filter((t) => t.kind !== 'deleted').length} of{' '}
                  {allTxns.filter((t) => t.kind !== 'deleted').length} transactions
                </span>
                {deletedCount > 0 && (
                  <button
                    onClick={() => setShowDeleted((v) => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 11.5,
                      color: showDeleted ? 'var(--ink-2)' : 'var(--ink-4)',
                      padding: 0,
                      textDecoration: 'underline',
                      textDecorationStyle: 'dotted',
                    }}
                  >
                    {showDeleted ? 'Hide' : 'Show'} {deletedCount} deleted
                  </button>
                )}
              </div>
            </div>

            {/* ProcessPanel */}
            {showProcessPanel && selectedTxn?.rawOriginal && (
              <div
                className="shrink-0"
                style={{
                  width: 360,
                  borderLeft: '1px solid var(--line)',
                  position: 'sticky',
                  top: 24,
                  alignSelf: 'flex-start',
                  maxHeight: 'calc(100vh - 80px)',
                  overflowY: 'auto',
                }}
              >
                <ProcessPanel
                  key={selectedTxn.rawId}
                  txn={selectedTxn.rawOriginal}
                  categories={categories}
                  onClose={() => setSelectedUid(null)}
                  onProcessed={() => setSelectedUid(null)}
                />
              </div>
            )}

            {/* EditPanel */}
            {showEditPanel && (
              <div
                className="shrink-0"
                style={{
                  width: 360,
                  borderLeft: '1px solid var(--line)',
                  position: 'sticky',
                  top: 24,
                  alignSelf: 'flex-start',
                  maxHeight: 'calc(100vh - 80px)',
                  overflowY: 'auto',
                }}
              >
                <EditPanel
                  key={editingTxn!.id}
                  txn={editingTxn!}
                  categories={categories}
                  onClose={() => setEditingTxn(null)}
                  onSaved={() => setEditingTxn(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {showManualEntry && <ManualEntryDialog onClose={() => setShowManualEntry(false)} />}
    </div>
  )
}
