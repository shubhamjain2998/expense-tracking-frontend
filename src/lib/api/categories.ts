import type { Category, CategoryMapping } from '../../types/settings'

import { client } from './client'

export async function getCategories(): Promise<Category[]> {
  const { data } = await client.get<Category[]>('/categories')
  return data
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await client.post<Category>('/categories', { name })
  return data
}

export async function renameCategory(id: string, name: string): Promise<Category> {
  const { data } = await client.patch<Category>(`/categories/${id}`, { name })
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  await client.delete(`/categories/${id}`)
}

export async function setCategoryIncomeFlag(id: string, isIncome: boolean): Promise<Category> {
  const { data } = await client.patch<Category>(`/categories/${id}`, { is_income: isIncome })
  return data
}

export async function getCategoryMappings(): Promise<CategoryMapping[]> {
  const { data } = await client.get<CategoryMapping[]>('/category-mappings')
  return data
}

export async function deleteCategoryMapping(id: string): Promise<void> {
  await client.delete(`/category-mappings/${id}`)
}
