import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'

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
      {loading && <Icon name="progress_activity" size={14} className="animate-spin" />}
      {children}
    </button>
  )
}
