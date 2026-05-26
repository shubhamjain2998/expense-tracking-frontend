import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createCategory, getCategories } from '@/lib/api/categories'
import { getTags } from '@/lib/api/tags'
import {
  createRawTransaction,
  editProcessedTransaction,
  processTransaction,
} from '@/lib/api/transactions'
import { invalidateDomains, qk } from '@/lib/queryKeys'
import type { CreateRawTransactionPayload } from '@/types/transaction'

import { useToastContext } from './useToastContext'

interface ProcessArgs {
  category_id: string
  tag_ids?: string[]
}

interface QuickAddArgs {
  raw: CreateRawTransactionPayload
  process?: ProcessArgs
}

interface Options {
  onSuccess?: () => void
}

export function useQuickAdd({ onSuccess }: Options = {}) {
  const qc = useQueryClient()
  const toast = useToastContext()

  const categoriesQuery = useQuery({ queryKey: qk.categories.all, queryFn: getCategories })
  const tagsQuery = useQuery({ queryKey: qk.tags.all, queryFn: getTags })

  const mutation = useMutation({
    mutationFn: async ({ raw, process }: QuickAddArgs) => {
      const created = await createRawTransaction(raw)
      if (!process) return { processed: false as const, created }
      const processed = await processTransaction({
        raw_txn_id: created.id,
        category_id: process.category_id,
        save_mapping: false,
        shares: [],
        txn_type: raw.txn_type,
      })
      // Safety net: /process ignores tag_ids (and would ignore shares/notes
      // too). Mirror ProcessPanel's pattern so tags actually persist.
      if (process.tag_ids?.length) {
        await editProcessedTransaction(processed.id, { tag_ids: process.tag_ids })
      }
      return { processed: true as const, created }
    },
    onSuccess: (result) => {
      const domains = result.processed
        ? (['transactions', 'dashboard', 'categoryMappings'] as const)
        : (['transactions'] as const)
      invalidateDomains(qc, [...domains])
      toast.success(
        result.processed ? 'Transaction added' : 'Transaction added — go to Review to categorise'
      )
      onSuccess?.()
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  async function createCategoryInline(label: string): Promise<string> {
    const c = await createCategory(label)
    invalidateDomains(qc, ['categories'])
    return c.id
  }

  return {
    mutation,
    categories: categoriesQuery.data ?? [],
    tags: tagsQuery.data ?? [],
    createCategoryInline,
  }
}
