import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToastContext } from '@/hooks/useToastContext'
import { autoCategorise } from '@/lib/api/transactions'
import { qk } from '@/lib/queryKeys'

export function useAutoCategorise() {
  const qc = useQueryClient()
  const toast = useToastContext()

  const autoMutation = useMutation({
    mutationFn: autoCategorise,
    onSuccess: (data) => {
      toast.success(
        `${data.auto_categorised} auto-categorised, ${data.pending_manual} need manual review`
      )
      void qc.invalidateQueries({ queryKey: qk.transactions.all })
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  return { autoMutation }
}
