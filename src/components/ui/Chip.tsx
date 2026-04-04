type ChipVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

interface ChipProps {
  variant?: ChipVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<ChipVariant, string> = {
  success: 'bg-[#8dd0e7] text-[#001f27]',
  warning: 'bg-[#fbb97c] text-[#683c09]',
  danger: 'bg-[#ffdad6] text-[#93000a]',
  neutral: 'bg-[#d6e5ec] text-[#58676d]',
  info: 'bg-[#d6e5ec] text-[#101d23]',
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
export function pctToChipVariant(pct: number | null): ChipVariant {
  if (pct === null) return 'neutral'
  if (pct >= 100) return 'danger'
  if (pct >= 80) return 'warning'
  return 'success'
}
