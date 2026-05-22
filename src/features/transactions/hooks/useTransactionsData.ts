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
  showDeleted: boolean = false
) {
  const rawQuery = useQuery({
    queryKey: [...qk.transactions.raw(year, month, mode), showDeleted],
    queryFn: () => getRawTransactions(year, month, mode, showDeleted),
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
