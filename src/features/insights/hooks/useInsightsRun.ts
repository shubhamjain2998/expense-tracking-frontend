import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createInsightsRun,
  deleteInsightsRun,
  getLatestInsightsRun,
  type CreateInsightsRunRequest,
} from '@/lib/api/insights'
import { qk } from '@/lib/queryKeys'

/**
 * The one insights run on file for this user, plus create/delete mutations.
 * `run === null` (once loaded) means "no run yet" — the page's empty state,
 * with no timestamp shown at all per the product decision.
 */
export function useInsightsRun() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: qk.insights.latestRun(),
    queryFn: getLatestInsightsRun,
  })

  const saveMutation = useMutation({
    mutationFn: (body: CreateInsightsRunRequest) => createInsightsRun(body),
    onSuccess: (run) => {
      qc.setQueryData(qk.insights.latestRun(), run)
    },
  })

  const discardMutation = useMutation({
    mutationFn: deleteInsightsRun,
    onSuccess: () => {
      qc.setQueryData(qk.insights.latestRun(), null)
    },
  })

  return {
    run: query.data ?? null,
    isLoading: query.isLoading,
    saveRun: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    discardRun: discardMutation.mutateAsync,
    isDiscarding: discardMutation.isPending,
  }
}
