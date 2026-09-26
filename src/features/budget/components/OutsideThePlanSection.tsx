import type { UnbudgetedCategoryRow as UnbudgetedCategoryRowData } from '../types'

import { UnbudgetedCategoryRow } from './UnbudgetedCategoryRow'

/**
 * Budget §3 "Outside the plan" — categories with spend but no budget line,
 * as `.alert` rows (see MASTER.md idiom used on Home's NeedsAttention /
 * CommittedVsChosen). Hidden entirely once every spending category has a
 * budget line.
 */
export function OutsideThePlanSection({
  rows,
  periodView,
  monthLabel,
  onSetBudget,
  isSaving,
  highlight = null,
  onHighlight,
}: {
  rows: UnbudgetedCategoryRowData[]
  /** The plan table's Monthly/Annual toggle; the world's blocks follow it too. */
  periodView: 'monthly' | 'annual'
  /** The selected month's name, e.g. "June". */
  monthLabel: string
  onSetBudget: (categoryId: string, monthlyAmount: number) => void
  isSaving: boolean
  /** Category id lit here and in the 3D world. */
  highlight?: string | null
  onHighlight?: (categoryId: string | null) => void
}) {
  if (rows.length === 0) return null

  return (
    <div className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Outside the plan</h2>
        <span className="sub">No budget set for these categories</span>
      </div>
      <div className="card card-flush">
        <div className="alerts" role="list">
          {rows.map((row) => (
            <UnbudgetedCategoryRow
              key={row.categoryId}
              row={row}
              amount={periodView === 'monthly' ? row.thisMonthSpent : row.ytdSpent}
              amountLabel={periodView === 'monthly' ? `in ${monthLabel}` : 'this year so far'}
              onSetBudget={onSetBudget}
              isSaving={isSaving}
              hot={highlight === row.categoryId}
              onHighlight={onHighlight}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
