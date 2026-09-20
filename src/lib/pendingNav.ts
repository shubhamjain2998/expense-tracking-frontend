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

import { type PeriodMode, calendarToPeriod } from './period'

/**
 * Returns the `/transactions?year=YYYY&month=M` URL for the most recent
 * month that has at least one pending transaction.  Falls back to plain
 * `/transactions` when `pendingItems` is empty or not yet loaded.
 *
 * The `month` param is a **period** month, so the calendar month of the
 * transaction has to be converted first — in FY mode a raw calendar month
 * would land the page three months ahead.
 */
export function pendingTransactionsUrl(
  pendingItems: PendingManualTransaction[],
  mode: PeriodMode
): string {
  if (pendingItems.length === 0) return '/transactions'

  // Find the most recent txn_date across all pending items.
  // txn_date is ISO-format "YYYY-MM-DD", so lexicographic max works.
  const latest = pendingItems.reduce((max, item) => (item.txn_date > max.txn_date ? item : max))

  const [yearStr, monthStr] = latest.txn_date.split('-')
  const calYear = Number(yearStr)
  const calMonth = Number(monthStr)

  if (!calYear || !calMonth) return '/transactions'
  const { year, month } = calendarToPeriod(calYear, calMonth, mode)
  return `/transactions?year=${year}&month=${month}`
}
