import { useQueryClient } from '@tanstack/react-query'

import { deleteRawTransaction, getRawTransactions } from '@/lib/api/transactions'
import { importStatement, importStatementText } from '@/lib/api/uploads'
import { invalidateDomains } from '@/lib/queryKeys'
import type { ImportResponse, PreviewRow } from '@/types/transaction'

import { rowSig } from '../lib/rowSig'

async function deleteExcluded(excludedRows: PreviewRow[]): Promise<void> {
  if (excludedRows.length === 0) return
  const excludedSigs = new Set(excludedRows.map((r) => rowSig(r.txn_date, r.description, r.amount)))
  const monthMap = new Map<string, { year: number; month: number }>()
  excludedRows.forEach((r) => {
    const d = new Date(r.txn_date)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    monthMap.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 })
  })
  const allRaw = (
    await Promise.all(
      [...monthMap.values()].map(({ year, month }) => getRawTransactions(year, month))
    )
  ).flat()
  await Promise.allSettled(
    allRaw
      .filter(
        (r) =>
          r.status !== 'deleted' && excludedSigs.has(rowSig(r.txn_date, r.description, r.amount))
      )
      .map((r) => deleteRawTransaction(r.id))
  )
}

export function useStatementImport() {
  const qc = useQueryClient()

  async function importFile(
    file: File,
    excludedRows: PreviewRow[],
    password?: string
  ): Promise<ImportResponse> {
    const data = await importStatement(file, password)
    await deleteExcluded(excludedRows)
    // New raw rows land in the transactions list and feed the sidebar's
    // pending-manual count — both depend on the transactions cache.
    invalidateDomains(qc, ['transactions'])
    return data
  }

  async function importText(text: string, excludedRows: PreviewRow[]): Promise<ImportResponse> {
    const data = await importStatementText(text)
    await deleteExcluded(excludedRows)
    invalidateDomains(qc, ['transactions'])
    return data
  }

  return { importFile, importText }
}
