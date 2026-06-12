import { useQuery } from '@tanstack/react-query'

import { usePeriodMode } from '@/hooks/usePeriodMode'
import { getDashboardSummary, getSplitLedger } from '@/lib/api/dashboard'
import { getPendingManual } from '@/lib/api/transactions'
import { qk } from '@/lib/queryKeys'
import type { PendingManualTransaction } from '@/types/transaction'

export interface SidebarStats {
  spent: number
  totalBudget: number
  owedToYou: number
  pendingCount: number
  pendingItems: PendingManualTransaction[]
  isLoading: boolean
}

export function useSidebarStats(): SidebarStats {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  // Include period_mode in the query keys so they match useDashboardData's
  // keys exactly when the dashboard is on the current month — React Query
  // then deduplicates the request and serves both from the same cache entry.
  const { mode } = usePeriodMode()

  const summaryQ = useQuery({
    queryKey: qk.dashboard.summary(year, month, mode),
    queryFn: () => getDashboardSummary(year, month, undefined, mode),
    staleTime: 5 * 60_000,
  })

  const ledgerQ = useQuery({
    queryKey: qk.dashboard.splitLedger(year, month, false, mode),
    queryFn: () => getSplitLedger(year, month, false, mode),
    staleTime: 5 * 60_000,
  })

  const pendingQ = useQuery({
    queryKey: qk.transactions.pendingManual(),
    queryFn: getPendingManual,
    staleTime: 60_000,
  })

  const rows = summaryQ.data ?? []
  const spent = rows.filter((r) => Number(r.actual) > 0).reduce((s, r) => s + Number(r.actual), 0)
  const totalBudget = rows.reduce((s, r) => s + Number(r.allocated_monthly), 0)
  const owedToYou = (ledgerQ.data ?? []).reduce((s, r) => s + Number(r.total_split_amount), 0)
  const pendingItems = pendingQ.data ?? []
  const pendingCount = pendingItems.length

  return {
    spent,
    totalBudget,
    owedToYou,
    pendingCount,
    pendingItems,
    isLoading: summaryQ.isLoading || ledgerQ.isLoading || pendingQ.isLoading,
  }
}
