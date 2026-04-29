// Muted OKLCH palette — perceptually uniform so all slices appear equally weighted
export const PIE_COLORS = [
  'oklch(0.62 0.10 250)',
  'oklch(0.65 0.10 155)',
  'oklch(0.68 0.10 75)',
  'oklch(0.63 0.10 25)',
  'oklch(0.62 0.10 310)',
  'oklch(0.65 0.10 200)',
  'oklch(0.60 0.10 350)',
  'oklch(0.65 0.08 100)',
  'oklch(0.58 0.10 270)',
  'oklch(0.70 0.09 130)',
  'oklch(0.66 0.11 50)',
  'oklch(0.60 0.12 320)',
]

export const MONTH_LABELS_FULL = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// Shared tooltip style reused across all Recharts components
export const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 6,
  boxShadow: 'var(--shadow-pop)',
  fontSize: 11.5,
  color: 'var(--ink)',
  padding: '6px 10px',
}
