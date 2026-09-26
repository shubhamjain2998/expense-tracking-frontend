import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import { createBudget, deleteBudgetEntry, updateBudgetEntry } from '@/lib/api/budget'
import { formatCurrency } from '@/lib/format'
import { invalidateDomains } from '@/lib/queryKeys'

import { monthlyToAnnual } from '../lib/budgetMath'

export function useBudgetMutations({ year }: { year: number }) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const toast = useToastContext()
  const qc = useQueryClient()

  // A budget is one annual amount per category (the backend has no
  // per-month plans — see backend/app/routers/budget.py), so the inline
  // monthly edit sets that category's plan for every month: annual = monthly
  // × 12. The copy says so; it used to promise a custom budget for one month
  // and quietly change the whole year.
  const updateMonthlyPlanMutation = useMutation({
    mutationFn: ({ entryId, amount }: { entryId: string; amount: number; categoryName: string }) =>
      updateBudgetEntry(entryId, { allocated_amount: monthlyToAnnual(amount) }),
    onSuccess: (_data, { amount, categoryName }) => {
      invalidateDomains(qc, ['budget', 'dashboard'])
      toast.success(`${categoryName} is now ${formatCurrency(amount)} a month`)
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBudgetEntry,
    onSuccess: () => {
      invalidateDomains(qc, ['budget', 'dashboard'])
      toast.success('Budget entry deleted')
      setDeleteId(null)
    },
    onError: (err: { detail: string }) => {
      toast.error(err.detail)
      setDeleteId(null)
    },
  })

  const createInlineMutation = useMutation({
    mutationFn: (vars: { categoryId: string; monthlyAmount: number }) =>
      createBudget({
        year,
        entries: [
          { category_id: vars.categoryId, allocated_amount: monthlyToAnnual(vars.monthlyAmount) },
        ],
      }),
    onSuccess: () => {
      invalidateDomains(qc, ['budget', 'dashboard'])
      toast.success('Budget entry created')
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  return {
    deleteId,
    setDeleteId,
    updateMonthlyPlanMutation,
    deleteMutation,
    createInlineMutation,
  }
}
