import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import {
  createCategory,
  deleteCategory,
  getCategories,
  renameCategory,
  setCategoryIncomeFlag,
} from '@/lib/api/categories'
import { invalidateDomains, qk } from '@/lib/queryKeys'

export function useCategories() {
  const toast = useToastContext()
  const qc = useQueryClient()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null)
  const [renamingCategoryName, setRenamingCategoryName] = useState('')
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)

  const query = useQuery({ queryKey: qk.categories.all, queryFn: getCategories })

  const createMutation = useMutation({
    mutationFn: ({ name, isIncome = false }: { name: string; isIncome?: boolean }) =>
      createCategory(name, isIncome),
    onSuccess: () => {
      invalidateDomains(qc, ['categories'])
      setNewCategoryName('')
      toast.success('Category created')
    },
    onError: (err: { detail: string; status?: number }) => {
      if (err.status === 409) toast.error('Category already exists')
      else toast.error(err.detail)
    },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameCategory(id, name),
    onSuccess: () => {
      // Renamed category text appears on transactions, budget, dashboard
      // (group-by-category), and in saved mapping rules.
      invalidateDomains(qc, [
        'categories',
        'budget',
        'transactions',
        'dashboard',
        'categoryMappings',
      ])
      toast.success('Category renamed')
      setRenamingCategoryId(null)
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const deleteMutation = useMutation({
    mutationFn: ({
      id,
      action,
      targetCategoryId,
    }: {
      id: string
      action?: 'pending' | 'move'
      targetCategoryId?: string
    }) => deleteCategory(id, action ? { action, targetCategoryId } : undefined),
    onSuccess: () => {
      invalidateDomains(qc, [
        'categories',
        'budget',
        'transactions',
        'dashboard',
        'categoryMappings',
      ])
      toast.success('Category deleted')
      setDeleteCategoryId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteCategoryId(null)
    },
  })

  const incomeFlagMutation = useMutation({
    mutationFn: ({ id, is_income }: { id: string; is_income: boolean }) =>
      setCategoryIncomeFlag(id, is_income),
    onSuccess: () => {
      // Flipping income/expense reshuffles dashboard "spent" vs "income"
      // totals across every period view.
      invalidateDomains(qc, ['categories', 'dashboard'])
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  return {
    query,
    newCategoryName,
    setNewCategoryName,
    renamingCategoryId,
    setRenamingCategoryId,
    renamingCategoryName,
    setRenamingCategoryName,
    deleteCategoryId,
    setDeleteCategoryId,
    createMutation,
    renameMutation,
    deleteMutation,
    incomeFlagMutation,
  }
}
