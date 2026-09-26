/**
 * Where everything sits in the category world, in world units. Pure: the
 * scene reads positions from here and the camera reads each station's frame,
 * so the two can't drift apart.
 */
import { stationX, type StationFrame } from '@/components/world/cameraPath'
import type { WorldLabel, WorldTip } from '@/components/world/types'
import { formatCurrency, formatShortDate } from '@/lib/format'

import type { BreakdownModel, BreakdownTower, DaysModel, MonthsModel } from './stationData'

export const STATION = { trend: 0, breakdown: 1, days: 2 } as const

// ── Station 1 · monthly columns ─────────────────────────────────────────────

export const COLUMNS = { step: 1.3, width: 0.9, height: 4.2, cap: 0.04 }

export function columnX(index: number, count: number): number {
  return stationX(STATION.trend) + (index - (count - 1) / 2) * COLUMNS.step
}

export function columnHeight(model: MonthsModel, amount: number): number {
  return model.max > 0 ? Math.max(0.02, (amount / model.max) * COLUMNS.height) : 0.02
}

export function monthsFrame(count: number): StationFrame {
  return {
    // Widened on the left for the median label.
    center: [stationX(STATION.trend) - 0.8, COLUMNS.height / 2, 0],
    size: [Math.max(6, count * COLUMNS.step) + 3, COLUMNS.height + 0.8, 1.5],
    view: [0.22, 0.42, 1],
  }
}

export function monthsLabels(model: MonthsModel): WorldLabel[] {
  const n = model.columns.length
  const s = STATION.trend
  const labels = model.columns.map<WorldLabel>((c, i) => ({
    key: `m-${c.year}-${c.month}`,
    // The year rides on the first column and on each January.
    text: i === 0 || c.month === 1 ? `${c.label} ${String(c.year).slice(2)}` : c.label,
    anchor: [columnX(i, n), 0, COLUMNS.width / 2 + 0.45],
    station: s,
    align: 'center',
    tone: c.selected ? 'current' : undefined,
  }))
  const sel = model.columns.at(-1)
  if (sel && sel.amount > 0) {
    labels.push({
      key: 'm-sel',
      text: formatCurrency(Math.round(sel.amount)),
      anchor: [columnX(n - 1, n), columnHeight(model, Math.max(sel.amount, sel.budget)) + 0.55, 0],
      station: s,
      align: 'center',
      tone: 'current',
    })
  }
  if (model.median !== null && model.median > 0 && n > 0) {
    labels.push({
      key: 'm-median',
      text: `Median ${formatCurrency(Math.round(model.median))}`,
      anchor: [columnX(0, n) - COLUMNS.step * 0.7, columnHeight(model, model.median), 0],
      station: s,
      align: 'end',
    })
  }
  return labels
}

/** `amountLabel` is "Spent", or "Received" for an income category. */
export function monthTip(
  model: MonthsModel,
  index: number,
  amountLabel = 'Spent'
): WorldTip | null {
  const c = model.columns[index]
  if (!c) return null
  const lines = [`${amountLabel}: ${formatCurrency(Math.round(c.amount))}`]
  if (c.budget > 0) lines.push(`Budget: ${formatCurrency(Math.round(c.budget))}`)
  if (!c.selected) lines.push('Click to open this month')
  return {
    anchor: [
      columnX(index, model.columns.length),
      columnHeight(model, Math.max(c.amount, c.budget)) + 0.3,
      0,
    ],
    station: STATION.trend,
    title: `${c.label} ${c.year}`,
    lines,
  }
}

// ── Station 2 · breakdown towers, merchants then tags along one row ──────────

export const BREAKDOWN = { step: 1.3, width: 0.9, height: 4.2, groupGap: 1.2 }

/** Slots along x: merchants, a gap one tower wide, then tags. */
function breakdownSlots(model: BreakdownModel): number {
  const m = model.merchants.length
  const t = model.tags.length
  return Math.max(1, m + t + (m > 0 && t > 0 ? BREAKDOWN.groupGap : 0))
}

function breakdownSlot(model: BreakdownModel, tower: BreakdownTower): number {
  if (tower.kind === 'merchant') return tower.rank
  const m = model.merchants.length
  return m + (m > 0 ? BREAKDOWN.groupGap : 0) + tower.rank
}

function slotX(slot: number, slots: number): number {
  return stationX(STATION.breakdown) + (slot - (slots - 1) / 2) * BREAKDOWN.step
}

export function breakdownX(model: BreakdownModel, tower: BreakdownTower): number {
  return slotX(breakdownSlot(model, tower), breakdownSlots(model))
}

export function breakdownHeight(model: BreakdownModel, amount: number): number {
  return model.max > 0 ? Math.max(0.02, (amount / model.max) * BREAKDOWN.height) : 0.02
}

export function breakdownWidth(model: BreakdownModel): number {
  return Math.max(6, breakdownSlots(model) * BREAKDOWN.step)
}

export function breakdownFrame(model: BreakdownModel): StationFrame {
  return {
    center: [stationX(STATION.breakdown), BREAKDOWN.height / 2, 0],
    size: [breakdownWidth(model), BREAKDOWN.height + 0.6, 1.5],
    view: [0.22, 0.45, 1],
  }
}

/** A group name under the middle of each group. */
export function breakdownLabels(model: BreakdownModel): WorldLabel[] {
  const slots = breakdownSlots(model)
  const s = STATION.breakdown
  const labels: WorldLabel[] = []
  const group = (key: string, text: string, towers: BreakdownTower[]) => {
    const first = towers[0]
    const last = towers.at(-1)
    if (!first || !last) return
    const mid = (breakdownSlot(model, first) + breakdownSlot(model, last)) / 2
    labels.push({
      key,
      text,
      anchor: [slotX(mid, slots), 0, BREAKDOWN.width / 2 + 0.75],
      station: s,
      align: 'center',
      tone: 'strong',
    })
  }
  group('b-merchants', 'Merchants', model.merchants)
  group('b-tags', 'Tags', model.tags)
  return labels
}

/** Tips don't wrap and sit centred on their block, so a raw UPI string ran
 *  past the stage's left edge. The full text stays in the panel's row. */
export const TIP_TITLE_MAX = 40

export function tipTitle(text: string): string {
  return text.length > TIP_TITLE_MAX ? `${text.slice(0, TIP_TITLE_MAX - 1).trimEnd()}…` : text
}

export function breakdownTip(model: BreakdownModel, key: string | null): WorldTip | null {
  const tower = [...model.merchants, ...model.tags].find((t) => t.key === key)
  if (!tower) return null
  return {
    anchor: [breakdownX(model, tower), breakdownHeight(model, tower.total) + 0.3, 0],
    station: STATION.breakdown,
    title: tipTitle(tower.kind === 'tag' ? `Tag · ${tower.name}` : tower.name),
    lines: [formatCurrency(tower.total), `${tower.count} charge${tower.count === 1 ? '' : 's'}`],
  }
}

// ── Station 3 · the day-of-month field ──────────────────────────────────────

export const DAYS = { step: 0.8, block: 0.58, height: 4, depthStep: 0.8 }

export function dayX(day: number, daysInMonth: number): number {
  return stationX(STATION.days) + (day - 1 - (daysInMonth - 1) / 2) * DAYS.step
}

/** Slot 0 sits on the front edge; later slots step back. */
export function daySlotZ(slot: number, depth: number): number {
  return ((Math.max(1, depth) - 1) / 2 - slot) * DAYS.depthStep
}

export function dayHeight(model: DaysModel, amount: number): number {
  return model.max > 0 ? Math.max(0.03, (amount / model.max) * DAYS.height) : 0.03
}

export function daysHalfDepth(model: DaysModel): number {
  return (Math.max(1, model.depth) * DAYS.depthStep) / 2 + 0.3
}

export function daysFrame(model: DaysModel): StationFrame {
  return {
    center: [stationX(STATION.days), DAYS.height / 2, 0],
    size: [model.daysInMonth * DAYS.step + 1, DAYS.height + 0.6, daysHalfDepth(model) * 2],
    view: [0.25, 0.55, 1],
  }
}

/** Day numbers along the front edge: the 1st, every 5th, and the last. */
export function daysLabels(model: DaysModel): WorldLabel[] {
  const n = model.daysInMonth
  const days = [1, ...Array.from({ length: Math.floor(n / 5) }, (_, i) => (i + 1) * 5)]
  if (n - days[days.length - 1] >= 3) days.push(n)
  return days.map<WorldLabel>((d) => ({
    key: `d-${d}`,
    text: String(d),
    anchor: [dayX(d, n), 0, daysHalfDepth(model) + 0.25],
    station: STATION.days,
    align: 'center',
  }))
}

export function dayTip(model: DaysModel, id: string | null): WorldTip | null {
  const b = model.blocks.find((x) => x.id === id)
  if (!b) return null
  return {
    anchor: [
      dayX(b.day, model.daysInMonth),
      dayHeight(model, b.amount) + 0.3,
      daySlotZ(b.slot, model.depth),
    ],
    station: STATION.days,
    title: tipTitle(b.description),
    lines: [`${formatShortDate(b.date)} · ${formatCurrency(b.amount)}`],
  }
}
