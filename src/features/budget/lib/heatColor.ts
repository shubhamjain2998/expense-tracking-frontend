export const CAT_COLORS = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
  'var(--cat-7)',
  'var(--cat-8)',
]

export function heatColor(pct: number | null): { bg: string; fg: string } {
  if (pct === null) return { bg: 'transparent', fg: 'transparent' }
  if (pct >= 100) return { bg: 'var(--neg-soft)', fg: 'var(--neg)' }
  if (pct >= 80) return { bg: 'var(--warn-soft)', fg: 'var(--warn)' }
  return { bg: 'var(--accent-soft)', fg: 'var(--accent)' }
}
