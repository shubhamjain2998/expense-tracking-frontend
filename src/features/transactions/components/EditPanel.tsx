import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PersonShareBuilder } from '@/components/ui/PersonShareBuilder'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useToastContext } from '@/hooks/useToastContext'
import { createCategory } from '@/lib/api/categories'
import { createPerson, getPersons } from '@/lib/api/persons'
import { getTags } from '@/lib/api/tags'
import { editProcessedTransaction, patchShareSettled } from '@/lib/api/transactions'
import { formatCurrency } from '@/lib/format'
import { invalidateDomains, qk } from '@/lib/queryKeys'
import type { Category } from '@/types/settings'
import type {
  EditProcessedPayload,
  PersonShareIn,
  ProcessedTransactionItem,
  TxnType,
} from '@/types/transaction'

import { NewTagChip } from './NewTagChip'

interface EditPanelProps {
  txn: ProcessedTransactionItem
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export function EditPanel({ txn, categories, onClose, onSaved }: EditPanelProps) {
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
  const [txnType, setTxnType] = useState<TxnType>(txn.txn_type ?? 'expense')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(txn.tags.map((t) => t.id))
  const [categoryError, setCategoryError] = useState('')
  const personsQuery = useQuery({ queryKey: qk.persons.all, queryFn: getPersons })
  const tagsQuery = useQuery({ queryKey: qk.tags.all, queryFn: getTags })

  const initialShareIds = txn.shares
    .map((s) => s.person_id)
    .sort()
    .join(',')
  const currentShareIds = shares
    .map((s) => s.person_id)
    .sort()
    .join(',')
  const initialTagIds = txn.tags
    .map((t) => t.id)
    .sort()
    .join(',')
  const currentTagIds = [...selectedTagIds].sort().join(',')
  const isDirty =
    amount !== txn.amount ||
    description !== txn.description ||
    txnDate !== (txn.txn_date?.slice(0, 10) ?? '') ||
    categoryId !== txn.category_id ||
    notes !== (txn.notes ?? '') ||
    currentTagIds !== initialTagIds ||
    currentShareIds !== initialShareIds

  async function handleCreatePerson(name: string) {
    const p = await createPerson(name)
    invalidateDomains(qc, ['persons'])
    return p
  }
  async function handleCreateCategory(label: string): Promise<string> {
    const c = await createCategory(label)
    invalidateDomains(qc, ['categories'])
    return c.id
  }

  const editMutation = useMutation({
    mutationFn: (payload: EditProcessedPayload) => editProcessedTransaction(txn.id, payload),
    onSuccess: () => {
      // Amount / category / date / shares edits all roll up into dashboard
      // aggregates and the sidebar's split ledger.
      invalidateDomains(qc, ['transactions', 'dashboard'])
      toast.success('Transaction updated')
      onSaved()
    },
    onError: (err: { detail: string }) => toast.error(err.detail ?? 'Failed to update'),
  })

  const settledMutation = useMutation({
    mutationFn: ({ personId, settled }: { personId: string; settled: boolean }) =>
      patchShareSettled(txn.id, personId, settled),
    onSuccess: () => invalidateDomains(qc, ['transactions', 'dashboard']),
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
      txn_type: txnType,
    })
  }

  const isIncomeTxn = txnType === 'income'
  const categoryOptions = categories
    .filter((c) => !!c.is_income === isIncomeTxn)
    .map((c) => ({ value: c.id, label: c.name }))
  const totalAmount = Math.abs(Number(amount) || Number(txn.amount))

  const TXN_TYPE_OPTIONS: { value: TxnType; label: string; color: string }[] = [
    { value: 'expense', label: 'Expense', color: 'var(--ink)' },
    { value: 'income', label: 'Income', color: 'var(--pos)' },
    { value: 'refund', label: 'Refund', color: 'var(--pos)' },
    { value: 'transfer', label: 'Transfer', color: 'var(--ink-3)' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between"
        style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
      >
        <span className="flex items-center gap-2">
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.005em' }}
          >
            Edit transaction
          </span>
          {isDirty && (
            <span
              className="text-[10.5px] font-medium"
              style={{
                color: 'var(--accent)',
                background: 'var(--accent-soft)',
                borderRadius: 'var(--radius-sm)',
                padding: '1px 6px',
              }}
            >
              Unsaved
            </span>
          )}
        </span>
        <button onClick={onClose} className="btn ghost icon sm">
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto" style={{ padding: 16 }}>
        <div>
          <p className="eyebrow mb-1.5">Type</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {TXN_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (opt.value !== txnType) {
                    const newIsIncome = opt.value === 'income'
                    const selectedCat = categories.find((c) => c.id === categoryId)
                    if (selectedCat && !!selectedCat.is_income !== newIsIncome) {
                      setCategoryId('')
                    }
                    setTxnType(opt.value)
                  }
                }}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11.5,
                  fontWeight: 500,
                  border: '1px solid ' + (txnType === opt.value ? opt.color : 'var(--line)'),
                  background:
                    txnType === opt.value
                      ? `color-mix(in oklch, ${opt.color} 12%, var(--surface))`
                      : 'var(--surface-2)',
                  color: txnType === opt.value ? opt.color : 'var(--ink-3)',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="eyebrow mb-1 block">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input num"
              style={{ color: txnType === 'income' ? 'var(--pos)' : undefined }}
              min={0.01}
              max={Number.MAX_SAFE_INTEGER}
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
          onCreateError={(msg) => toast.error(msg)}
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
            <Icon name="rule" size={14} />
            Save as rule
          </span>
          <Icon name={saveMapping ? 'toggle_on' : 'toggle_off'} size={16} />
        </button>

        {personsQuery.data && (
          <PersonShareBuilder
            persons={personsQuery.data}
            shares={shares}
            onChange={setShares}
            totalAmount={totalAmount}
            onCreatePerson={handleCreatePerson}
            onCreatePersonError={(msg) => toast.error(msg)}
          />
        )}

        {txn.shares.length > 0 && (
          <div>
            <p className="eyebrow mb-1.5">Settlement</p>
            <div className="space-y-1.5">
              {txn.shares.map((share) => (
                <div key={share.person_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <span style={{ color: 'var(--ink)' }}>{share.person_name}</span>
                    <span className="num" style={{ color: 'var(--ink-3)' }}>
                      {formatCurrency(Number(share.share_amount), { fractionDigits: 2 })}
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
