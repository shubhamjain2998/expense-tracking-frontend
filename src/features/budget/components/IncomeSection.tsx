import { Link } from 'react-router-dom'

import { monthLongLabel } from '@/lib/period'
import type { PeriodMode } from '@/lib/period'

import type { IncomeTableRow } from '../types'

import { IncomeCategoryRow } from './IncomeCategoryRow'

/**
 * Budget §4 "Expected income" — closes the page. Month-by-month patterns
 * (habits, seasonality) live in Insights; this table is the plan, not the
 * history, so it links out instead of repeating anything charted there.
 */
export function IncomeSection({
  rows,
  month,
  mode,
}: {
  rows: IncomeTableRow[]
  month: number
  mode: PeriodMode
}) {
  return (
    <div className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Expected income</h2>
        <span className="sub">Used for the savings target, not for spending limits</span>
      </div>
      {rows.length === 0 ? (
        <div className="card">
          <p className="small">No income categories yet.</p>
        </div>
      ) : (
        <div className="card card-flush">
          <table className="tbl">
            <thead>
              <tr>
                <th>Source</th>
                <th className="num">Per month</th>
                <th className="num">Received in {monthLongLabel(month, mode)}</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <IncomeCategoryRow key={row.categoryId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small">
        Month-by-month spending patterns live in{' '}
        <Link to="/insights" className="inline-insights-link">
          Insights
        </Link>
        . This page is the plan, not the history.
      </p>
    </div>
  )
}
