import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToastContext } from '@/hooks/useToastContext'
import {
  deleteProcessedTransaction,
  editProcessedTransaction,
  processTransaction,
} from '@/lib/api/transactions'
import type { PeriodMode } from '@/lib/period'
import { invalidateDomains, qk } from '@/lib/queryKeys'
import type { PersonShareIn } from '@/types/transaction'

export function useProcessedMutations(year: number, month: number, mode: PeriodMode) {
  const qc = useQueryClient()
  const toast = useToastContext()

  const deleteProcMutation = useMutation({
    mutationFn: deleteProcessedTransaction,
    onSuccess: () => {
      // Broad invalidation: the active processed query is keyed with
      // (year, month, categoryFilter, tagFilter, mode); a narrower key with
      // undefined slots won't prefix-match because React Query compares
      // element-wise. Also covers pendingManual (deletion now also soft-
      // deletes the raw, so the dashboard count needs to refresh) and
      // dashboard aggregates.
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
        save_mapping: true,
        shares,
        notes,
        tag_ids,
      }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: qk.transactions.raw(year, month, mode) })
      void qc.invalidateQueries({ queryKey: qk.transactions.processed(year, month) })
      void qc.invalidateQueries({ queryKey: qk.transactions.pendingManual() })
      // A new processed txn changes category totals on the dashboard, and
      // save_mapping=true also creates a new mapping rule.
      invalidateDomains(qc, ['dashboard', 'categoryMappings'])
      if (!variables.silent) toast.success('Categorized')
    },
    onError: (err: { detail: string }, variables) => {
      if (!variables.silent) toast.error(err.detail ?? 'Failed to categorize')
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
      void qc.invalidateQueries({ queryKey: qk.transactions.processed(year, month) })
      // Reassigns spend from one category bucket to another on the dashboard.
      invalidateDomains(qc, ['dashboard'])
      if (!variables.silent) toast.success('Category updated')
    },
    onError: (_err, variables) => {
      if (!variables.silent) toast.error('Failed to update category')
    },
  })

  return { deleteProcMutation, quickCategorizeMutation, changeCategoryMutation }
}
