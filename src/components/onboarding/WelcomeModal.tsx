import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'

interface WelcomeModalProps {
  onGetStarted: () => void
  onSkip: () => void
}

interface PlaybookStep {
  icon: IconName
  title: string
  why: string
  todo: string
}

const STEPS: PlaybookStep[] = [
  {
    icon: 'category',
    title: 'Categorise',
    why: "Categories are the buckets every chart, budget and report aggregates against. Without them there's nothing to analyse — just a list of rows.",
    todo: 'In Settings → Categories, add names like Rent, Groceries, Travel. Start with 6–10; you can split or rename them later.',
  },
  {
    icon: 'account_balance_wallet',
    title: 'Budget',
    why: "An annual budget smooths the lumpy months — travel, insurance, gifts — that a monthly budget can't represent. The dashboard converts it back into monthly pace automatically.",
    todo: "On the Budget page, set a yearly ₹ amount per category. Think of it as what you'd spend across all 12 months combined.",
  },
  {
    icon: 'upload',
    title: 'Ingest',
    why: 'Bank statements are the source of truth — every chart in the app derives from them. PDFs are parsed in memory and never saved; only the parsed rows survive.',
    todo: 'Drop a statement PDF on the Upload page. Parsed transactions land in a review queue, not your live data.',
  },
  {
    icon: 'fact_check',
    title: 'Review & analyse',
    why: 'Auto-categorisation handles merchants we’ve seen before, but new ones need a human call. Every confirmation trains the next import, so the queue shrinks over time.',
    todo: 'On the Transactions page, confirm or fix the category for each pending row. The dashboard updates as soon as they’re approved.',
  },
]

/**
 * First-login welcome modal — a 4-page playbook explaining why each step of
 * the loop exists and what the user fills in there. Visual treatment mirrors
 * ConfirmDialog (backdrop blur + fade-up + dismiss-on-backdrop).
 *
 * Mount-gated by the parent (`{welcomeOpen && <WelcomeModal ... />}`) so step
 * state resets naturally on re-open (e.g. from the Settings reset action).
 */
export function WelcomeModal({ onGetStarted, onSkip }: WelcomeModalProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]!
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onSkip()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setStepIndex((i) => Math.max(i - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSkip])

  function handleNext() {
    if (isLast) onGetStarted()
    else setStepIndex((i) => i + 1)
  }

  // Portal to <body> so the overlay isn't trapped by the `animate-fade-up`
  // wrapper in Layout (its CSS transform creates a containing block for
  // fixed-positioned descendants, mis-centering the modal).
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-[8px] md:p-10"
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
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        style={{ animation: 'pop .18s ease' }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 pt-[18px] pb-3">
          <div>
            <p className="card-eyebrow">{isFirst ? 'Welcome' : 'Playbook'}</p>
            <h2
              id="welcome-modal-title"
              className="mt-1 flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-[var(--ink)]"
            >
              <Icon name={step.icon} size={22} aria-hidden className="text-[var(--accent)]" />
              {step.title}
            </h2>
          </div>
          <span className="mt-1 shrink-0 text-[11px] font-medium tracking-[0.04em] text-[var(--ink-3)] uppercase">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>

        <div className="space-y-4 overflow-auto px-5 py-[18px]">
          {isFirst && (
            <p className="text-[13px] leading-[1.55] text-[var(--ink-2)]">
              Personal Finance is a four-step loop you repeat each month. Here&apos;s why each step
              is there and what you&apos;ll fill in.
            </p>
          )}

          <div>
            <p className="card-eyebrow" style={{ marginBottom: 4 }}>
              Why this exists
            </p>
            <p className="text-[13px] leading-[1.55] text-[var(--ink-2)]">{step.why}</p>
          </div>

          <div>
            <p className="card-eyebrow" style={{ marginBottom: 4 }}>
              What you&apos;ll do
            </p>
            <p className="text-[13px] leading-[1.55] text-[var(--ink-2)]">{step.todo}</p>
          </div>

          <div className="flex items-center gap-1.5 pt-1" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  background: i <= stepIndex ? 'var(--accent)' : 'var(--line)',
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-5 py-3">
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setStepIndex((i) => i - 1)}
            disabled={isFirst}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="tertiary" size="sm" onClick={onSkip}>
              Skip — I&apos;ll explore
            </Button>
            <Button variant="primary" size="sm" onClick={handleNext} autoFocus>
              {isLast ? 'Get started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
