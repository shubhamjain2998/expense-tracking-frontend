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

export async function importStatement(
  file: File,
  password?: string,
  excludedIndices?: number[]
): Promise<ImportResponse> {
  const form = new FormData()
  form.append('file', file)
  if (password) form.append('password', password)
  if (excludedIndices && excludedIndices.length > 0)
    form.append('exclude_indices', excludedIndices.join(','))
  const { data } = await client.post<ImportResponse>('/uploads/statement', form, MULTIPART)
  return data
}

export interface JsonImportRow {
  txn_date: string
  description: string
  amount: number
}

/** Bulk-import already-parsed rows from a bulk-paste flow. Server-side this
 *  uses the same insertion path as `/uploads/statement` and `/uploads/text-import`
 *  — signed amounts, clean_description, UploadedFile audit row, content-hash
 *  409 on re-paste. */
export async function importJsonRows(rows: JsonImportRow[]): Promise<ImportResponse> {
  const { data } = await client.post<ImportResponse>('/uploads/json-import', { rows })
  return data
}
