/**
 * Formatting for LLM-supplied numbers. The unit is whatever the LLM wrote,
 * so this is deliberately narrow: currency only when it actually said INR,
 * plain digits when it said nothing. Guessing "no unit means money" turns
 * `{"label": "Months on time", "value": 15}` into "₹15".
 */
import { formatCurrency } from '@/lib/format'

export function formatInsightsValue(value: number, unit?: string): string {
  const u = unit?.trim()
  if (!u) return value.toLocaleString('en-IN')
  if (u.toUpperCase() === 'INR' || u === '₹') return formatCurrency(value)
  if (u === '%') return `${value.toLocaleString('en-IN')}%`
  return `${value.toLocaleString('en-IN')} ${u}`
}
