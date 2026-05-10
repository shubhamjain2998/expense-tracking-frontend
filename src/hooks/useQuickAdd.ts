import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createRawTransaction } from '@/lib/api/transactions'
import { qk } from '@/lib/queryKeys'
import type { CreateRawTransactionPayload } from '@/types/transaction'

import { useToastContext } from './useToastContext'

interface Options {
  onSuccess?: () => void
}

export function useQuickAdd({ onSuccess }: Options = {}) {
  const qc = useQueryClient()
  const toast = useToastContext()

  return useMutation({
    mutationFn: (payload: CreateRawTransactionPayload) => createRawTransaction(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.transactions.all })
      toast.success('Transaction added — go to Review to categorise')
      onSuccess?.()
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })
}
