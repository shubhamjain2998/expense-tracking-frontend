/**
 * Drives the Getting Started checklist on the Dashboard.
 *
 * Combines four cached queries into four boolean steps. Queries are shared
 * with the rest of the app via React Query, so opening the checklist does
 * not trigger new network calls in most navigations.
 */

import { useQuery } from '@tanstack/react-query'

import { getBudget } from '@/lib/api/budget'
import { getCategories } from '@/lib/api/categories'
import { getAllProcessedTransactions, getPendingManual } from '@/lib/api/transactions'
import { qk } from '@/lib/queryKeys'

export interface OnboardingProgress {
  hasCategories: boolean
  hasBudget: boolean
  hasUpload: boolean
  hasReview: boolean
  /** 0..4 — how many steps are complete. */
  completedCount: number
  /** True when all four are done. */
  isComplete: boolean
  /** Any underlying query is still in its first load. */
  isLoading: boolean
}

const STALE = 60_000

export function useOnboardingProgress(): OnboardingProgress {
  const currentYear = new Date().getFullYear()

  const categoriesQ = useQuery({
    queryKey: qk.categories.all,
    queryFn: getCategories,
    staleTime: STALE,
  })

  const budgetQ = useQuery({
    queryKey: qk.budget.byYear(currentYear),
    queryFn: () => getBudget(currentYear),
    staleTime: STALE,
    // Backend returns 404 when no budget exists for the year — we treat that
    // as "empty" rather than an error so the checklist still renders.
    retry: false,
  })

  const pendingQ = useQuery({
    queryKey: qk.transactions.pendingManual(),
    queryFn: getPendingManual,
    staleTime: STALE,
  })

  const processedQ = useQuery({
    queryKey: qk.transactions.processedAll(),
    queryFn: getAllProcessedTransactions,
    staleTime: STALE,
  })

  const hasCategories = (categoriesQ.data?.length ?? 0) > 0
  const hasBudget = (budgetQ.data?.length ?? 0) > 0
  const hasUpload = (pendingQ.data?.length ?? 0) > 0 || (processedQ.data?.length ?? 0) > 0
  const hasReview = (processedQ.data?.length ?? 0) > 0

  const completedCount = [hasCategories, hasBudget, hasUpload, hasReview].filter(Boolean).length

  return {
    hasCategories,
    hasBudget,
    hasUpload,
    hasReview,
    completedCount,
    isComplete: completedCount === 4,
    isLoading:
      categoriesQ.isLoading || budgetQ.isLoading || pendingQ.isLoading || processedQ.isLoading,
  }
}
