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
import { editProcessedTransaction, processTransaction } from '@/lib/api/transactions'
import { invalidateDomains, qk } from '@/lib/queryKeys'
import type { Category } from '@/types/settings'
import type { PersonShareIn, RawTransaction, TxnType } from '@/types/transaction'

import { isCreditAmount } from '../lib/txnFormat'

import { NewTagChip } from './NewTagChip'

// Best guess for what the backend's classify_txn_type would pick — used as
// the default so the segmented control matches what would happen if the
// user didn't touch it. Never defaults to 'income' (classifier never does).
function defaultTxnTypeFor(amount: string | number): TxnType {
  return isCreditAmount(amount) ? 'refund' : 'expense'
}

const TXN_TYPE_OPTIONS: { value: TxnType; label: string; color: string }[] = [
  { value: 'expense', label: 'Expense', color: 'var(--ink)' },
  { value: 'income', label: 'Income', color: 'var(--pos)' },
  { value: 'refund', label: 'Refund', color: 'var(--pos)' },
  { value: 'transfer', label: 'Transfer', color: 'var(--ink-3)' },
]

interface ProcessPanelProps {
  txn: RawTransaction
  categories: Category[]
  onClose: () => void
  onProcessed: () => void
}

export function ProcessPanel({ txn, categories, onClose, onProcessed }: ProcessPanelProps) {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [amount, setAmount] = useState(txn.amount)
  const [txnDate, setTxnDate] = useState(txn.txn_date?.slice(0, 10) ?? '')
  const [categoryId, setCategoryId] = useState('')
  // Off by default, as in EditPanel: a rule changes how every future
  // matching transaction is filed, so the user opts in per transaction.
  const [saveMapping, setSaveMapping] = useState(false)
  const [shares, setShares] = useState<PersonShareIn[]>([])
  const [notes, setNotes] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [txnType, setTxnType] = useState<TxnType>(txn.txn_type ?? defaultTxnTypeFor(txn.amount))

  const personsQuery = useQuery({ queryKey: qk.persons.all, queryFn: getPersons })
  const tagsQuery = useQuery({ queryKey: qk.tags.all, queryFn: getTags })

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

  const processMutation = useMutation({
    mutationFn: processTransaction,
    onSuccess: async (data) => {
      const parsedAmount = Number(amount)
      const amountChanged =
        !isNaN(parsedAmount) && parsedAmount !== 0 && parsedAmount !== Number(txn.amount)
      const dateChanged = !!txnDate && txnDate !== txn.txn_date?.slice(0, 10)
      // Tags, shares and notes go in the process call itself, which is also
      // what teaches the rule when save_mapping is on. Only the two fields
      // POST /process cannot set — a corrected amount or date — need a patch.
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
      // A new processed txn shows up in dashboard category totals; with
      // save_mapping=true the backend also persists a new mapping rule.
      invalidateDomains(qc, ['transactions', 'dashboard', 'categoryMappings'])
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
      txn_type: txnType,
    })
  }

  const isIncomeTxn = txnType === 'income'
  const categoryOptions = categories
    .filter((c) => !!c.is_income === isIncomeTxn)
    .map((c) => ({ value: c.id, label: c.name }))
  const totalAmount = Math.abs(Number(amount) || Number(txn.amount))
  // Tint affordances ('this is incoming money') when the user has marked it
  // income or refund — both behave the same way visually.
  const isIncoming = txnType === 'income' || txnType === 'refund'

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
        <button onClick={onClose} className="btn ghost icon sm" aria-label="Close">
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto" style={{ padding: 16 }}>
        <div>
          <p className="eyebrow mb-1.5" id="process-txn-type-label">
            Type
          </p>
          <div
            role="group"
            aria-labelledby="process-txn-type-label"
            style={{ display: 'flex', gap: 6 }}
          >
            {TXN_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="txn-type-btn"
                aria-pressed={txnType === opt.value}
                onClick={() => {
                  if (opt.value === txnType) return
                  // Same rule as EditPanel: only drop the picked category
                  // when it cannot stay (income vs spend categories). It used
                  // to be cleared on every click, so Expense → Refund threw
                  // away a category that was still valid.
                  const selectedCat = categories.find((c) => c.id === categoryId)
                  if (selectedCat && !!selectedCat.is_income !== (opt.value === 'income'))
                    setCategoryId('')
                  setTxnType(opt.value)
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
                      ? `color-mix(in srgb, ${opt.color} 12%, var(--surface))`
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
        <div
          style={{
            background: isIncoming
              ? 'color-mix(in oklch, var(--pos-soft) 60%, var(--surface-2))'
              : 'var(--surface-2)',
            border:
              '1px solid ' +
              (isIncoming ? 'color-mix(in oklch, var(--pos) 20%, transparent)' : 'var(--line)'),
            borderRadius: 'var(--radius)',
            padding: 14,
          }}
        >
          <p className="text-[12px] font-medium" style={{ color: 'var(--ink-3)' }}>
            {txn.description}
          </p>
          <input
            type="number"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input num mt-1 w-full"
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              height: 38,
              color: isIncoming ? 'var(--pos)' : 'var(--ink)',
            }}
            min={0.01}
            max={Number.MAX_SAFE_INTEGER}
            step="0.01"
          />
          <input
            type="date"
            aria-label="Date"
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
          onCreateError={(msg) => toast.error(msg)}
        />

        <button
          type="button"
          onClick={() => setSaveMapping((v) => !v)}
          aria-pressed={saveMapping}
          className={`flex w-full items-center justify-between ${saveMapping ? 'chip accent' : 'chip'}`}
          style={{ cursor: 'pointer', padding: '8px 12px', fontSize: 12.5 }}
          title="Teach the rule for this merchant: category, tags and split"
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

        <div>
          <label className="eyebrow mb-1 block" htmlFor="process-txn-notes">
            Notes (optional)
          </label>
          <textarea
            id="process-txn-notes"
            name="notes"
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
            {/* A tag made here is for this row, so it starts selected — as in
                EditPanel and the add dialog. It used to appear unselected. */}
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
