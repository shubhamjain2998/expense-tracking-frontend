import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useToastContext } from '@/hooks/useToastContext'
import {
  createBudget,
  deleteBudgetEntry,
  deleteMonthlyBudgetOverride,
  setMonthlyBudget,
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

  const updateAnnualMutation = useMutation({
    mutationFn: ({ id, monthlyAmount }: { id: string; monthlyAmount: number }) =>
      updateBudgetEntry(id, { allocated_amount: monthlyToAnnual(monthlyAmount) }),
    onSuccess: () => {
      invalidateDomains(qc, ['budget', 'dashboard'])
      toast.success('Annual budget updated')
    },
    onError: (err: { detail: string }) => toast.error(err.detail),
  })

  const monthlyOverrideMutation = useMutation({
    mutationFn: ({ categoryId, amount }: { categoryId: string; amount: number; entryId: string }) =>
      setMonthlyBudget(year, month, categoryId, amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.budget.overrides(year) })
      void qc.invalidateQueries({ queryKey: qk.dashboard.summary(year, month, mode) })
      toast.success(`Budget for ${monthLongLabel(month, mode)} updated`)
    },
    onError: (err: { detail: string; status?: number }, vars) => {
      if (err.status === 404 || err.status === 405 || err.status === 422) {
        updateAnnualMutation.mutate({ id: vars.entryId, monthlyAmount: vars.amount })
        // TODO: wire per-month override once backend adds
        // PUT /budget/{year}/{month}/categories/{id}
        // Tracked: https://github.com/shubhamjain2998/expense-tracking-frontend/issues/37
        toast.warning('Per-month overrides are not yet supported; saved as the annual budget.')
      } else {
        toast.error(err.detail)
      }
    },
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
