import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'btn primary',
  secondary: 'btn',
  tertiary: 'btn ghost',
  danger: 'btn danger',
}

const sizeClass: Record<Size, string> = {
  sm: 'sm',
  md: '',
  lg: 'lg',
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
      className={`${variantClass[variant]} ${sizeClass[size]} ${className}`.trim()}
    >
      {loading && (
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>
          progress_activity
        </span>
      )}
      {children}
    </button>
  )
}
