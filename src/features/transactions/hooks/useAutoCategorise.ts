import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToastContext } from '@/hooks/useToastContext'
import { autoCategorise } from '@/lib/api/transactions'
import { invalidateDomains } from '@/lib/queryKeys'

/**
 * Run the saved rules over the pending rows.
 *
 * The server applies a rule whole — category, tags and split — so there is
 * nothing to patch afterwards. This hook used to diff the React Query cache
 * before and after the call and copy tags off whichever sibling transaction
 * happened to be loaded, which meant a row inherited its rule's tags only
 * when the right month was already open in the browser.
 */
export function useAutoCategorise() {
  const qc = useQueryClient()
  const toast = useToastContext()

  const autoMutation = useMutation({
    mutationFn: (rawTxnIds?: string[]) => autoCategorise(rawTxnIds),
    onSuccess: (result) => {
      toast.success(
        `${result.auto_categorised} auto-categorised, ${result.pending_manual} need manual review`
      )
      invalidateDomains(qc, ['transactions', 'dashboard'])
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  return { autoMutation }
}
