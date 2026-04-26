import type { BackupExportPayload, BackupImportResponse } from '../../types/backup'

import { client } from './client'

export async function exportBackup(): Promise<BackupExportPayload> {
  const { data } = await client.get<BackupExportPayload>('/backup/export')
  return data
}

export async function importBackup(
  payload: Record<string, unknown>
): Promise<BackupImportResponse> {
  const { data } = await client.post<BackupImportResponse>('/backup/import', payload)
  return data
}
