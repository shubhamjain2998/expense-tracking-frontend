import type { ReactNode } from 'react'

import { Button } from './Button'
import { Icon, type IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName
  /** Optional custom illustration that replaces `icon` when present.
   *  Pass an SVG or a small composed element. Use `currentColor` to inherit
   *  the muted `--ink-4` from the wrapper. */
  illustration?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, illustration, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-[var(--ink-3)]">
      {illustration ? (
        <div className="mb-5 text-[var(--ink-4)]">{illustration}</div>
      ) : icon ? (
        <div
          className="mb-4 flex size-14 items-center justify-center rounded-full"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-4)' }}
        >
          <Icon name={icon} size={26} />
        </div>
      ) : null}
      <h3 className="display text-[22px] text-[var(--ink)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
