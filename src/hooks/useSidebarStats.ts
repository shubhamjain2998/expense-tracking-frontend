import { useQuery } from '@tanstack/react-query'

import { getDashboardSummary, getSplitLedger } from '@/lib/api/dashboard'
import { getPendingManual } from '@/lib/api/transactions'
import { qk } from '@/lib/queryKeys'

export interface SidebarStats {
  spent: number
  totalBudget: number
  owedToYou: number
  pendingCount: number
  isLoading: boolean
}

export function useSidebarStats(): SidebarStats {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  const summaryQ = useQuery({
    queryKey: qk.dashboard.summary(year, month),
    queryFn: () => getDashboardSummary(year, month),
    staleTime: 5 * 60_000,
  })

  const ledgerQ = useQuery({
    queryKey: qk.dashboard.splitLedger(year, month, false),
    queryFn: () => getSplitLedger(year, month, false),
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
  const pendingCount = (pendingQ.data ?? []).length

  return {
    spent,
    totalBudget,
    owedToYou,
    pendingCount,
    isLoading: summaryQ.isLoading || ledgerQ.isLoading || pendingQ.isLoading,
  }
}
