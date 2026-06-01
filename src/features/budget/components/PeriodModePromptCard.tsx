import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { usePeriodMode } from '@/hooks/usePeriodMode'
import type { PeriodMode } from '@/lib/period'

const OPTIONS: { id: PeriodMode; title: string; description: string }[] = [
  {
    id: 'fy',
    title: 'Indian financial year (Apr–Mar)',
    description:
      'Budgets and reports run from April to the following March. Years are labelled like "FY 25-26".',
  },
  {
    id: 'calendar',
    title: 'Calendar year (Jan–Dec)',
    description:
      'Budgets and reports run January to December. Years are labelled by their number (2026).',
  },
]

export function PeriodModePromptCard() {
  const { setMode, isSavingMode, isModeError } = usePeriodMode()
  const [selected, setSelected] = useState<PeriodMode>('fy')

  function handleContinue() {
    setMode(selected)
  }

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ maxWidth: 560 }}>
        <p className="card-eyebrow">First-time setup</p>
        <h2
          className="text-[18px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: 4 }}
        >
          Pick your year framing before setting a budget
        </h2>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--ink-3)' }}>
          Every report — dashboard totals, monthly trends, year-to-date spend — uses this to decide
          where one year ends and the next begins. It applies to your account on every device, so
          pick the one you actually budget against.
        </p>
      </div>

      <div
        className="mt-5"
        style={{
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          maxWidth: 560,
        }}
      >
        {OPTIONS.map((opt, i) => {
          const isOn = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className="flex w-full items-start gap-3 text-left"
              style={{
                padding: '14px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                background: isOn ? 'var(--surface-2)' : 'transparent',
                transition: 'background .12s ease',
                cursor: 'pointer',
              }}
            >
              <Icon
                name={isOn ? 'radio_button_checked' : 'radio_button_unchecked'}
                size={18}
                className="shrink-0"
                style={{ color: isOn ? 'var(--accent)' : 'var(--ink-4)', marginTop: 1 }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>
                  {opt.title}
                </p>
                <p className="text-[12.5px]" style={{ color: 'var(--ink-3)', marginTop: 3 }}>
                  {opt.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" size="md" onClick={handleContinue} loading={isSavingMode}>
          Continue
        </Button>
        {isModeError ? (
          <p className="text-[12px]" style={{ color: 'var(--red)' }}>
            Failed to save — please try again.
          </p>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--ink-4)' }}>
            You can change this later from Settings.
          </p>
        )}
      </div>
    </div>
  )
}
