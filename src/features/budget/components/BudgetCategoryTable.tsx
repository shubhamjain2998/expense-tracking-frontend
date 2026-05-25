import { formatCurrency } from '@/lib/format'

import type { CategoryTableRow, UnbudgetedCategoryRow } from '../types'

import { BudgetCategoryRow } from './BudgetCategoryRow'
import { ProgressBar } from './ProgressBar'
import { UnbudgetedCategoryRow as UnbudgetedCategoryRowComponent } from './UnbudgetedCategoryRow'

export function BudgetCategoryTable({
  tableData,
  unbudgetedData,
  totalMonthlyBudget,
  totalThisMonth,
  totalYTDSpent,
  totalAnnual,
  totalPct,
  onSaveBudget,
  onResetBudget,
  onDelete,
  onSetBudget,
  isSavingInline,
}: {
  tableData: CategoryTableRow[]
  unbudgetedData: UnbudgetedCategoryRow[]
  totalMonthlyBudget: number
  totalThisMonth: number
  totalYTDSpent: number
  totalAnnual: number
  totalPct: number | null
  onSaveBudget: (row: CategoryTableRow, amount: number) => void
  onResetBudget: (row: CategoryTableRow) => void
  onDelete: (id: string) => void
  onSetBudget: (categoryId: string, monthlyAmount: number) => void
  isSavingInline: boolean
}) {
  return (
    <div className="card card-flush">
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th style={{ width: '26%' }}>Category</th>
              <th className="num" style={{ whiteSpace: 'nowrap' }}>
                Monthly Budget
              </th>
              <th className="num" style={{ whiteSpace: 'nowrap' }}>
                This Month
              </th>
              <th style={{ width: '22%', whiteSpace: 'nowrap' }}>This Month Progress</th>
              <th className="num" style={{ whiteSpace: 'nowrap' }}>
                YTD Spent
              </th>
              <th className="num" style={{ whiteSpace: 'nowrap' }}>
                Annual Budget
              </th>
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <BudgetCategoryRow
                key={row.id}
                row={row}
                onSaveBudget={(amount) => onSaveBudget(row, amount)}
                onResetBudget={() => onResetBudget(row)}
                onDelete={() => onDelete(row.id)}
              />
            ))}

            {unbudgetedData.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      paddingTop: 20,
                      paddingBottom: 6,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--ink-4)',
                        }}
                      >
                        No budget set
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 18,
                          height: 18,
                          padding: '0 5px',
                          background: 'var(--surface-3)',
                          borderRadius: 9,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--ink-4)',
                        }}
                      >
                        {unbudgetedData.length}
                      </span>
                    </div>
                  </td>
                </tr>
                {unbudgetedData.map((row) => (
                  <UnbudgetedCategoryRowComponent
                    key={row.categoryId}
                    row={row}
                    onSetBudget={onSetBudget}
                    isSaving={isSavingInline}
                  />
                ))}
              </>
            )}
          </tbody>
          <tfoot style={tableData.length === 0 ? { display: 'none' } : undefined}>
            <tr>
              <td
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  color: 'var(--ink-3)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Total
              </td>
              <td
                className="num"
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {formatCurrency(totalMonthlyBudget)}
              </td>
              <td
                className="num"
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {formatCurrency(totalThisMonth)}
              </td>
              <td style={{ borderTop: '2px solid var(--line)', padding: '14px 12px 0' }}>
                {totalPct !== null && <ProgressBar pct={totalPct} />}
              </td>
              <td
                className="num"
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  fontWeight: 600,
                  color: totalYTDSpent > totalAnnual ? 'var(--neg)' : 'var(--ink)',
                }}
              >
                {formatCurrency(totalYTDSpent)}
              </td>
              <td
                className="num"
                style={{
                  borderTop: '2px solid var(--line)',
                  paddingTop: 14,
                  fontWeight: 600,
                  color: 'var(--ink-3)',
                }}
              >
                {formatCurrency(totalAnnual)}
              </td>
              <td style={{ borderTop: '2px solid var(--line)' }} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
