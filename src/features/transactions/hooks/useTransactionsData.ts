import { useQuery } from '@tanstack/react-query'

import { getCategories } from '@/lib/api/categories'
import { getTags } from '@/lib/api/tags'
import { getProcessedTransactions, getRawTransactions } from '@/lib/api/transactions'
import type { PeriodMode } from '@/lib/period'
import { qk } from '@/lib/queryKeys'

export function useTransactionsData(
  year: number,
  month: number,
  categoryFilter: string,
  tagFilter: string,
  mode: PeriodMode,
  // showDeleted now controls only client-side visibility (see TransactionsList).
  // The query ALWAYS fetches with include_deleted=true so deletedCount is
  // accurate and the "Show N deleted" toggle is discoverable when there are
  // recoverable rows. Keeping the param for backwards-compat with callers.
  _showDeleted: boolean = false
) {
  const rawQuery = useQuery({
    queryKey: qk.transactions.raw(year, month, mode),
    queryFn: () => getRawTransactions(year, month, mode, true),
  })

  const processedQuery = useQuery({
    queryKey: qk.transactions.processed(
      year,
      month,
      categoryFilter || undefined,
      tagFilter || undefined,
      mode
    ),
    queryFn: () =>
      getProcessedTransactions(
        year,
        month,
        categoryFilter || undefined,
        tagFilter || undefined,
        mode
      ),
  })

  const categoriesQuery = useQuery({
    queryKey: qk.categories.all,
    queryFn: getCategories,
  })

  const tagsQuery = useQuery({
    queryKey: qk.tags.all,
    queryFn: getTags,
  })

  return { rawQuery, processedQuery, categoriesQuery, tagsQuery }
}
