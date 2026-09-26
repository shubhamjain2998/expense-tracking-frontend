/**
 * The month as a skyline: one column per calendar day, as tall as that day's
 * spend, split into processed and pending. Pure — shaping, positions, labels
 * and the tooltip all live here so the scene and the screen-reader table read
 * the same numbers.
 */
import { stationX, type StationFrame } from '@/components/world/cameraPath'
import type { WorldLabel, WorldTip } from '@/components/world/types'
import { formatCurrency } from '@/lib/format'

import { txnTotals } from '../lib/txnFormat'
import type { UnifiedTxn } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface SkylineDay {
  /** Day of the month, 1-based. */
  day: number
  /** "Thu 11 Jun". */
  label: string
  /** Spend already categorised. */
  processed: number
  /** Spend still waiting to be categorised. */
  pending: number
  /** Live transactions on the day, money in included. */
  count: number
  pendingCount: number
}

export interface SkylineModel {
  days: SkylineDay[]
  /** Tallest day, processed + pending — the one height scale. */
  max: number
  processed: number
  pending: number
}

/**
 * Buckets a month's rows by calendar day. Spend is money out only, with the
 * same sign rules as the page heading and the table footer (`txnTotals`), so
 * a day's column adds up with the rows beneath it. Deleted rows and rows
 * dated outside the month are left out.
 */
export function buildSkyline(txns: UnifiedTxn[], calYear: number, calMonth: number): SkylineModel {
  const daysInMonth = new Date(Date.UTC(calYear, calMonth, 0)).getUTCDate()
  const prefix = `${calYear}-${String(calMonth).padStart(2, '0')}-`
  const byDay = new Map<number, UnifiedTxn[]>()
  for (const t of txns) {
    if (t.kind === 'deleted' || !t.txn_date.startsWith(prefix)) continue
    const day = Number(t.txn_date.slice(prefix.length, prefix.length + 2))
    if (!(day >= 1 && day <= daysInMonth)) continue
    const list = byDay.get(day)
    if (list) list.push(t)
    else byDay.set(day, [t])
  }

  const days: SkylineDay[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const rows = byDay.get(day) ?? []
    const pendingRows = rows.filter((t) => t.kind === 'pending')
    const weekday = new Date(Date.UTC(calYear, calMonth - 1, day)).getUTCDay()
    days.push({
      day,
      label: `${WEEKDAYS[weekday]} ${day} ${MONTHS[calMonth - 1]}`,
      processed: txnTotals(rows.filter((t) => t.kind === 'processed')).expenseTotal,
      pending: txnTotals(pendingRows).expenseTotal,
      count: rows.length,
      pendingCount: pendingRows.length,
    })
  }

  return {
    days,
    max: days.reduce((m, d) => Math.max(m, d.processed + d.pending), 0),
    processed: days.reduce((s, d) => s + d.processed, 0),
    pending: days.reduce((s, d) => s + d.pending, 0),
  }
}

// ── Layout, in world units ──────────────────────────────────────────────────

/**
 * The kit's ground rule runs from x −8 to +14 at z 2.2 for a single station,
 * so the skyline is centred on +3 and spans that rule: it reads as the axis.
 */
export const SKYLINE = {
  centerX: stationX(0) + 3,
  span: 21,
  height: 4,
  /** Column footprint as a share of the day's slot. */
  fill: 0.62,
  depth: 0.6,
  z: 1.2,
  /** The thin tile under every day, spend or not. */
  tile: 0.05,
} as const

export function dayStep(count: number): number {
  return count > 0 ? SKYLINE.span / count : SKYLINE.span
}

export function dayX(index: number, count: number): number {
  return SKYLINE.centerX + (index - (count - 1) / 2) * dayStep(count)
}

export function dayHeight(model: SkylineModel, amount: number): number {
  return model.max > 0 ? (amount / model.max) * SKYLINE.height : 0
}

export function skylineFrame(): StationFrame {
  return {
    center: [SKYLINE.centerX, SKYLINE.height / 2, SKYLINE.z],
    size: [SKYLINE.span + 1, SKYLINE.height + 0.6, 2],
    view: [0.12, 0.24, 1],
  }
}

/**
 * Day numbers along the front edge — the 1st, every 5th and the last, unless
 * the last would crowd the 30th — plus the busiest day's total on its column.
 */
export function skylineLabels(model: SkylineModel): WorldLabel[] {
  const n = model.days.length
  const lastFits = n % 5 >= 2
  const labels = model.days
    .filter((d) => d.day === 1 || d.day % 5 === 0 || (d.day === n && lastFits))
    .map<WorldLabel>((d) => ({
      key: `d-${d.day}`,
      text: String(d.day),
      anchor: [dayX(d.day - 1, n), 0, 2.6],
      station: 0,
      align: 'center',
    }))
  const peak = model.days.reduce<SkylineDay | null>(
    (best, d) => (d.processed + d.pending > (best ? best.processed + best.pending : 0) ? d : best),
    null
  )
  if (peak) {
    labels.push({
      key: 'peak',
      text: `Busiest ${formatCurrency(Math.round(peak.processed + peak.pending))}`,
      anchor: [dayX(peak.day - 1, n), SKYLINE.height + 0.35, SKYLINE.z],
      station: 0,
      align: 'center',
      tone: 'strong',
    })
  }
  return labels
}

export function skylineTip(model: SkylineModel, index: number): WorldTip | null {
  const d = model.days[index]
  if (!d) return null
  const lines = [`Spent: ${formatCurrency(Math.round(d.processed + d.pending))}`]
  if (d.pending > 0 || d.pendingCount > 0) {
    lines.push(`Processed: ${formatCurrency(Math.round(d.processed))}`)
    lines.push(`Pending: ${formatCurrency(Math.round(d.pending))}`)
  }
  lines.push(
    d.count === 0 ? 'No transactions' : `${d.count} transaction${d.count === 1 ? '' : 's'}`
  )
  return {
    anchor: [
      dayX(index, model.days.length),
      dayHeight(model, d.processed + d.pending) + 0.3,
      SKYLINE.z,
    ],
    station: 0,
    title: d.label,
    lines,
  }
}
