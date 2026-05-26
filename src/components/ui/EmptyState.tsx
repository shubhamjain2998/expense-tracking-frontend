import { Button } from './Button'
import { Icon, type IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName
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
      {icon && <Icon name={icon} size={22} className="mb-3 text-[var(--ink-4)]" />}
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
