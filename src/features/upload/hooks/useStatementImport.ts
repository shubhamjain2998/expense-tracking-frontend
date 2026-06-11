import { useQueryClient } from '@tanstack/react-query'

import { importStatement } from '@/lib/api/uploads'
import { invalidateDomains } from '@/lib/queryKeys'
import type { ImportResponse } from '@/types/transaction'

export function useStatementImport() {
  const qc = useQueryClient()

  async function importFile(
    file: File,
    excludedIndices: number[],
    password?: string
  ): Promise<ImportResponse> {
    // Exclusions are sent with the request so the backend never inserts them —
    // the old pattern of import-all then delete-each is replaced by a single
    // atomic POST, eliminating the partial-failure window.
    const data = await importStatement(file, password, excludedIndices)
    // New raw rows land in the transactions list and feed the sidebar's
    // pending-manual count — both depend on the transactions cache.
    invalidateDomains(qc, ['transactions'])
    return data
  }

  return { importFile }
}
