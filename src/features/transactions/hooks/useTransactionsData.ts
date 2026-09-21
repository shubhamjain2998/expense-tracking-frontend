import { useQuery } from '@tanstack/react-query'

import { getCategories } from '@/lib/api/categories'
import { getTags } from '@/lib/api/tags'
import { getProcessedTransactions, getRawTransactions } from '@/lib/api/transactions'
import type { PeriodMode } from '@/lib/period'
import { qk } from '@/lib/queryKeys'

export function useTransactionsData(
  year: number,
  month: number,
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

  // Always fetches the whole month unfiltered — category/tag filtering
  // (including multi-value) happens client-side in the page, both because
  // the backend only accepts one category_id/tag_id and so there's a single
  // cache entry per (year, month, mode) to keep invalidated (see
  // useProcessedMutations).
  const processedQuery = useQuery({
    queryKey: qk.transactions.processed(year, month, undefined, undefined, mode),
    queryFn: () => getProcessedTransactions(year, month, undefined, undefined, mode),
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
