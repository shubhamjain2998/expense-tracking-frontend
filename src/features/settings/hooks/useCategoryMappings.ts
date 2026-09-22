import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import {
  createCategoryMapping,
  deleteCategoryMapping,
  getCategoryMappings,
  updateCategoryMapping,
} from '@/lib/api/categories'
import { invalidateDomains, qk } from '@/lib/queryKeys'
import type { CategoryMapping, MappingSharePayload } from '@/types/settings'

/** The three things a rule carries, as the edit form holds them. */
export interface RuleDraft {
  pattern: string
  categoryId: string
  tagIds: string[]
  shares: MappingSharePayload[]
}

export const emptyDraft: RuleDraft = {
  pattern: '',
  categoryId: '',
  tagIds: [],
  shares: [],
}

export function draftFrom(mapping: CategoryMapping): RuleDraft {
  return {
    pattern: mapping.description_pattern,
    categoryId: mapping.category_id,
    tagIds: mapping.tags.map((t) => t.id),
    shares: mapping.shares.map((s) => ({
      person_id: s.person_id,
      share_type: s.share_type,
      share_value: Number(s.share_value),
    })),
  }
}

export function useCategoryMappings() {
  const toast = useToastContext()
  const qc = useQueryClient()

  const [deleteMappingId, setDeleteMappingId] = useState<string | null>(null)
  const [newDraft, setNewDraft] = useState<RuleDraft>(emptyDraft)
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<RuleDraft>(emptyDraft)

  const query = useQuery({ queryKey: qk.categoryMappings.all, queryFn: getCategoryMappings })

  // Editing a rule changes what future auto-categorise runs produce, so the
  // transactions views are invalidated alongside the rules list.
  function invalidate() {
    invalidateDomains(qc, ['categoryMappings'])
  }

  const createMutation = useMutation({
    mutationFn: (draft: RuleDraft) =>
      createCategoryMapping(draft.pattern, draft.categoryId, {
        tag_ids: draft.tagIds,
        shares: draft.shares,
      }),
    onSuccess: (result: CategoryMapping) => {
      invalidate()
      setNewDraft(emptyDraft)
      // Backend upserts on duplicate pattern — surface that honestly
      const existing = query.data?.find(
        (m) => m.description_pattern === result.description_pattern && m.id !== result.id
      )
      toast.success(existing ? 'Rule updated (pattern already existed)' : 'Rule created')
    },
    onError: (err: { detail?: string }) => {
      toast.error(err.detail ?? 'Could not create rule')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: RuleDraft }) =>
      updateCategoryMapping(id, {
        description_pattern: draft.pattern,
        category_id: draft.categoryId,
        tag_ids: draft.tagIds,
        shares: draft.shares,
      }),
    onSuccess: () => {
      invalidate()
      toast.success('Rule updated')
      setEditingMappingId(null)
    },
    onError: (err: { detail?: string }) => {
      toast.error(err.detail ?? 'Could not update rule')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryMapping,
    onSuccess: () => {
      invalidate()
      toast.success('Rule deleted')
      setDeleteMappingId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteMappingId(null)
    },
  })

  function startEdit(mapping: CategoryMapping) {
    setEditingMappingId(mapping.id)
    setEditDraft(draftFrom(mapping))
  }

  function cancelEdit() {
    setEditingMappingId(null)
  }

  return {
    query,
    deleteMappingId,
    setDeleteMappingId,
    deleteMutation,
    newDraft,
    setNewDraft,
    createMutation,
    editingMappingId,
    editDraft,
    setEditDraft,
    updateMutation,
    startEdit,
    cancelEdit,
  }
}
