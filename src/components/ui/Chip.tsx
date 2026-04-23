type ChipVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

interface ChipProps {
  variant?: ChipVariant
  children: React.ReactNode
  className?: string
}

const variantClass: Record<ChipVariant, string> = {
  success: 'chip pos',
  warning: 'chip warn',
  danger: 'chip neg',
  neutral: 'chip',
  info: 'chip accent',
}

export function Chip({ variant = 'neutral', children, className = '' }: ChipProps) {
  return <span className={`${variantClass[variant]} ${className}`.trim()}>{children}</span>
}

/** Derive chip variant from pct_used value */
// eslint-disable-next-line react-refresh/only-export-components
export function pctToChipVariant(pct: number | null): ChipVariant {
  if (pct === null) return 'neutral'
  if (pct >= 100) return 'danger'
  if (pct >= 80) return 'warning'
  return 'success'
}
