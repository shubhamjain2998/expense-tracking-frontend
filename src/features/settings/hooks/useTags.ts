import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import { createTag, deleteTag, getTags } from '@/lib/api/tags'
import { invalidateDomains, qk } from '@/lib/queryKeys'

export function useTags() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [newTagName, setNewTagName] = useState('')
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)

  const query = useQuery({ queryKey: qk.tags.all, queryFn: getTags })

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      invalidateDomains(qc, ['tags'])
      setNewTagName('')
      toast.success('Tag created')
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409) toast.error('Tag already exists')
      else toast.error(err.detail)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      // Transactions and dashboard tag-filtered views need to drop the tag.
      invalidateDomains(qc, ['tags', 'transactions', 'dashboard'])
      toast.success('Tag deleted')
      setDeleteTagId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteTagId(null)
    },
  })

  return {
    query,
    newTagName,
    setNewTagName,
    deleteTagId,
    setDeleteTagId,
    createMutation,
    deleteMutation,
  }
}
