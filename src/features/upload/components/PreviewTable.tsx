import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/format'
import type { PreviewRow } from '@/types/transaction'

interface FilteredRow {
  row: PreviewRow
  globalIndex: number
}

interface PreviewTableProps {
  rows: FilteredRow[]
  totalCount: number
  excludedIndices: Set<number>
  dupeIndices: Set<number>
  /** Omit to render the column but without interactive buttons (done / importing state). */
  onToggleExclude?: (index: number) => void
}

export function PreviewTable({
  rows,
  totalCount,
  excludedIndices,
  dupeIndices,
  onToggleExclude,
}: PreviewTableProps) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th className="num">Amount</th>
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center" style={{ color: 'var(--ink-3)' }}>
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              rows.map(({ row, globalIndex }) => {
                const isExcluded = excludedIndices.has(globalIndex)
                const isDupe = dupeIndices.has(globalIndex)
                // A dupe that's been excluded shows a struck-through amber row
                // to signal it will be skipped; if the user restores it the
                // row reverts to the normal amber highlight.
                const isDupeSkipped = isDupe && isExcluded
                return (
                  <tr
                    key={globalIndex}
                    style={{
                      opacity: isExcluded ? 0.45 : 1,
                      background: isDupe ? 'var(--warn-soft)' : undefined,
                    }}
                  >
                    <td className="num" style={{ color: 'var(--ink-3)' }}>
                      <span style={{ textDecoration: isExcluded ? 'line-through' : undefined }}>
                        {row.txn_date.slice(0, 10)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ink)' }}>
                      <span style={{ textDecoration: isExcluded ? 'line-through' : undefined }}>
                        {row.description}
                      </span>
                      {isDupe && (
                        <span
                          className="chip warn ml-2"
                          style={{ height: 18, padding: '0 6px', fontSize: 9.5 }}
                          title={
                            isDupeSkipped
                              ? 'Duplicate — will be skipped. Click restore to include it anyway.'
                              : 'Possible duplicate — same date, description, and amount already in your transactions'
                          }
                        >
                          {isDupeSkipped ? 'skipped' : 'duplicate'}
                        </span>
                      )}
                    </td>
                    <td className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                      <span style={{ textDecoration: isExcluded ? 'line-through' : undefined }}>
                        {formatCurrency(Number(row.amount), { fractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="text-center">
                      {onToggleExclude && (
                        <button
                          onClick={() => onToggleExclude(globalIndex)}
                          className="btn ghost icon sm"
                          aria-label={
                            isExcluded
                              ? isDupe
                                ? 'Include duplicate anyway'
                                : 'Include transaction'
                              : 'Exclude transaction'
                          }
                          title={
                            isExcluded
                              ? isDupe
                                ? 'Include this duplicate in the import anyway'
                                : 'Restore — include in import'
                              : 'Exclude from import'
                          }
                        >
                          <Icon name={isExcluded ? 'undo' : 'remove_circle'} size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div
        className="px-4 py-2.5 text-[11.5px]"
        style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-3)' }}
      >
        Showing {rows.length} of {totalCount} transactions
      </div>
    </>
  )
}
