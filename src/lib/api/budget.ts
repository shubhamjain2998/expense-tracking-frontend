import type { BudgetEntry, CreateBudgetPayload, UpdateBudgetEntryPayload } from '../../types/budget'

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
