import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import { createPerson, deletePerson, getPersons } from '@/lib/api/persons'
import { invalidateDomains, qk } from '@/lib/queryKeys'

export function usePersons() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [newPersonName, setNewPersonName] = useState('')
  const [personNameError, setPersonNameError] = useState('')
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null)

  const query = useQuery({ queryKey: qk.persons.all, queryFn: getPersons })

  const createMutation = useMutation({
    mutationFn: createPerson,
    onSuccess: () => {
      invalidateDomains(qc, ['persons'])
      setNewPersonName('')
      setPersonNameError('')
      toast.success('Person added')
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409) setPersonNameError('Name already exists')
      else toast.error(err.detail)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePerson,
    onSuccess: () => {
      invalidateDomains(qc, ['persons'])
      toast.success('Person removed')
      setDeletePersonId(null)
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409)
        toast.warning('This person is linked to transactions and cannot be deleted')
      else toast.error(err.detail)
      setDeletePersonId(null)
    },
  })

  function handleAddPerson() {
    if (!newPersonName.trim()) {
      setPersonNameError('Name is required')
      return
    }
    createMutation.mutate(newPersonName.trim())
  }

  return {
    query,
    newPersonName,
    setNewPersonName,
    personNameError,
    deletePersonId,
    setDeletePersonId,
    handleAddPerson,
    createMutation,
    deleteMutation,
  }
}
