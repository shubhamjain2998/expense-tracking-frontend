import { useQuery } from '@tanstack/react-query'

import { getAllProcessedTransactions } from '@/lib/api/transactions'
import { qk } from '@/lib/queryKeys'
import type { ProcessedTransactionItem } from '@/types/transaction'

/**
 * Full processed-transaction history for the user, used by the redesign's
 * cross-period sections (Recurring, Habits, Seasonality day-of-week). These
 * need per-transaction `description`/`tags`/`txn_date`, which the aggregate
 * dashboard endpoints don't return.
 *
 * One request for the whole history (the dataset is small — low thousands of
 * rows) with a long `staleTime`: past months are immutable, so this rarely
 * refetches. Windowing/aggregation happens in the pure-function engines.
 */
export function useAllProcessedTransactions(): {
  transactions: ProcessedTransactionItem[]
  isLoading: boolean
} {
  const query = useQuery({
    queryKey: qk.transactions.processedAll(),
    queryFn: getAllProcessedTransactions,
    staleTime: 5 * 60_000,
  })
  return { transactions: query.data ?? [], isLoading: query.isLoading }
}
