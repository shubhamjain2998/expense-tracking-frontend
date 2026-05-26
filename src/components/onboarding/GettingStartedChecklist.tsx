import { Link } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress'
import { onboardingStorage } from '@/lib/onboardingStorage'

interface GettingStartedChecklistProps {
  /**
   * Called when the user explicitly dismisses the checklist. Parent typically
   * forces a re-render so the checklist unmounts on the same tick.
   */
  onDismiss: () => void
}

interface Step {
  done: boolean
  title: string
  helper: string
  to: string
  cta: string
}

/**
 * The 4-step Getting Started card on the Dashboard. Auto-checks each step
 * from cached queries (see useOnboardingProgress); auto-hides once all four
 * are done. Until then, the user can dismiss it manually.
 */
export function GettingStartedChecklist({ onDismiss }: GettingStartedChecklistProps) {
  const progress = useOnboardingProgress()

  // Hide immediately once the user is done — mark them onboarded so we don't
  // re-prompt on a future cache miss.
  if (progress.isComplete) {
    if (!onboardingStorage.isOnboarded()) {
      onboardingStorage.setOnboarded(true)
    }
    return null
  }

  const steps: Step[] = [
    {
      done: progress.hasCategories,
      title: 'Create your first category',
      helper: 'Categories are the buckets you budget against (Rent, Groceries, Travel).',
      to: '/settings',
      cta: 'Go to Settings',
    },
    {
      done: progress.hasBudget,
      title: 'Set this year’s budget',
      helper: 'Allocate an annual amount per category so the dashboard can show pace.',
      to: '/budget',
      cta: 'Go to Budget',
    },
    {
      done: progress.hasUpload,
      title: 'Upload a bank statement',
      helper: 'Drop a PDF — we parse rows in memory and never save the file.',
      to: '/upload',
      cta: 'Go to Upload',
    },
    {
      done: progress.hasReview,
      title: 'Review your first transaction',
      helper: 'Auto-categorise pulls in known merchants; review the rest by hand.',
      to: '/transactions',
      cta: 'Go to Transactions',
    },
  ]

  function handleDismiss() {
    onboardingStorage.setChecklistDismissed(true)
    onDismiss()
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <p className="card-eyebrow">Getting started</p>
          <p className="card-title" style={{ marginTop: 2 }}>
            {progress.completedCount} of 4 complete
          </p>
        </div>
        <button
          type="button"
          className="btn ghost sm"
          onClick={handleDismiss}
          aria-label="Dismiss the Getting Started checklist"
        >
          Dismiss
        </button>
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-[var(--radius)] p-3 transition-colors"
            style={{
              background: step.done
                ? 'color-mix(in oklch, var(--accent) 6%, transparent)'
                : 'var(--surface-2)',
              border: '1px solid var(--line)',
            }}
          >
            <Icon
              aria-hidden
              name={step.done ? 'check_circle' : 'radio_button_unchecked'}
              size={20}
              style={{
                color: step.done ? 'var(--accent)' : 'var(--ink-4)',
                marginTop: 1,
              }}
            />

            <div className="min-w-0 flex-1">
              <p
                className="text-[13px] font-semibold"
                style={{
                  color: step.done ? 'var(--ink-3)' : 'var(--ink)',
                  textDecoration: step.done ? 'line-through' : 'none',
                  letterSpacing: '-0.005em',
                }}
              >
                <span className="mr-1.5 text-[var(--ink-4)]">{i + 1}.</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--ink-3)]">{step.helper}</p>
            </div>

            {!step.done && (
              <Link
                to={step.to}
                className="btn sm"
                style={{ alignSelf: 'center', gap: 4, whiteSpace: 'nowrap' }}
              >
                {step.cta}
                <Icon name="arrow_forward" size={13} />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
