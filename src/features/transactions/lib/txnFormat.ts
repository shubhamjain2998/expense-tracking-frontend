import { formatCurrency } from '@/lib/format'
import type { TxnType } from '@/types/transaction'

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
