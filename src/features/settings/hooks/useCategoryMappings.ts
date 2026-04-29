import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import { deleteCategoryMapping, getCategoryMappings } from '@/lib/api/categories'
import { qk } from '@/lib/queryKeys'

export function useCategoryMappings() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [deleteMappingId, setDeleteMappingId] = useState<string | null>(null)

  const query = useQuery({ queryKey: qk.categoryMappings.all, queryFn: getCategoryMappings })

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryMapping,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.categoryMappings.all })
      toast.success('Mapping deleted')
      setDeleteMappingId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteMappingId(null)
    },
  })

  return {
    query,
    deleteMappingId,
    setDeleteMappingId,
    deleteMutation,
  }
}
