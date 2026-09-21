/**
 * Small pure helpers the Insights page uses to turn the LLM's numbers into
 * something drawable. Kept out of the components so the arithmetic is
 * testable on its own — the LLM supplies `from`/`to` and the app, not the
 * prose, works out the change.
 */
import type { InsightsFinding } from './insightsResponseSchema'

/** Percent change from → to, or null when it isn't defined (a zero base, or
 *  a sign flip, where a percentage would mislead more than it explains). */
export function percentChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null
  if (from === 0) return null
  if (from < 0 !== to < 0) return null
  return ((to - from) / Math.abs(from)) * 100
}

/** Past this, a percentage stops informing: "+1106%" is noise where "12x" is
 *  a fact. Shrinkage needs no equivalent — it is bounded at -100%. */
const MULTIPLE_THRESHOLD_PCT = 300

/** "+51%" / "-27%" / "+8.4%" — one decimal only where whole numbers would
 *  round a small but real move down to nothing. */
export function formatDelta(pct: number): string {
  const sign = pct > 0 ? '+' : pct < 0 ? '-' : ''
  const abs = Math.abs(pct)
  const digits = abs < 10 && abs !== Math.round(abs) ? 1 : 0
  return `${sign}${abs.toFixed(digits)}%`
}

/**
 * How a before/after pair reads on a chip: a percentage for ordinary moves,
 * a multiple once the percentage gets too large to parse. Null when the pair
 * cannot honestly be expressed as either.
 */
export function formatChange(from: number, to: number): string | null {
  const pct = percentChange(from, to)
  if (pct === null) return null
  if (pct >= MULTIPLE_THRESHOLD_PCT) {
    const multiple = Math.abs(to) / Math.abs(from)
    return `${multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)}x`
  }
  return formatDelta(pct)
}

/** The stored payload comes back from the API, where an absent optional
 *  number is JSON `null` rather than `undefined`. */
export function hasImpact(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value !== 0
}

export interface StakeRow {
  id: string
  title: string
  amount: number
  /** 0–1, this row's share of the largest amount — the bar's width. */
  ratio: number
}

/**
 * The findings that carry a yearly figure, ranked by it. This is the page's
 * answer to "where do I actually look first", and it replaces reading four
 * paragraphs to find out.
 *
 * `good` findings are left out however large their figure: "your SIPs never
 * missed, worth 2.4L" is reassurance, not something at stake, and ranking it
 * first would send the reader to the one row that needs nothing from them.
 * The figure still shows on the finding itself.
 */
export function toStakeRows(findings: InsightsFinding[]): StakeRow[] {
  const rows = findings
    .filter((f) => f.severity !== 'good' && hasImpact(f.annual_impact))
    .map((f) => ({ id: f.id, title: f.title, amount: Math.abs(f.annual_impact as number) }))
    .sort((a, b) => b.amount - a.amount)
  const max = rows[0]?.amount ?? 0
  if (max <= 0) return []
  return rows.map((r) => ({ ...r, ratio: r.amount / max }))
}
