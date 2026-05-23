import { forwardRef } from 'react'

import { formatNumberGrouped, parseNumberInput } from '@/lib/format'

type NativeInputProps = React.InputHTMLAttributes<HTMLInputElement>

interface AmountInputProps extends Omit<NativeInputProps, 'value' | 'onChange' | 'type'> {
  /** Raw numeric string (no commas). Empty string for empty input. */
  value: string
  /** Called with the raw numeric string after stripping commas. */
  onChange: (raw: string) => void
}

/**
 * Text input that displays a number with en-IN grouping (e.g. 1,23,456) while
 * exposing the raw digit string to the parent. Use anywhere a user types
 * monetary amounts the backend will receive as `Number(value)`.
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, ...rest }, ref) => (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={formatNumberGrouped(value)}
      onChange={(e) => onChange(parseNumberInput(e.target.value))}
      {...rest}
    />
  )
)
AmountInput.displayName = 'AmountInput'
