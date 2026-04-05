import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-50',
  secondary:
    'bg-secondary-container text-on-secondary-container hover:opacity-80 disabled:opacity-50',
  tertiary: 'bg-transparent text-primary hover:underline underline-offset-2 disabled:opacity-50',
  danger: 'bg-error-container text-on-error-container hover:opacity-80 disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`focus-visible:ring-primary/50 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && (
        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
      )}
      {children}
    </button>
  )
}
