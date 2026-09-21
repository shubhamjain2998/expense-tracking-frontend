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
  onSetBudget,
  isSaving,
}: {
  rows: UnbudgetedCategoryRowData[]
  onSetBudget: (categoryId: string, monthlyAmount: number) => void
  isSaving: boolean
}) {
  if (rows.length === 0) return null

  return (
    <div className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Outside the plan</h2>
        <span className="sub">No budget set for these categories</span>
      </div>
      <div className="card card-flush">
        <div className="alerts">
          {rows.map((row) => (
            <UnbudgetedCategoryRow
              key={row.categoryId}
              row={row}
              onSetBudget={onSetBudget}
              isSaving={isSaving}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
