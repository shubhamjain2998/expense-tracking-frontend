import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { RecurringResult } from '@/features/dashboard/lib/contracts'
import { formatCurrency } from '@/lib/format'

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

function cadenceLabel(
  cadence: RecurringResult['commitments'][number]['cadence'],
  lastCharged: string
): string {
  if (cadence === 'monthly') {
    const day = new Date(lastCharged.slice(0, 10) + 'T00:00:00').getDate()
    return Number.isFinite(day) ? `${ordinal(day)} of month` : 'monthly'
  }
  return cadence
}

interface CommitmentsSectionProps {
  recurring: RecurringResult
  isLoading: boolean
}

/**
 * Insights §5 — Every commitment. The full list Home only summarises
 * (`CommittedVsChosen` shows the next 14 days). Same `detectRecurring`
 * call as Home — the MEDIAN monthly rule and tag-key bypass are untouched
 * (lib/recurring.ts is not edited here).
 *
 * The mock shows a "seen N/M" denominator and a per-month change amount;
 * `RecurringCommitment` only carries `monthsSeen` (a count, no window
 * denominator) and a `changed` flag (no delta/month) — rendered as "N
 * months" and a "changed" chip respectively rather than fabricating the
 * missing figures.
 */
export function CommitmentsSection({ recurring, isLoading }: CommitmentsSectionProps) {
  const total = recurring.commitments.reduce((s, c) => s + c.monthlyAmount, 0)

  return (
    <section className="sec">
      <div className="sec-head">
        <h2 className="sec-title">Every commitment</h2>
        <span className="sub">
          Detected from 6+ months of history · the monthly figure is the median, never the mean
        </span>
      </div>

      <div className="card card-flush">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : recurring.commitments.length === 0 ? (
          <EmptyState
            icon="refresh"
            title="No recurring charges detected yet"
            description="Once a charge repeats with a stable amount across a few months, it shows up here."
          />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Charge</th>
                <th>Cadence</th>
                <th>Seen</th>
                <th className="num">Median / month</th>
                <th className="num">Change</th>
              </tr>
            </thead>
            <tbody>
              {recurring.commitments.map((c) => (
                <tr key={c.key}>
                  <td className="font-medium text-[var(--ink)]">{c.name}</td>
                  <td className="text-[12.5px] text-[var(--ink-3)]">
                    {cadenceLabel(c.cadence, c.lastCharged)}
                  </td>
                  <td className="num text-[12.5px] text-[var(--ink-3)]">
                    {c.monthsSeen} month{c.monthsSeen === 1 ? '' : 's'}
                  </td>
                  <td className="num">{formatCurrency(c.monthlyAmount)}</td>
                  <td className="num text-[12.5px]">
                    {c.flags.includes('changed') ? (
                      <span className="warn">changed</span>
                    ) : (
                      <span className="text-[var(--ink-3)]">flat</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="font-medium text-[var(--ink)]">
                  {recurring.commitments.length} commitment
                  {recurring.commitments.length === 1 ? '' : 's'}
                </td>
                <td />
                <td />
                <td className="num font-semibold text-[var(--ink)]">{formatCurrency(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </section>
  )
}
