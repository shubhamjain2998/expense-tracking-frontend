import { useIgnoreRules } from '@/hooks/useIgnoreRules'
import { getRawTransactions } from '@/lib/api/transactions'
import { previewStatement, previewStatementText } from '@/lib/api/uploads'
import { matchesAnyRule } from '@/lib/ignoreRules'
import type { PreviewResponse } from '@/types/transaction'

import { rowSig } from '../lib/rowSig'

export interface PreviewResult {
  preview: PreviewResponse
  autoExcluded: Set<number>
  dupeIndices: Set<number>
}

async function buildPreviewResult(
  data: PreviewResponse,
  ignoreRules: string[]
): Promise<PreviewResult> {
  const autoExcluded = new Set<number>()
  data.rows.forEach((r, i) => {
    if (matchesAnyRule(r.description, ignoreRules)) autoExcluded.add(i)
  })

  const sigCount = new Map<string, number[]>()
  data.rows.forEach((r, i) => {
    const sig = rowSig(r.txn_date, r.description, r.amount)
    sigCount.set(sig, [...(sigCount.get(sig) ?? []), i])
  })
  const intraDupes = new Set<number>()
  sigCount.forEach((indices) => {
    if (indices.length > 1) indices.forEach((i) => intraDupes.add(i))
  })

  const monthPairs = [
    ...new Map(
      data.rows.map((r) => {
        const d = new Date(r.txn_date)
        return [
          `${d.getFullYear()}-${d.getMonth() + 1}`,
          { year: d.getFullYear(), month: d.getMonth() + 1 },
        ]
      })
    ).values(),
  ]

  const existingSigs = new Set<string>()
  try {
    const results = await Promise.all(
      monthPairs.map(({ year, month }) => getRawTransactions(year, month))
    )
    results.flat().forEach((t) => existingSigs.add(rowSig(t.txn_date, t.description, t.amount)))
  } catch {
    // best-effort
  }

  const dbDupes = new Set<number>()
  data.rows.forEach((r, i) => {
    if (existingSigs.has(rowSig(r.txn_date, r.description, r.amount))) dbDupes.add(i)
  })

  return { preview: data, autoExcluded, dupeIndices: new Set([...intraDupes, ...dbDupes]) }
}

export function useStatementPreview() {
  const ignoreRules = useIgnoreRules()

  async function previewFile(file: File, password?: string): Promise<PreviewResult> {
    const data = await previewStatement(file, password)
    return buildPreviewResult(data, ignoreRules)
  }

  async function previewText(text: string): Promise<PreviewResult> {
    const data = await previewStatementText(text)
    return buildPreviewResult(data, ignoreRules)
  }

  return { previewFile, previewText }
}
