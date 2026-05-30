import { useQueryClient } from '@tanstack/react-query'

import { importJsonRows, type JsonImportRow } from '@/lib/api/uploads'
import { invalidateDomains } from '@/lib/queryKeys'
import type { ImportResponse } from '@/types/transaction'

/** Mirrors `useStatementImport` for the bulk-paste flow — same one-shot import
 *  call, same cache invalidation. The server uses the same row-insertion code
 *  the PDF/text paths use, so behavior beyond this point is identical. */
export function useBulkPasteImport() {
  const qc = useQueryClient()

  async function importRows(rows: JsonImportRow[]): Promise<ImportResponse> {
    const data = await importJsonRows(rows)
    // New raw rows land in the transactions list and feed the sidebar's
    // pending-manual count — both depend on the transactions cache.
    invalidateDomains(qc, ['transactions'])
    return data
  }

  return { importRows }
}
