import type { ImportResponse, PreviewResponse } from '../../types/transaction'

import { client } from './client'

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

/** Codes the backend uses in `detail.code` when a 422 needs the UI to react.
 *  Kept in sync with backend/app/routers/uploads.py:_parse_pdf_or_422. */
export const PDF_PASSWORD_REQUIRED = 'pdf_password_required'
export const PDF_PASSWORD_INCORRECT = 'pdf_password_incorrect'

export async function previewStatement(file: File, password?: string): Promise<PreviewResponse> {
  const form = new FormData()
  form.append('file', file)
  if (password) form.append('password', password)
  const { data } = await client.post<PreviewResponse>('/uploads/preview', form, MULTIPART)
  return data
}

export async function importStatement(file: File, password?: string): Promise<ImportResponse> {
  const form = new FormData()
  form.append('file', file)
  if (password) form.append('password', password)
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
