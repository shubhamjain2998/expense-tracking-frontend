import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToastContext } from '@/hooks/useToastContext'
import {
  deleteProcessedTransaction,
  editProcessedTransaction,
  mergeTransactions,
  processTransaction,
  unprocessTransaction,
} from '@/lib/api/transactions'
import type { PeriodMode } from '@/lib/period'
import { invalidateDomains, qk } from '@/lib/queryKeys'
import type { MergeTransactionsPayload, PersonShareIn } from '@/types/transaction'

export function useProcessedMutations(year: number, month: number, mode: PeriodMode) {
  const qc = useQueryClient()
  const toast = useToastContext()

  const deleteProcMutation = useMutation({
    mutationFn: deleteProcessedTransaction,
    onSuccess: () => {
      // Broad invalidation: also covers pendingManual (deletion now also
      // soft-deletes the raw, so the dashboard count needs to refresh) and
      // dashboard aggregates. Narrower invalidations below still pass `mode`
      // explicitly — React Query compares query keys element-wise, so an
      // omitted (undefined) slot won't prefix-match a key that has a real
      // value there, e.g. mode='fy'.
      invalidateDomains(qc, ['transactions', 'dashboard'])
      toast.success('Transaction deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const quickCategorizeMutation = useMutation({
    mutationFn: ({
      rawId,
      categoryId,
      shares = [],
      notes,
      tag_ids,
    }: {
      rawId: string
      categoryId: string
      shares?: PersonShareIn[]
      notes?: string | null
      tag_ids?: string[]
      silent?: boolean
    }) =>
      processTransaction({
        raw_txn_id: rawId,
        category_id: categoryId,
        // Quick paths (drag onto a category, bulk categorise, the 1–9 keys)
        // never save a rule. They used to always send true, so every drag —
        // twenty rows at once in a bulk drop — quietly created or rewrote a
        // mapping. Rules are made only where the user can see and set the
        // "Save as rule" toggle, in the process and edit panels.
        save_mapping: false,
        shares,
        notes,
        tag_ids,
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: qk.transactions.raw(year, month, mode) })
      void qc.invalidateQueries({
        queryKey: qk.transactions.processed(year, month, undefined, undefined, mode),
      })
      void qc.invalidateQueries({ queryKey: qk.transactions.pendingManual() })
      // A new processed txn changes category totals on the dashboard.
      invalidateDomains(qc, ['dashboard'])
      if (!variables.silent) toast.success('Categorised')
    },
    onError: (err: { detail: string }, variables) => {
      if (!variables.silent) toast.error(err.detail ?? 'Failed to categorise')
    },
  })

  const changeCategoryMutation = useMutation({
    mutationFn: ({
      procId,
      categoryId,
      tag_ids,
    }: {
      procId: string
      categoryId: string
      tag_ids?: string[]
      silent?: boolean
    }) => editProcessedTransaction(procId, { category_id: categoryId, tag_ids }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: qk.transactions.processed(year, month, undefined, undefined, mode),
      })
      // Reassigns spend from one category bucket to another on the dashboard.
      invalidateDomains(qc, ['dashboard'])
      if (!variables.silent) toast.success('Category updated')
    },
    onError: (_err, variables) => {
      if (!variables.silent) toast.error('Failed to update category')
    },
  })

  const unprocessMutation = useMutation({
    mutationFn: unprocessTransaction,
    onSuccess: () => {
      // The row moves from the processed table back to the pending one, so
      // both lists and every aggregate that counted it have to refetch.
      invalidateDomains(qc, ['transactions', 'dashboard'])
      toast.success('Moved back to review')
    },
    onError: (err: { detail?: string }) =>
      toast.error(err.detail ?? 'Failed to move back to review'),
  })

  const mergeMutation = useMutation({
    mutationFn: (payload: MergeTransactionsPayload) => mergeTransactions(payload),
    onSuccess: (result) => {
      invalidateDomains(qc, ['transactions', 'dashboard'])
      toast.success(`Merged ${result.merged_count} transactions`)
    },
    onError: (err: { detail?: string }) => toast.error(err.detail ?? 'Failed to merge'),
  })

  return {
    deleteProcMutation,
    quickCategorizeMutation,
    changeCategoryMutation,
    unprocessMutation,
    mergeMutation,
  }
}
