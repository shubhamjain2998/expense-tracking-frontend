import { useEffect, useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useFocusReturn } from '@/hooks/useFocusReturn'
import { formatShortDate, todayIsoDate } from '@/lib/format'

import { monthYearLabel, shiftMonths } from '../lib/copyDate'
import { formatAmount } from '../lib/txnFormat'
import type { UnifiedTxn } from '../types'

interface CopyToMonthDialogProps {
  txn: UnifiedTxn
  loading?: boolean
  /** Receives the target date as "YYYY-MM-DD". */
  onCopy: (txnDate: string) => void
  onCancel: () => void
}

/**
 * Copy one row into another month — the manual side of a recurring charge
 * (rent, a SIP, a cash payment) that no statement import will ever bring in.
 *
 * The month stepper is the primary control because that is the shape of the
 * task; the date field stays visible and editable underneath because the day
 * within the month is often not the same one (rent moves, a bill lands late).
 * Stepping clamps the day to the target month, so 31 Jan steps to 28 Feb
 * rather than overflowing into March.
 */
export function CopyToMonthDialog({
  txn,
  loading = false,
  onCopy,
  onCancel,
}: CopyToMonthDialogProps) {
  const titleId = useId()
  const dateId = useId()
  const sourceDate = txn.txn_date.slice(0, 10)
  // Default to the month after the source: repeating a charge forward is the
  // common case, and backfilling is one tap on the other arrow.
  const [date, setDate] = useState(() => shiftMonths(sourceDate, 1))

  useFocusReturn(true)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const { display: amountDisplay } = formatAmount(txn.effectiveAmount, txn.txnType)
  const isProcessed = txn.kind === 'processed'
  const isFuture = date > todayIsoDate()
  const sameMonth = date.slice(0, 7) === sourceDate.slice(0, 7)

  const carried: string[] = []
  if (txn.category) carried.push(txn.category.toLowerCase())
  if (txn.tags.length) carried.push(`${txn.tags.length} tag${txn.tags.length === 1 ? '' : 's'}`)
  if (txn.shares.length)
    carried.push(`${txn.shares.length} split${txn.shares.length === 1 ? '' : 's'}`)
  if (txn.notes?.trim()) carried.push('notes')

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-[8px] md:p-10"
      style={{
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        animation: 'fade-up .15s ease',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close copy dialog"
        onClick={onCancel}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-sm flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        style={{ animation: 'pop .18s ease' }}
      >
        <div className="border-b border-[var(--line)] px-5 pt-[18px] pb-3">
          <h2
            id={titleId}
            className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]"
          >
            Copy to another month
          </h2>
          <p className="mt-1 text-[12.5px] text-[var(--ink-3)]">
            Adds a second transaction on the date you pick. This one stays where it is.
          </p>
        </div>

        <div className="flex flex-col gap-4 overflow-auto px-5 py-[14px]">
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-[var(--ink)]">
                {txn.description}
              </span>
              <span className="num shrink-0 text-[13px] font-semibold text-[var(--ink)]">
                {amountDisplay}
              </span>
            </div>
            <span className="mt-0.5 block text-[11.5px] text-[var(--ink-3)]">
              {formatShortDate(sourceDate)}
              {carried.length > 0 && ` · ${carried.join(' · ')}`}
            </span>
          </div>

          <div>
            <p className="eyebrow mb-1.5" id={`${titleId}-month`}>
              Copy to
            </p>
            <div
              className="flex items-center gap-2"
              role="group"
              aria-labelledby={`${titleId}-month`}
            >
              <div className="ym flex-1">
                <button
                  type="button"
                  onClick={() => setDate((d) => shiftMonths(d, -1))}
                  aria-label="Previous month"
                >
                  <Icon name="chevron_left" size={14} />
                </button>
                <div className="label">{monthYearLabel(date)}</div>
                <button
                  type="button"
                  onClick={() => setDate((d) => shiftMonths(d, 1))}
                  aria-label="Next month"
                >
                  <Icon name="chevron_right" size={14} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="eyebrow mb-1 block" htmlFor={dateId}>
              Date
            </label>
            <input
              id={dateId}
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value || sourceDate)}
            />
          </div>

          {sameMonth && (
            <p className="text-[11.5px] text-[var(--ink-3)]">
              Same month as the original — this will be a second charge in {monthYearLabel(date)}.
            </p>
          )}

          {isFuture && (
            <p className="flex items-start gap-1.5 text-[11.5px] text-[var(--warn)]">
              <Icon name="info" size={13} className="mt-px shrink-0" />
              <span>
                That date is in the future. The copy counts in {monthYearLabel(date)}, not in this
                month&rsquo;s totals.
              </span>
            </p>
          )}

          <p className="text-[11.5px] text-[var(--ink-3)]">
            {isProcessed
              ? 'Category, tags, notes and splits carry over. No rule is saved.'
              : 'This row has no category yet, so the copy lands in Needs review.'}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={() => onCopy(date)}
            style={{ gap: 5 }}
          >
            <Icon name="content_copy" size={13} />
            Copy
          </Button>
        </div>
      </div>
    </div>
  )
}
