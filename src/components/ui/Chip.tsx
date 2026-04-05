type ChipVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

interface ChipProps {
  variant?: ChipVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<ChipVariant, string> = {
  success: 'bg-primary-fixed-dim text-on-primary-fixed',
  warning: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
  danger: 'bg-error-container text-on-error-container',
  neutral: 'bg-secondary-container text-on-secondary-container',
  info: 'bg-secondary-container text-on-secondary-container',
}

export function Chip({ variant = 'neutral', children, className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

/** Derive chip variant from pct_used value */
// eslint-disable-next-line react-refresh/only-export-components
export function pctToChipVariant(pct: number | null): ChipVariant {
  if (pct === null) return 'neutral'
  if (pct >= 100) return 'danger'
  if (pct >= 80) return 'warning'
  return 'success'
}
