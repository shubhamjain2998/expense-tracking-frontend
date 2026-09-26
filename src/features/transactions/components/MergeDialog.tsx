import { useEffect, useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useFocusReturn } from '@/hooks/useFocusReturn'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { MergeMember, MergeTransactionsPayload } from '@/types/transaction'

import type { UnifiedTxn } from '../types'

interface MergeDialogProps {
  /** The rows the user checked, in list order. At least two. */
  txns: UnifiedTxn[]
  loading?: boolean
  onMerge: (payload: MergeTransactionsPayload) => void
  onCancel: () => void
}

/** The merge endpoint addresses a row by kind + id, not by the list's uid. */
function toMember(txn: UnifiedTxn): MergeMember | null {
  if (txn.kind === 'pending' && txn.rawId) return { kind: 'pending', id: txn.rawId }
  if (txn.kind === 'processed' && txn.processedId) return { kind: 'processed', id: txn.processedId }
  return null
}

/** Money in and money out cannot be merged — the backend rejects it, and the
 *  amounts would cancel out rather than add up. */
function direction(txn: UnifiedTxn): 'in' | 'out' {
  if (txn.txnType) return txn.txnType === 'expense' ? 'out' : 'in'
  return Number(txn.amount) < 0 ? 'in' : 'out'
}

export function MergeDialog({ txns, loading = false, onMerge, onCancel }: MergeDialogProps) {
  const titleId = useId()
  const [baseUid, setBaseUid] = useState(txns[0]?.uid ?? '')

  useFocusReturn(true)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const total = txns.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
  const mixedDirections = new Set(txns.map(direction)).size > 1
  const unaddressable = txns.some((t) => toMember(t) === null)
  const base = txns.find((t) => t.uid === baseUid) ?? txns[0]
  const blocked = mixedDirections || unaddressable || txns.length < 2

  function handleMerge() {
    if (blocked || !base) return
    const baseMember = toMember(base)
    if (!baseMember) return
    const sources = txns
      .filter((t) => t.uid !== base.uid)
      .map(toMember)
      .filter((m): m is MergeMember => m !== null)
    onMerge({ base: baseMember, sources })
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-[8px] md:p-10"
      style={{
        background: 'color-mix(in srgb, var(--bg) 60%, transparent)',
        animation: 'fade-up .15s ease',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* A real button, not a click-handled <div>: the backdrop is a
          dismiss control, so it should be reachable and announced as one. */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close merge dialog"
        onClick={onCancel}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        style={{ animation: 'pop .18s ease' }}
      >
        <div className="border-b border-[var(--line)] px-5 pt-[18px] pb-3">
          <h2
            id={titleId}
            className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]"
          >
            Merge {txns.length} transactions
          </h2>
          <p className="mt-1 text-[12.5px] text-[var(--ink-3)]">
            One row survives with the date and description you pick. The others move to the deleted
            bucket, so you can restore them.
          </p>
        </div>

        <div className="overflow-auto px-5 py-[14px]">
          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="mb-2 text-[11px] font-semibold tracking-[0.09em] text-[var(--ink-3)] uppercase">
              Keep as base
            </legend>
            <div className="flex flex-col gap-1">
              {txns.map((txn) => (
                <label
                  key={txn.uid}
                  className="flex cursor-pointer items-center gap-[9px] rounded-[var(--radius)] px-2 py-2 hover:bg-[var(--surface-2)]"
                >
                  <input
                    type="radio"
                    name="merge-base"
                    value={txn.uid}
                    checked={txn.uid === base?.uid}
                    onChange={() => setBaseUid(txn.uid)}
                  />
                  <span className="w-[54px] shrink-0 text-[12px] text-[var(--ink-3)]">
                    {formatShortDate(txn.txn_date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink)]">
                    {txn.description}
                  </span>
                  <span
                    className="num shrink-0 text-[13px] text-[var(--ink-2)]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCurrency(Math.abs(Number(txn.amount)), { fractionDigits: 2 })}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div
            className="mt-3 flex items-center justify-between rounded-[var(--radius)] px-3 py-2"
            style={{ background: 'var(--surface-2)' }}
          >
            <span className="text-[12.5px] text-[var(--ink-2)]">Merged amount</span>
            <span
              className="text-[14px] font-bold text-[var(--ink)]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCurrency(total, { fractionDigits: 2 })}
            </span>
          </div>

          {mixedDirections && (
            <p
              className="mt-3 flex items-start gap-2 text-[12.5px]"
              style={{ color: 'var(--neg)' }}
            >
              <Icon name="warning" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              These rows mix money in with money out. Merging them would cancel the amounts out
              instead of adding them, so pick rows that go the same way.
            </p>
          )}
          {unaddressable && !mixedDirections && (
            <p
              className="mt-3 flex items-start gap-2 text-[12.5px]"
              style={{ color: 'var(--neg)' }}
            >
              <Icon name="warning" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              Deleted rows can't be merged. Clear them from the selection first.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
          <Button variant="tertiary" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleMerge}
            loading={loading}
            disabled={blocked}
          >
            Merge
          </Button>
        </div>
      </div>
    </div>
  )
}
