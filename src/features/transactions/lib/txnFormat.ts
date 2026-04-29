import { formatCurrency } from '@/lib/format'

export function isIncome(amount: string | number): boolean {
  return Number(amount) < 0
}

export function formatAmount(effectiveAmount: string | number): {
  display: string
  income: boolean
} {
  const n = Number(effectiveAmount)
  const income = n < 0
  return {
    display: formatCurrency(Math.abs(n), { fractionDigits: 2 }),
    income,
  }
}
