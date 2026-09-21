import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import {
  createBudget,
  deleteBudgetEntry,
  deleteMonthlyBudgetOverride,
  updateBudgetEntry,
} from '@/lib/api/budget'
import { monthLongLabel } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'
import { invalidateDomains, qk } from '@/lib/queryKeys'

import { monthlyToAnnual } from '../lib/budgetMath'

export function useBudgetMutations({
  year,
  month,
  mode,
}: {
  year: number
  month: number
  mode: PeriodMode
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const toast = useToastContext()
  const qc = useQueryClient()

  // The inline "monthly budget" edit used to PUT
  // /budget/{year}/{month}/categories/{id} first and fall back to the
  // annual PUT /budget/{id} on 404/405/422. That per-month-override endpoint
  // has never existed on the backend (only POST /budget, GET /budget/{year},
  // PUT/DELETE /budget/{id} are routed — see backend/app/routers/budget.py),
  // so the first call 404'd on literally every edit and the fallback ran
  // every single time. Calling the annual PUT directly is identical in
  // behaviour and drops a guaranteed-failing request per edit.
  // Tracked for real per-month support: https://github.com/shubhamjain2998/expense-tracking-frontend/issues/37
  const monthlyOverrideMutation = useMutation({
    mutationFn: ({ entryId, amount }: { categoryId: string; amount: number; entryId: string }) =>
      updateBudgetEntry(entryId, { allocated_amount: monthlyToAnnual(amount) }),
    onSuccess: () => {
      invalidateDomains(qc, ['budget', 'dashboard'])
      toast.success(`Budget for ${monthLongLabel(month, mode)} updated`)
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const resetOverrideMutation = useMutation({
    mutationFn: (categoryId: string) => deleteMonthlyBudgetOverride(year, month, categoryId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.budget.overrides(year) })
      toast.success('Reset to default monthly budget')
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
    monthlyOverrideMutation,
    resetOverrideMutation,
    deleteMutation,
    createInlineMutation,
  }
}
