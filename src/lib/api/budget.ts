import type {
  BudgetEntry,
  CreateBudgetPayload,
  MonthlyBudgetOverride,
  UpdateBudgetEntryPayload,
} from '../../types/budget'

import { client } from './client'

export async function getBudget(year: number): Promise<BudgetEntry[]> {
  const { data } = await client.get<BudgetEntry[]>(`/budget/${year}`)
  return data
}

export async function createBudget(payload: CreateBudgetPayload): Promise<BudgetEntry[]> {
  const { data } = await client.post<BudgetEntry[]>('/budget', payload)
  return data
}

export async function updateBudgetEntry(
  id: string,
  payload: UpdateBudgetEntryPayload
): Promise<BudgetEntry> {
  const { data } = await client.put<BudgetEntry>(`/budget/${id}`, payload)
  return data
}

export async function deleteBudgetEntry(id: string): Promise<void> {
  await client.delete(`/budget/${id}`)
}

export async function setMonthlyBudget(
  year: number,
  month: number,
  categoryId: string,
  allocatedAmount: number
): Promise<MonthlyBudgetOverride> {
  const { data } = await client.put<MonthlyBudgetOverride>(
    `/budget/${year}/${month}/categories/${categoryId}`,
    { allocated_amount: allocatedAmount }
  )
  return data
}

export async function deleteMonthlyBudgetOverride(
  year: number,
  month: number,
  categoryId: string
): Promise<void> {
  await client.delete(`/budget/${year}/${month}/categories/${categoryId}`)
}

export async function getMonthlyBudgetOverrides(year: number): Promise<MonthlyBudgetOverride[]> {
  const { data } = await client.get<MonthlyBudgetOverride[]>(`/budget/${year}/monthly-overrides`)
  return data
}
