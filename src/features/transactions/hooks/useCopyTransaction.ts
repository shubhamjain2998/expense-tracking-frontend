import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToastContext } from '@/hooks/useToastContext'
import { createRawTransaction, processTransaction } from '@/lib/api/transactions'
import { invalidateDomains } from '@/lib/queryKeys'
import type { PersonShareIn } from '@/types/transaction'

import { monthYearLabel } from '../lib/copyDate'
import type { UnifiedTxn } from '../types'

export interface CopyTransactionArgs {
  source: UnifiedTxn
  /** Target date, "YYYY-MM-DD". */
  txnDate: string
}

export interface CopyTransactionResult {
  /** True when the copy came out categorised rather than in Needs review. */
  processed: boolean
  txnDate: string
}

/**
 * A share comes back from the API with the person's name and the already-
 * computed rupee amount; the write side takes only the rule (percentage or
 * fixed) it was defined by. Re-sending the rule — not the computed amount —
 * is what lets the copy re-split correctly.
 */
function toShareIn(shares: UnifiedTxn['shares']): PersonShareIn[] {
  return shares.map((s) => ({
    person_id: s.person_id,
    share_type: s.share_type,
    share_value: Number(s.share_value),
  }))
}

interface Options {
  /** Offered on the success toast so the new row is one click away. */
  onViewMonth?: (calYear: number, calMonth: number) => void
}

/**
 * Copy an existing row into another month.
 *
 * Same chain as categorising by hand (ProcessPanel): create the raw row, then
 * process it with category, tags, notes, splits and type in the single
 * `/process` call that accepts all of them. `save_mapping` stays false — a
 * copy repeats one charge, it is not the user teaching a rule, and the source
 * row already taught whatever rule it was going to.
 *
 * A pending (uncategorised) source has nothing to process, so its copy stops
 * after the raw row and lands in Needs review, exactly where the original sits.
 */
export function useCopyTransaction({ onViewMonth }: Options = {}) {
  const qc = useQueryClient()
  const toast = useToastContext()

  return useMutation<CopyTransactionResult, { detail?: string }, CopyTransactionArgs>({
    mutationFn: async ({ source, txnDate }) => {
      const created = await createRawTransaction({
        txn_date: `${txnDate}T00:00:00`,
        description: source.description,
        // The raw amount, not the split-adjusted one: the copy carries the
        // same shares, so the backend recomputes the same effective amount.
        amount: Number(source.amount),
        ...(source.txnType ? { txn_type: source.txnType } : {}),
      })

      if (source.kind !== 'processed' || !source.categoryId) {
        return { processed: false, txnDate }
      }

      await processTransaction({
        raw_txn_id: created.id,
        category_id: source.categoryId,
        save_mapping: false,
        shares: toShareIn(source.shares),
        notes: source.notes ?? null,
        ...(source.tags.length ? { tag_ids: source.tags.map((t) => t.id) } : {}),
        ...(source.txnType ? { txn_type: source.txnType } : {}),
      })

      return { processed: true, txnDate }
    },
    onSuccess: (result) => {
      // A copy into any month changes that month's list and every aggregate
      // built from it — including months the user is not looking at, which is
      // the normal case here.
      invalidateDomains(qc, result.processed ? ['transactions', 'dashboard'] : ['transactions'])
      const label = monthYearLabel(result.txnDate)
      const [calYear, calMonth] = result.txnDate.split('-').map(Number)
      toast.success(
        result.processed
          ? `Copied to ${label}`
          : `Copied to ${label} — it needs a category there too`,
        onViewMonth
          ? { action: { label: 'View', onClick: () => onViewMonth(calYear, calMonth) } }
          : undefined
      )
    },
    onError: (err) => toast.error(err.detail ?? 'Failed to copy transaction'),
  })
}
