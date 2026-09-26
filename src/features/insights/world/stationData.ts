/**
 * Shaping for the Insights world's stations. Pure; every number here is
 * already on the page — in a panel, in the prompt the page builds, or in the
 * sr-only table beside the stage — so the scene never disagrees with the
 * panel it sits next to.
 */
import type { SplitLedgerRow } from '@/types/dashboard'

import type { InsightsAggregates } from '../lib/insightsAggregates'
import { hasImpact } from '../lib/insightsDerive'
import type {
  InsightsFinding,
  InsightsMetric,
  InsightsPattern,
  InsightsSeverity,
} from '../lib/insightsResponseSchema'

const MONTH_NAMES = [
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

// ── Your data · the prompt's window as rings of months ─────────────────────

export interface RingMonth {
  /** YYYY-MM */
  key: string
  /** 1–12; the month's angle on the ring. */
  calMonth: number
  year: number
  /** 0 = the latest twelve months, 1 = the twelve before them, … */
  ring: number
  spent: number
  income: number
  /** Spend passed what came in that month. */
  over: boolean
}

export interface MonthRing {
  months: RingMonth[]
  rings: number
  /** Tallest spend or income in the window — the station's one height scale. */
  max: number
}

/**
 * Every month the prompt covers, oldest first, with what went out and what
 * came in. A month sits at its calendar angle, and months a year apart share
 * that angle one ring apart, so the ring reads as seasonality: the same
 * month, this year against last.
 */
export function buildMonthRing(aggregates: InsightsAggregates): MonthRing {
  const [startYear, startMonth] = aggregates.periodStart.split('-').map(Number)
  const count = Math.max(0, aggregates.monthsCovered || 0)
  if (!startYear || !startMonth || count === 0) return { months: [], rings: 0, max: 0 }

  const spend = new Map<string, number>()
  for (const c of aggregates.categoryMonthTotals) {
    spend.set(c.month, (spend.get(c.month) ?? 0) + Math.max(0, c.total || 0))
  }
  const income = new Map(aggregates.incomeByMonth.map((m) => [m.month, Math.max(0, m.total || 0)]))

  const months: RingMonth[] = []
  for (let i = 0; i < count; i++) {
    const idx = startMonth - 1 + i
    const year = startYear + Math.floor(idx / 12)
    const calMonth = (idx % 12) + 1
    const key = `${year}-${String(calMonth).padStart(2, '0')}`
    const spent = spend.get(key) ?? 0
    const came = income.get(key) ?? 0
    months.push({
      key,
      calMonth,
      year,
      ring: Math.floor((count - 1 - i) / 12),
      spent,
      income: came,
      over: came > 0 && spent > came,
    })
  }
  const max = months.reduce((m, x) => Math.max(m, x.spent, x.income), 0)
  return { months, rings: Math.ceil(count / 12), max }
}

export function monthName(calMonth: number): string {
  return MONTH_NAMES[calMonth - 1] ?? ''
}

// ── Verdict · one token per metric ─────────────────────────────────────────

export type TokenTone = 'pos' | 'neg' | 'neutral' | 'plain'

export interface MetricToken {
  id: string
  label: string
  metric: InsightsMetric
  tone: TokenTone
  direction: 'up' | 'down' | 'flat' | null
}

/**
 * Metrics arrive in unlike units — a rate, a share, a count — so no height
 * could compare them honestly. Each gets the same token instead, tilted by
 * its direction and coloured by the tone the LLM gave it.
 */
export function buildMetricTokens(metrics: InsightsMetric[]): MetricToken[] {
  return (metrics ?? []).map((m) => ({
    id: m.id,
    label: m.label,
    metric: m,
    tone:
      m.tone === 'positive'
        ? 'pos'
        : m.tone === 'negative'
          ? 'neg'
          : m.tone === 'neutral'
            ? 'neutral'
            : 'plain',
    direction: m.direction ?? null,
  }))
}

// ── At stake · one slab per finding ────────────────────────────────────────

export type SlabTone = 'neg' | 'pos' | 'plain'

export interface Slab {
  id: string
  title: string
  severity: InsightsSeverity
  /** What acting on it is worth a year; 0 when the finding carries none. */
  amount: number
  tone: SlabTone
}

export interface SlabModel {
  slabs: Slab[]
  /** Largest yearly figure — the station's one height scale. */
  max: number
}

/**
 * Every finding, in the order the findings list shows them (the LLM's own
 * ranking), so slab n is row n. Height is the yearly figure; a finding with
 * none lies flat rather than being dropped.
 */
export function buildSlabs(findings: InsightsFinding[]): SlabModel {
  const slabs = (findings ?? []).map<Slab>((f) => ({
    id: f.id,
    title: f.title,
    severity: f.severity,
    amount: hasImpact(f.annual_impact) ? Math.abs(f.annual_impact) : 0,
    tone:
      f.severity === 'critical' || f.severity === 'warning'
        ? 'neg'
        : f.severity === 'good'
          ? 'pos'
          : 'plain',
  }))
  return { slabs, max: slabs.reduce((m, s) => Math.max(m, s.amount), 0) }
}

// ── Patterns · a stack of plates ───────────────────────────────────────────

export interface Plate {
  id: string
  title: string
}

/** Patterns carry no figure, so every plate is the same size: the stack
 *  counts them and nothing more. First pattern on top, as the list reads. */
export function buildPlates(patterns: InsightsPattern[]): Plate[] {
  return (patterns ?? []).map((p) => ({ id: p.id, title: p.title }))
}

// ── People · one balance beam per person ───────────────────────────────────

export interface Beam {
  person: string
  theyOweYou: number
  youOweThem: number
  /** −1…1: positive tips towards "they owe you", scaled by the largest
   *  balance on the page so beams compare with one another. */
  tilt: number
}

export interface BeamModel {
  beams: Beam[]
  /** Largest balance either way — the station's one height scale. */
  max: number
}

/**
 * The same rows, in the same order, as the People table — so beam n is row
 * n. The ledger tracks one direction only (what's owed to you), so "you owe
 * them" is 0 here exactly as it is in the table's column.
 */
export function buildBeams(ledger: SplitLedgerRow[]): BeamModel {
  const rows = (ledger ?? [])
    .map((r) => ({ person: r.person_name, theyOweYou: Number(r.total_split_amount) }))
    .filter((r) => Number.isFinite(r.theyOweYou) && r.theyOweYou > 0)
  const max = rows.reduce((m, r) => Math.max(m, r.theyOweYou), 0)
  return {
    beams: rows.map((r) => ({
      person: r.person,
      theyOweYou: r.theyOweYou,
      youOweThem: 0,
      tilt: max > 0 ? r.theyOweYou / max : 0,
    })),
    max,
  }
}
