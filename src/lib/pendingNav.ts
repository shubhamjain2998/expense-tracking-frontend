/**
 * Utilities for linking to the Transactions page in a way that lands on
 * the month that actually has pending transactions.
 *
 * The global "N pending" count spans all months — when the user clicks a
 * pending-related entry point we want them to land on the most recent
 * month that has at least one pending raw transaction, not necessarily the
 * current calendar month.
 */

import type { PendingManualTransaction } from '@/types/transaction'

/**
 * Returns the `/transactions?year=YYYY&month=M` URL for the most recent
 * month that has at least one pending transaction.  Falls back to plain
 * `/transactions` when `pendingItems` is empty or not yet loaded.
 */
export function pendingTransactionsUrl(pendingItems: PendingManualTransaction[]): string {
  if (pendingItems.length === 0) return '/transactions'

  // Find the most recent txn_date across all pending items.
  // txn_date is ISO-format "YYYY-MM-DD", so lexicographic max works.
  const latest = pendingItems.reduce((max, item) =>
    item.txn_date > max.txn_date ? item : max
  )

  const [yearStr, monthStr] = latest.txn_date.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (!year || !month) return '/transactions'
  return `/transactions?year=${year}&month=${month}`
}
