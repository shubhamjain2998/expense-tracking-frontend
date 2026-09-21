import { formatCurrency } from '@/lib/format'

import type { IncomeTableRow } from '../types'

/**
 * Budget §4 "Expected income" row. Used for the savings target only, never
 * for spending limits — see MASTER.md §1 (income figures stay off the
 * spending "plan" table in §2, this is their one home on this page).
 */
export function IncomeCategoryRow({ row }: { row: IncomeTableRow }) {
  const note =
    row.ytdReceived > 0
      ? `${formatCurrency(row.ytdReceived)} so far this year`
      : 'No activity yet this year'

  return (
    <tr>
      <td className="strong">{row.categoryName}</td>
      <td className="num">{row.perMonth !== null ? formatCurrency(row.perMonth) : '—'}</td>
      <td className={row.receivedThisMonth > 0 ? 'num pos' : 'num'}>
        {formatCurrency(row.receivedThisMonth)}
      </td>
      <td className="small">{note}</td>
    </tr>
  )
}
