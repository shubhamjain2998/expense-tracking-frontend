/** 5 evenly-spaced "nice" ticks (0, step, 2·step, 3·step, 4·step) so the
 *  axis never lands on odd values like ₹65.0k between round lakh steps. */
export function niceAxisTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0]
  const rawStep = maxValue / 4
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = niceNormalized * magnitude
  return [0, step, step * 2, step * 3, step * 4]
}

export interface AxisUnit {
  divisor: number
  suffix: string
  decimals: number
}

/** One consistent unit for every tick on the axis, chosen from the top
 *  tick — never a mix of "65.0k" next to "2.6L". */
export function axisUnit(maxTick: number): AxisUnit {
  if (maxTick >= 1e7) return { divisor: 1e7, suffix: 'Cr', decimals: 1 }
  if (maxTick >= 1e5) return { divisor: 1e5, suffix: 'L', decimals: 1 }
  if (maxTick >= 1e3) return { divisor: 1e3, suffix: 'k', decimals: 0 }
  return { divisor: 1, suffix: '', decimals: 0 }
}

export function formatAxisTick(value: number, unit: AxisUnit): string {
  if (value === 0) return '₹0'
  return `₹${(value / unit.divisor).toFixed(unit.decimals)}${unit.suffix}`
}
