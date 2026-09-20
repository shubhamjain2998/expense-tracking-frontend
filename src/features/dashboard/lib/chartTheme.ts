// Ledger design system, MASTER.md §2: the data greys (--d1..--d5, largest→
// smallest) are the only palette charts may use, plus --accent for a single
// highlighted/selected series. No 8-hue category palette any more — this
// used to be a 12-stop OKLCH rainbow; callers still cycle through it by
// index/hash, which works unchanged against a shorter greyscale ramp.
export const PIE_COLORS = [
  'var(--d1)',
  'var(--d2)',
  'var(--d3)',
  'var(--d4)',
  'var(--d5)',
  'var(--accent)',
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
