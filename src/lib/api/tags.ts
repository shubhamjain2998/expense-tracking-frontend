import type { Tag } from '../../types/settings'

import { client } from './client'

export async function getTags(): Promise<Tag[]> {
  const { data } = await client.get<Tag[]>('/tags')
  return data
}

export async function createTag(name: string): Promise<Tag> {
  const { data } = await client.post<Tag>('/tags', { name })
  return data
}

export async function deleteTag(id: string): Promise<void> {
  await client.delete(`/tags/${id}`)
}
