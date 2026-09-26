import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'
import type { SplitLedgerRow } from '@/types/dashboard'

interface PeopleSectionProps {
  ledger: SplitLedgerRow[]
  /** Open (unsettled, or all when `includeSettled`) shared-charge
   *  descriptions per person, for this period — derived from `allHistory`
   *  (the ledger endpoint only returns the aggregate total). */
  openItemsByPerson: Map<string, string[]>
  includeSettled: boolean
  onToggleSettled: () => void
  isLoading: boolean
  /** The month the ledger covers, e.g. "June 2026". The ledger follows the
   *  selected period, so the section says which one rather than leaving an
   *  empty month to read as "you never split anything". */
  periodLabel: string
  /** Person lit in both this table and the 3D world's beams. */
  highlight?: string | null
  onHighlight?: (person: string | null) => void
}

/**
 * Insights §6 — People. The split ledger, in full (Home's "Needs you" only
 * shows the combined owed-total). `SplitLedgerRow` tracks a single
 * direction — what's owed TO the user (see the pre-existing
 * `SplitLedger.tsx`, "Owed to you") — there's no "you owe them" figure at
 * this aggregation, so that column reads ₹0 rather than a fabricated
 * number, and Net collapses to the same figure as "They owe you". Settling
 * needs a per-share id the aggregate ledger doesn't return, so the action
 * is disabled rather than a dead link.
 */
export function PeopleSection({
  ledger,
  openItemsByPerson,
  includeSettled,
  onToggleSettled,
  isLoading,
  periodLabel,
  highlight = null,
  onHighlight,
}: PeopleSectionProps) {
  const rows = ledger.filter((r) => Number(r.total_split_amount) > 0)
  const netTotal = rows.reduce((s, r) => s + Number(r.total_split_amount), 0)

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">People</h2>
        <span className="sub">Shared bills in {periodLabel} and who still owes what</span>
        <span className="act">
          <label className="hit44-pad-v flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[var(--ink-3)]">
            <input type="checkbox" checked={includeSettled} onChange={onToggleSettled} />
            Include settled
          </label>
        </span>
      </div>

      <div className="card card-flush">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="group"
            title={`No shared expenses in ${periodLabel}`}
            description="Split a transaction with someone to see it here."
          />
        ) : (
          <table className="tbl people-tbl">
            <thead>
              <tr>
                <th>Person</th>
                <th className="hide-sm">Open items</th>
                <th className="num">They owe you</th>
                <th className="num hide-sm">You owe them</th>
                <th className="num hide-sm">Net</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const owed = Number(row.total_split_amount)
                const initial = row.person_name.trim().charAt(0).toUpperCase() || '?'
                const items = openItemsByPerson.get(row.person_name) ?? []
                const itemsText =
                  items.length > 2
                    ? `${items.slice(0, 2).join(' · ')} · ${items.length - 2} more`
                    : items.join(' · ') || '—'
                return (
                  <tr
                    key={row.person_name}
                    className={highlight === row.person_name ? 'is-hot' : undefined}
                    onMouseEnter={onHighlight ? () => onHighlight(row.person_name) : undefined}
                    onMouseLeave={onHighlight ? () => onHighlight(null) : undefined}
                  >
                    <td className="font-medium text-[var(--ink)]">
                      <span className="people">
                        <span className="avatar">{initial}</span>
                      </span>{' '}
                      {row.person_name}
                      {/* Narrow tables drop the Open items column; the list
                          moves under the name instead of being lost. */}
                      <span
                        className="people-items-inline mt-1 line-clamp-2 text-[12px] font-normal wrap-anywhere text-[var(--ink-3)] min-[900px]:hidden"
                        title={items.join('\n') || undefined}
                      >
                        {itemsText}
                      </span>
                    </td>
                    <td
                      className="hide-sm text-[12.5px] wrap-anywhere text-[var(--ink-3)]"
                      title={items.join('\n') || undefined}
                    >
                      <span className="line-clamp-2">{itemsText}</span>
                    </td>
                    <td className="num whitespace-nowrap">{formatCurrency(owed)}</td>
                    <td className="num hide-sm whitespace-nowrap text-[var(--ink-3)]">
                      {formatCurrency(0)}
                    </td>
                    <td className="num pos hide-sm whitespace-nowrap">+{formatCurrency(owed)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn sm"
                        disabled
                        title="Settling isn't available from this summary yet — settle individual shares from Transactions."
                      >
                        <Icon name="check" size={13} />
                        <span className="max-[639px]:sr-only">Settle</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="font-medium whitespace-nowrap text-[var(--ink)]">Net position</td>
                <td className="hide-sm" />
                <td className="num whitespace-nowrap">{formatCurrency(netTotal)}</td>
                <td className="num hide-sm whitespace-nowrap">{formatCurrency(0)}</td>
                <td className="num pos hide-sm font-semibold whitespace-nowrap">
                  +{formatCurrency(netTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </section>
  )
}
