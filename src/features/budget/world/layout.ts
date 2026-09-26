/**
 * Where everything sits in the Budget world, in world units. Pure: the scene
 * reads positions from here and the camera reads each station's frame, so
 * the two can't drift apart.
 *
 * Station order follows the page: the year, the plan, outside the plan (only
 * when there is anything outside it) and expected income. Positions don't
 * move with that order: the loose blocks always sit just off the plan's
 * ground plate, and only the camera's route changes.
 */
import { stationX, type StationFrame } from '@/components/world/cameraPath'
import type { WorldLabel, WorldTip } from '@/components/world/types'
import { formatCurrency } from '@/lib/format'

import type {
  InflowModel,
  LooseBlock,
  PeriodView,
  PlanVessel,
  YearVesselModel,
} from './stationData'

export interface BudgetStations {
  year: number
  plan: number
  /** null when every spending category has a plan line and the section is hidden. */
  outside: number | null
  income: number
}

export function budgetStations(hasOutside: boolean): BudgetStations {
  return { year: 0, plan: 1, outside: hasOutside ? 2 : null, income: hasOutside ? 3 : 2 }
}

// ── Station 1 · the year vessel ─────────────────────────────────────────────

export const YEAR = { radius: 2.2, height: 5 }

export function yearHeight(v: YearVesselModel, amount: number): number {
  return v.max > 0 ? (amount / v.max) * YEAR.height : 0
}

export function yearFrame(): StationFrame {
  return {
    center: [stationX(0), YEAR.height / 2, 0],
    // Wider than the vessel: its labels sit either side of it.
    size: [13, YEAR.height + 1, 5],
    view: [0.3, 0.42, 1],
  }
}

/** Keeps two labels on one side from sitting on top of each other. */
function spread(hs: number[], gap = 0.45): number[] {
  const order = hs.map((h, i) => [h, i] as const).sort((a, b) => a[0] - b[0])
  const out = [...hs]
  let last = -Infinity
  for (const [h, i] of order) {
    const y = Math.max(h, last + gap)
    out[i] = y
    last = y
  }
  return out
}

export function yearLabels(v: YearVesselModel, station: number): WorldLabel[] {
  const x = stationX(0)
  const right = x + YEAR.radius + 0.4
  const left = x - YEAR.radius - 0.4
  const labels: WorldLabel[] = []

  const rightItems: Omit<WorldLabel, 'anchor'>[] = []
  const rightHs: number[] = []
  if (v.spent > 0 || v.plan > 0) {
    rightItems.push({
      key: 'y-spent',
      text: `Spent ${formatCurrency(Math.round(v.spent))}`,
      station,
      align: 'start',
      tone: 'strong',
    })
    rightHs.push(yearHeight(v, v.spent))
  }
  if (v.projected !== null && v.plan > 0) {
    rightItems.push({
      key: 'y-proj',
      text: `At this rate ${formatCurrency(Math.round(v.projected))}`,
      station,
      align: 'start',
    })
    rightHs.push(yearHeight(v, v.projected))
  }
  spread(rightHs).forEach((y, i) => labels.push({ ...rightItems[i], anchor: [right, y, 0] }))

  const leftItems: Omit<WorldLabel, 'anchor'>[] = []
  const leftHs: number[] = []
  if (v.plan > 0) {
    leftItems.push({
      key: 'y-plan',
      text: `Plan ${formatCurrency(Math.round(v.plan))}`,
      station,
      align: 'end',
    })
    leftHs.push(yearHeight(v, v.plan))
  }
  if (v.pace !== null) {
    leftItems.push({
      key: 'y-pace',
      text: `Expected by now ${formatCurrency(Math.round(v.pace))}`,
      station,
      align: 'end',
      tone: 'current',
    })
    leftHs.push(yearHeight(v, v.pace))
  }
  spread(leftHs).forEach((y, i) => labels.push({ ...leftItems[i], anchor: [left, y, 0] }))
  return labels
}

// ── Station 2 · the plan's vessels ──────────────────────────────────────────

export const PLAN = { step: 1.5, radius: 0.55, height: 7, plateDepth: 2.4 }

export function planX(index: number, count: number): number {
  return stationX(1) + (index - (count - 1) / 2) * PLAN.step
}

export function planHalfWidth(count: number): number {
  return Math.max(6, count * PLAN.step) / 2 + 0.4
}

export function planHeight(max: number, amount: number): number {
  return max > 0 ? (amount / max) * PLAN.height : 0
}

export function planFrame(count: number): StationFrame {
  return {
    center: [stationX(1), PLAN.height / 2, 0],
    size: [planHalfWidth(count) * 2, PLAN.height + 0.6, PLAN.plateDepth],
    view: [0.22, 0.5, 1],
  }
}

function pctOf(amount: number, of: number): string {
  return `${Math.round((amount / of) * 100)}% of ${formatCurrency(Math.round(of))}`
}

export function vesselTip(
  vessels: PlanVessel[],
  index: number,
  max: number,
  view: PeriodView,
  station: number
): WorldTip | null {
  const v = vessels[index]
  if (!v) return null
  const lines = [
    `Spent${view === 'annual' ? ' this year' : ''}: ${formatCurrency(Math.round(v.spent))}`,
  ]
  lines.push(v.plan > 0 ? pctOf(v.spent, v.plan) : 'No plan')
  if (v.pace !== null) lines.push(`Expected by today: ${formatCurrency(Math.round(v.pace))}`)
  return {
    anchor: [planX(index, vessels.length), planHeight(max, Math.max(v.plan, v.spent)) + 0.35, 0],
    station,
    title: v.name,
    lines,
  }
}

// ── Station 3 · outside the plan, loose blocks off the plate ────────────────

export const LOOSE = { step: 1.55, size: 0.9, cols: 3, gap: 1.6, minH: 0.05 }

// Fixed offsets so the blocks look set down by hand rather than gridded.
const JITTER: [number, number][] = [
  [0.12, -0.18],
  [-0.16, 0.1],
  [0.08, 0.2],
  [-0.1, -0.08],
  [0.2, 0.06],
  [-0.06, -0.22],
  [0.14, 0.16],
]

function looseRows(count: number): number {
  return Math.max(1, Math.ceil(count / LOOSE.cols))
}

export function looseXZ(index: number, count: number, planCount: number): [number, number] {
  const col = index % LOOSE.cols
  const row = Math.floor(index / LOOSE.cols)
  const [jx, jz] = JITTER[index % JITTER.length]
  const x0 = stationX(1) + planHalfWidth(planCount) + LOOSE.gap + LOOSE.size / 2
  return [x0 + col * LOOSE.step + jx, (row - (looseRows(count) - 1) / 2) * LOOSE.step + jz]
}

export function looseHeight(max: number, amount: number): number {
  return Math.max(LOOSE.minH, planHeight(max, amount))
}

export function looseFrame(blocks: LooseBlock[], planCount: number, max: number): StationFrame {
  const n = blocks.length
  const cols = Math.min(LOOSE.cols, Math.max(1, n))
  const tallest = blocks.reduce((m, b) => Math.max(m, looseHeight(max, b.amount)), 0)
  const plateEdge = stationX(1) + planHalfWidth(planCount)
  const right = looseXZ(cols - 1, n, planCount)[0] + LOOSE.size
  // Takes in the end of the plan's plate, so the blocks read as off it.
  const left = plateEdge - 0.8
  const h = Math.max(2, tallest + 1)
  return {
    center: [(left + right) / 2, h / 2, 0],
    size: [right - left, h, looseRows(n) * LOOSE.step + 1.4],
    view: [0.5, 0.75, 1],
  }
}

export function looseLabels(
  blocks: LooseBlock[],
  planCount: number,
  station: number
): WorldLabel[] {
  return blocks.map((b, i) => {
    const [x, z] = looseXZ(i, blocks.length, planCount)
    return {
      key: `o-${b.key}`,
      text: b.name,
      anchor: [x, 0, z + LOOSE.size / 2 + 0.3],
      station,
      align: 'center',
    }
  })
}

export function looseTip(
  blocks: LooseBlock[],
  index: number,
  planCount: number,
  max: number,
  view: PeriodView,
  station: number
): WorldTip | null {
  const b = blocks[index]
  if (!b) return null
  const [x, z] = looseXZ(index, blocks.length, planCount)
  return {
    anchor: [x, looseHeight(max, b.amount) + 0.3, z],
    station,
    title: b.name,
    lines: [
      `${formatCurrency(Math.round(b.amount))} ${view === 'annual' ? 'this year' : 'this month'}`,
      `${b.txnCount} transaction${b.txnCount === 1 ? '' : 's'} · no budget line`,
    ],
  }
}

// ── Station 4 · expected income, inflow columns ─────────────────────────────

export const INFLOW = { step: 1.6, width: 0.9, height: 4, cap: 0.05 }
/** Fixed spot along the path, past the plan and its loose blocks. */
export const INFLOW_X = stationX(3)

export function inflowX(index: number, count: number): number {
  return INFLOW_X + (index - (count - 1) / 2) * INFLOW.step
}

export function inflowHeight(model: InflowModel, amount: number): number {
  return model.max > 0 ? Math.max(0.02, (amount / model.max) * INFLOW.height) : 0.02
}

export function inflowHalfWidth(count: number): number {
  return Math.max(5, count * INFLOW.step) / 2 + 0.4
}

export function inflowFrame(count: number): StationFrame {
  // Nothing to stand up: frame the bare plate and its label, not empty air.
  if (count === 0) {
    return {
      center: [INFLOW_X, 0.5, 0],
      size: [inflowHalfWidth(0) * 2, 1, 2.2],
      view: [-0.3, 0.42, 1],
    }
  }
  return {
    center: [INFLOW_X, INFLOW.height / 2, 0],
    size: [inflowHalfWidth(count) * 2, INFLOW.height + 0.8, 2.2],
    view: [-0.3, 0.42, 1],
  }
}

export function inflowLabels(model: InflowModel, station: number): WorldLabel[] {
  const n = model.columns.length
  if (n === 0) {
    return [
      {
        key: 'i-none',
        text: 'No income categories yet',
        anchor: [INFLOW_X, 0.2, 0],
        station,
        align: 'center',
      },
    ]
  }
  return model.columns.map((c, i) => ({
    key: `i-${c.key}`,
    text: c.name,
    anchor: [inflowX(i, n), 0, INFLOW.width / 2 + 0.35],
    station,
    align: 'center',
  }))
}

export function inflowTip(model: InflowModel, index: number, station: number): WorldTip | null {
  const c = model.columns[index]
  if (!c) return null
  const lines = [`Received: ${formatCurrency(Math.round(c.received))}`]
  lines.push(
    c.expected !== null
      ? `Expected: ${formatCurrency(Math.round(c.expected))} / month`
      : 'No plan line'
  )
  return {
    anchor: [
      inflowX(index, model.columns.length),
      inflowHeight(model, Math.max(c.received, c.expected ?? 0)) + 0.3,
      0,
    ],
    station,
    title: c.name,
    lines,
  }
}
