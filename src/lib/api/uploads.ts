import type { ImportResponse, PreviewResponse } from '../../types/transaction'

import { client } from './client'

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

export async function previewStatement(file: File): Promise<PreviewResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<PreviewResponse>('/uploads/preview', form, MULTIPART)
  return data
}

export async function importStatement(file: File): Promise<ImportResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<ImportResponse>('/uploads/statement', form, MULTIPART)
  return data
}

export async function previewStatementText(text: string): Promise<PreviewResponse> {
  const { data } = await client.post<PreviewResponse>('/uploads/preview-text', { text })
  return data
}

export async function importStatementText(text: string): Promise<ImportResponse> {
  const { data } = await client.post<ImportResponse>('/uploads/text-import', { text })
  return data
}
