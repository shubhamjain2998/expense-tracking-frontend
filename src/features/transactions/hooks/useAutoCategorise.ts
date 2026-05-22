import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToastContext } from '@/hooks/useToastContext'
import { autoCategorise, editProcessedTransaction } from '@/lib/api/transactions'
import { qk } from '@/lib/queryKeys'
import type { ProcessedTransactionItem } from '@/types/transaction'

export function useAutoCategorise() {
  const qc = useQueryClient()
  const toast = useToastContext()

  const autoMutation = useMutation({
    mutationFn: async () => {
      // Snapshot all currently cached processed transactions before the API call
      const beforeEntries = qc.getQueriesData<ProcessedTransactionItem[]>({
        queryKey: ['transactions', 'processed'],
      })
      const beforeIds = new Set(beforeEntries.flatMap(([, data]) => (data ?? []).map((p) => p.id)))
      const beforeData = beforeEntries.flatMap(([, data]) => data ?? [])

      const result = await autoCategorise()
      return { result, beforeIds, beforeData }
    },
    onSuccess: async ({ result, beforeIds, beforeData }) => {
      toast.success(
        `${result.auto_categorised} auto-categorised, ${result.pending_manual} need manual review`
      )

      if (result.auto_categorised > 0) {
        try {
          // Wait for processed queries to reflect newly created transactions
          await qc.refetchQueries({ queryKey: ['transactions', 'processed'] })

          const afterEntries = qc.getQueriesData<ProcessedTransactionItem[]>({
            queryKey: ['transactions', 'processed'],
          })
          const afterData = afterEntries.flatMap(([, data]) => data ?? [])

          // Newly auto-categorised = appeared after the API call
          const newTxns = afterData.filter((p) => !beforeIds.has(p.id))

          // For each new transaction, apply context from the most recent matching reference
          await Promise.all(
            newTxns.map(async (newTxn) => {
              const reference = beforeData
                .filter(
                  (p) =>
                    p.description === newTxn.description &&
                    (p.tags.length > 0 || p.shares.length > 0 || p.notes)
                )
                .sort((a, b) => b.txn_date.localeCompare(a.txn_date))[0]

              if (!reference) return

              await editProcessedTransaction(newTxn.id, {
                tag_ids: reference.tags.map((t) => t.id),
                shares: reference.shares.map((s) => ({
                  person_id: s.person_id,
                  share_type: s.share_type,
                  share_value: Number(s.share_value),
                })),
                notes: reference.notes,
              }).catch(() => {})
            })
          )
        } catch {
          // patch step failed — final invalidation still refreshes the UI
        }
      }

      void qc.invalidateQueries({ queryKey: qk.transactions.all })
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  return { autoMutation }
}
