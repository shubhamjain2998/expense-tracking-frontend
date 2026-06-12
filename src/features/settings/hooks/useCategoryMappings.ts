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
import type { CategoryMapping } from '@/types/settings'

export function useCategoryMappings() {
  const toast = useToastContext()
  const qc = useQueryClient()

  // Delete state
  const [deleteMappingId, setDeleteMappingId] = useState<string | null>(null)

  // Create form state
  const [newPattern, setNewPattern] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')

  // Edit (inline) state: tracks which row is being edited + working copies
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null)
  const [editPattern, setEditPattern] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')

  const query = useQuery({ queryKey: qk.categoryMappings.all, queryFn: getCategoryMappings })

  // Invalidate the same domains that the delete mutation and the Process/Edit
  // panel "Save as rule" flow (ProcessPanel.tsx, EditPanel.tsx,
  // useProcessedMutations.ts, useQuickAdd.ts) all invalidate.
  function invalidate() {
    invalidateDomains(qc, ['categoryMappings'])
  }

  const createMutation = useMutation({
    mutationFn: ({ pattern, categoryId }: { pattern: string; categoryId: string }) =>
      createCategoryMapping(pattern, categoryId),
    onSuccess: (result: CategoryMapping) => {
      invalidate()
      setNewPattern('')
      setNewCategoryId('')
      // Backend upserts on duplicate pattern — surface that honestly
      const existing = query.data?.find(
        (m) => m.description_pattern === result.description_pattern && m.id !== result.id
      )
      toast.success(existing ? 'Mapping updated (pattern already existed)' : 'Mapping created')
    },
    onError: (err: { detail?: string }) => {
      toast.error(err.detail ?? 'Could not create mapping')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      pattern,
      categoryId,
    }: {
      id: string
      pattern: string
      categoryId: string
    }) => updateCategoryMapping(id, { description_pattern: pattern, category_id: categoryId }),
    onSuccess: () => {
      invalidate()
      toast.success('Mapping updated')
      setEditingMappingId(null)
    },
    onError: (err: { detail?: string }) => {
      toast.error(err.detail ?? 'Could not update mapping')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryMapping,
    onSuccess: () => {
      invalidate()
      toast.success('Mapping deleted')
      setDeleteMappingId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteMappingId(null)
    },
  })

  function startEdit(mapping: CategoryMapping) {
    setEditingMappingId(mapping.id)
    setEditPattern(mapping.description_pattern)
    setEditCategoryId(mapping.category_id)
  }

  function cancelEdit() {
    setEditingMappingId(null)
  }

  return {
    query,
    // delete
    deleteMappingId,
    setDeleteMappingId,
    deleteMutation,
    // create
    newPattern,
    setNewPattern,
    newCategoryId,
    setNewCategoryId,
    createMutation,
    // edit
    editingMappingId,
    editPattern,
    setEditPattern,
    editCategoryId,
    setEditCategoryId,
    updateMutation,
    startEdit,
    cancelEdit,
  }
}
