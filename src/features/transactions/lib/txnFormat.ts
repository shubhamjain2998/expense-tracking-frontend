import { formatCurrency } from '@/lib/format'
import type { TxnType } from '@/types/transaction'

import type { UnifiedTxn } from '../types'

/** True iff this is a confirmed income transaction. Single source of truth
 *  is `txn_type` from the backend — never the amount sign, because the
 *  classifier maps negative amounts to refund/transfer/expense (never
 *  income), so a sign-based check would misclassify every statement-uploaded
 *  refund as income. */
export function isIncome(txnType?: TxnType | null): boolean {
  return txnType === 'income'
}

/** Negative amount = money coming in (refund / income / transfer to you).
 *  Use this only for raw/pending rows that don't yet have a `txn_type`,
 *  and prefer wording like "money in?" — it is NOT a claim that the row
 *  is income. */
export function isCreditAmount(amount: string | number): boolean {
  return Number(amount) < 0
}

/** Sign convention for income/credit detection — shared between the table
 *  footer, mobile totals row, and the page heading. */
function isMoneyIn(t: UnifiedTxn): boolean {
  return (
    t.txnType === 'income' ||
    t.txnType === 'refund' ||
    (t.kind === 'pending' && Number(t.effectiveAmount) < 0)
  )
}

export interface TxnTotals {
  expenseTotal: number
  incomeTotal: number
  /** expenseTotal - incomeTotal (positive = net spend, negative = net income) */
  netTotal: number
  hasMixed: boolean
}

/**
 * Compute income/expense split from a list of unified transactions.
 *
 * Used by both the table footer and the page-level heading so the two
 * surfaces always use the same arithmetic. Excludes deleted rows.
 */
export function txnTotals(txns: UnifiedTxn[]): TxnTotals {
  const visible = txns.filter((t) => t.kind !== 'deleted')
  const incomeTotal = visible
    .filter(isMoneyIn)
    .reduce((s, t) => s + Math.abs(Number(t.effectiveAmount)), 0)
  const expenseTotal = visible
    .filter((t) => !isMoneyIn(t))
    .reduce((s, t) => s + Math.abs(Number(t.effectiveAmount)), 0)
  return {
    expenseTotal,
    incomeTotal,
    netTotal: expenseTotal - incomeTotal,
    hasMixed: incomeTotal > 0 && expenseTotal > 0,
  }
}

/**
 * Format the signed split as a compact inline string: "−₹30,802 · +₹449".
 * Returns null when only one direction exists (caller can fall back to the
 * net figure instead).
 */
export function formatTxnSplit(totals: TxnTotals): string | null {
  if (!totals.hasMixed) return null
  return `−${formatCurrency(totals.expenseTotal, { fractionDigits: 0 })} · +${formatCurrency(totals.incomeTotal, { fractionDigits: 0 })}`
}

export interface SplitInfo {
  /** Full bill amount, before anyone else's share is deducted. */
  total: number
  /** What the user keeps — the amount every other surface shows. */
  yourShare: number
  /** Sum of everyone else's shares. */
  othersTotal: number
  /** People on the bill, the user included. */
  peopleCount: number
  totalDisplay: string
  yourShareDisplay: string
  /** "Total ₹1,800.00 · you ₹600.00 · Alice ₹600.00 · Bob ₹600.00" */
  breakdown: string
}

/**
 * Split figures for a transaction, or `null` when it isn't split.
 *
 * The list and the panels both show only the user's share, which makes the
 * full bill impossible to quote back to the people they split with — so every
 * split surface renders the total from here too.
 */
export function splitInfo(txn: UnifiedTxn): SplitInfo | null {
  if (txn.shares.length === 0) return null

  const total = Math.abs(Number(txn.amount))
  const yourShare = Math.abs(Number(txn.effectiveAmount))
  const othersTotal = txn.shares.reduce((s, sh) => s + Math.abs(Number(sh.share_amount)), 0)
  const money = (n: number) => formatCurrency(n, { fractionDigits: 2 })

  return {
    total,
    yourShare,
    othersTotal,
    peopleCount: txn.shares.length + 1,
    totalDisplay: money(total),
    yourShareDisplay: money(yourShare),
    breakdown: [
      `Total ${money(total)}`,
      `you ${money(yourShare)}`,
      ...txn.shares.map((s) => `${s.person_name} ${money(Math.abs(Number(s.share_amount)))}`),
    ].join(' · '),
  }
}

export function formatAmount(
  effectiveAmount: string | number,
  txnType?: TxnType | null
): {
  display: string
  /** True only for confirmed income (txn_type === 'income'). Refund and
   *  transfer are NOT income even though they share the negative sign. */
  income: boolean
} {
  const n = Number(effectiveAmount)
  return {
    display: formatCurrency(Math.abs(n), { fractionDigits: 2 }),
    income: txnType === 'income',
  }
}
