import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToastContext } from '@/hooks/useToastContext'
import {
  deleteProcessedTransaction,
  deleteRawTransaction,
  restoreRawTransaction,
} from '@/lib/api/transactions'
import type { PeriodMode } from '@/lib/period'
import { invalidateDomains, qk } from '@/lib/queryKeys'
import type { RawTransaction } from '@/types/transaction'

import type { UnifiedTxn } from '../types'

export function useRawMutations(
  year: number,
  month: number,
  mode: PeriodMode,
  selectedUid: string | null,
  setSelectedUid: (uid: string | null) => void
) {
  const qc = useQueryClient()
  const toast = useToastContext()
  const rawKey = qk.transactions.raw(year, month, mode)

  const restoreRawMutation = useMutation({
    mutationFn: restoreRawTransaction,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: rawKey })
      const prev = qc.getQueryData<RawTransaction[]>(rawKey)
      qc.setQueryData<RawTransaction[]>(
        rawKey,
        (old) => old?.map((t) => (t.id === id ? { ...t, status: 'pending' } : t)) ?? []
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(rawKey, ctx.prev)
      toast.error('Failed to restore')
    },
  })

  const deleteRawMutation = useMutation({
    mutationFn: deleteRawTransaction,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: rawKey })
      const prev = qc.getQueryData<RawTransaction[]>(rawKey)
      qc.setQueryData<RawTransaction[]>(
        rawKey,
        (old) => old?.map((t) => (t.id === id ? { ...t, status: 'deleted' } : t)) ?? []
      )
      if (selectedUid === 'raw_' + id) setSelectedUid(null)
      return { prev, id }
    },
    onSuccess: (_data, id) => {
      toast.info(`Transaction deleted. [Undo]`, {
        action: { label: 'Undo', onClick: () => restoreRawMutation.mutate(id) },
        duration: 8000,
      })
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(rawKey, ctx.prev)
      toast.error('Failed to delete')
    },
  })

  async function handleBulkDelete(
    filtered: UnifiedTxn[],
    checkedUids: Set<string>,
    setCheckedUids: (s: Set<string>) => void
  ) {
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
    await qc.invalidateQueries({ queryKey: qk.transactions.all })
    // Bulk may include processed transactions whose deletions reshape dashboard totals.
    invalidateDomains(qc, ['dashboard'])
    setCheckedUids(new Set())
    toast.success(`Deleted ${toDelete.length} transaction${toDelete.length > 1 ? 's' : ''}`)
  }

  return { deleteRawMutation, restoreRawMutation, handleBulkDelete }
}
