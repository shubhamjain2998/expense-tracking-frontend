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
    <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--ink-3)]">
      {icon && (
        <span className="material-symbols-outlined mb-3 text-[22px] text-[var(--ink-4)]">
          {icon}
        </span>
      )}
      <h3 className="display text-[22px] text-[var(--ink-2)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-[36ch] text-[12.5px] text-[var(--ink-3)]">{description}</p>
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
