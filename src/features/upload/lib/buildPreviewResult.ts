import { getProcessedTransactions, getRawTransactions } from '@/lib/api/transactions'
import { matchesAnyRule } from '@/lib/ignoreRules'
import type { PreviewResponse } from '@/types/transaction'

import { rowSig } from './rowSig'

export interface PreviewResult {
  preview: PreviewResponse
  autoExcluded: Set<number>
  dupeIndices: Set<number>
}

export async function buildPreviewResult(
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
    // Duplicate detection has to check both tables: a transaction imported
    // and then categorised no longer appears in /transactions/raw (it's
    // moved to "processed"), so checking raw alone only catches duplicates
    // against same-month transactions nobody has categorised yet — which is
    // close to never, since most rows get categorised within the same
    // session. Re-importing an already-processed month (e.g. pasting the
    // same statement twice) needs both sources checked.
    const [rawResults, processedResults] = await Promise.all([
      Promise.all(monthPairs.map(({ year, month }) => getRawTransactions(year, month))),
      Promise.all(monthPairs.map(({ year, month }) => getProcessedTransactions(year, month))),
    ])
    rawResults.flat().forEach((t) => existingSigs.add(rowSig(t.txn_date, t.description, t.amount)))
    processedResults
      .flat()
      .forEach((t) => existingSigs.add(rowSig(t.txn_date, t.description, t.amount)))
  } catch {
    // best-effort
  }

  const dbDupes = new Set<number>()
  data.rows.forEach((r, i) => {
    if (existingSigs.has(rowSig(r.txn_date, r.description, r.amount))) dbDupes.add(i)
  })

  const dupeIndices = new Set([...intraDupes, ...dbDupes])

  // Duplicates are excluded by default so the user doesn't accidentally
  // re-import transactions that already exist. They can still be re-included
  // row-by-row via the toggle control.
  const initialExcluded = new Set([...autoExcluded, ...dupeIndices])

  return { preview: data, autoExcluded: initialExcluded, dupeIndices }
}
