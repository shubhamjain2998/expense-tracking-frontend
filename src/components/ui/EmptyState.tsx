import { Button } from './Button'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      style={{ color: 'var(--ink-3)' }}
    >
      {icon && (
        <span
          className="material-symbols-outlined mb-3"
          style={{ fontSize: 22, color: 'var(--ink-4)' }}
        >
          {icon}
        </span>
      )}
      <h3
        className="text-[13px] font-semibold"
        style={{ color: 'var(--ink-2)', letterSpacing: '-0.005em' }}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-[12px]" style={{ color: 'var(--ink-3)' }}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
