import { useEffect } from 'react'

import { Button } from '../ui/Button'

interface WelcomeModalProps {
  isOpen: boolean
  onGetStarted: () => void
  onSkip: () => void
}

/**
 * First-login welcome modal. Visual language mirrors ConfirmDialog so the
 * overlay treatment (blur + animation + dismiss-on-backdrop) stays consistent
 * with the rest of the app.
 */
export function WelcomeModal({ isOpen, onGetStarted, onSkip }: WelcomeModalProps) {
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onSkip])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-10 backdrop-blur-[8px]"
      style={{
        background: 'color-mix(in oklch, var(--bg) 60%, transparent)',
        animation: 'fade-up .15s ease',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="absolute inset-0" onClick={onSkip} />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        style={{ animation: 'pop .18s ease' }}
      >
        <div className="border-b border-[var(--line)] px-5 pt-[18px] pb-3">
          <p className="card-eyebrow">Welcome</p>
          <h2
            id="welcome-modal-title"
            className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-[var(--ink)]"
          >
            Track every rupee against an annual budget.
          </h2>
        </div>

        <div className="space-y-3 overflow-auto px-5 py-[18px]">
          <p className="text-[13px] leading-[1.55] text-[var(--ink-2)]">
            Personal Finance is a four-step loop, repeated each month:
          </p>
          <ol className="space-y-2.5 text-[13px] leading-[1.55] text-[var(--ink-2)]">
            <li className="flex gap-2.5">
              <span
                className="material-symbols-outlined mt-0.5 text-[var(--accent)]"
                style={{ fontSize: 18 }}
                aria-hidden
              >
                category
              </span>
              <span>
                <strong className="text-[var(--ink)]">Categorise.</strong> Create the buckets you
                want to budget against — Rent, Groceries, Travel.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="material-symbols-outlined mt-0.5 text-[var(--accent)]"
                style={{ fontSize: 18 }}
                aria-hidden
              >
                account_balance_wallet
              </span>
              <span>
                <strong className="text-[var(--ink)]">Budget.</strong> Set an annual amount per
                category for the year.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="material-symbols-outlined mt-0.5 text-[var(--accent)]"
                style={{ fontSize: 18 }}
                aria-hidden
              >
                upload
              </span>
              <span>
                <strong className="text-[var(--ink)]">Ingest.</strong> Upload a bank-statement PDF —
                transactions land in a review queue.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="material-symbols-outlined mt-0.5 text-[var(--accent)]"
                style={{ fontSize: 18 }}
                aria-hidden
              >
                insights
              </span>
              <span>
                <strong className="text-[var(--ink)]">Review &amp; analyse.</strong> Confirm
                categories; the dashboard shows budget vs. actual.
              </span>
            </li>
          </ol>
          <p className="text-[12px] leading-[1.55] text-[var(--ink-3)]">
            A checklist on your dashboard tracks these steps as you go.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
          <Button variant="tertiary" size="sm" onClick={onSkip}>
            Skip — I&apos;ll explore
          </Button>
          <Button variant="primary" size="sm" onClick={onGetStarted} autoFocus>
            Get started
          </Button>
        </div>
      </div>
    </div>
  )
}
