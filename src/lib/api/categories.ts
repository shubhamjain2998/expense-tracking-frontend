import type { Category, CategoryMapping, MappingSharePayload } from '../../types/settings'

import { client } from './client'

export async function getCategories(): Promise<Category[]> {
  const { data } = await client.get<Category[]>('/categories')
  return data
}

export async function createCategory(name: string, isIncome = false): Promise<Category> {
  const { data } = await client.post<Category>('/categories', { name, is_income: isIncome })
  return data
}

export async function renameCategory(id: string, name: string): Promise<Category> {
  const { data } = await client.patch<Category>(`/categories/${id}`, { name })
  return data
}

export async function deleteCategory(
  id: string,
  opts?: { action: 'pending' | 'move'; targetCategoryId?: string }
): Promise<void> {
  const params = opts
    ? new URLSearchParams({
        action: opts.action,
        ...(opts.targetCategoryId ? { target_category_id: opts.targetCategoryId } : {}),
      })
    : null
  await client.delete(`/categories/${id}${params ? `?${params}` : ''}`)
}

export async function setCategoryIncomeFlag(id: string, isIncome: boolean): Promise<Category> {
  const { data } = await client.patch<Category>(`/categories/${id}`, { is_income: isIncome })
  return data
}

export async function getCategoryMappings(): Promise<CategoryMapping[]> {
  const { data } = await client.get<CategoryMapping[]>('/category-mappings')
  // tags and shares arrived with the rule redesign. Default them here rather
  // than guarding at every read site, so a response from an older backend
  // renders as a category-only rule instead of crashing the page.
  return data.map((m) => ({ ...m, tags: m.tags ?? [], shares: m.shares ?? [] }))
}

export async function createCategoryMapping(
  descriptionPattern: string,
  categoryId: string,
  context: { tag_ids?: string[]; shares?: MappingSharePayload[] } = {}
): Promise<CategoryMapping> {
  const { data } = await client.post<CategoryMapping>('/category-mappings', {
    description_pattern: descriptionPattern,
    category_id: categoryId,
    ...context,
  })
  return data
}

export async function updateCategoryMapping(
  id: string,
  // Omitting tag_ids / shares leaves that facet alone; passing [] clears it.
  fields: {
    description_pattern?: string
    category_id?: string
    tag_ids?: string[]
    shares?: MappingSharePayload[]
  }
): Promise<CategoryMapping> {
  const { data } = await client.patch<CategoryMapping>(`/category-mappings/${id}`, fields)
  return data
}

export async function deleteCategoryMapping(id: string): Promise<void> {
  await client.delete(`/category-mappings/${id}`)
}
