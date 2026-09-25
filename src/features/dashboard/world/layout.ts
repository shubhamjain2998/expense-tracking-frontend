/**
 * Where everything sits in the Home world, in world units. Pure: the scene
 * reads positions from here and the camera reads each station's frame, so
 * the two can't drift apart.
 */
import { stationX, type StationFrame } from '@/components/world/cameraPath'
import type { WorldLabel, WorldTip } from '@/components/world/types'
import { formatCurrency } from '@/lib/format'

import type { TerrainCell, YearTerrain } from '../lib/yearTerrain'

import type { Tower, TrendModel, VesselModel } from './stationData'

export const STATION = { verdict: 0, where: 1, year: 2, trend: 3 } as const

// ── Station 1 · vessel ──────────────────────────────────────────────────────

export const VESSEL = { radius: 1.8, height: 5 }

export function vesselHeight(v: VesselModel, amount: number): number {
  return v.max > 0 ? (amount / v.max) * VESSEL.height : 0
}

export function vesselFrame(): StationFrame {
  return {
    center: [stationX(STATION.verdict), VESSEL.height / 2, 0],
    // Wider than the vessel: its labels sit either side of it.
    size: [11, VESSEL.height + 1, 4],
    view: [0.3, 0.42, 1],
  }
}

export function vesselLabels(v: VesselModel): WorldLabel[] {
  const x = stationX(STATION.verdict)
  const s = STATION.verdict
  const right = x + VESSEL.radius + 0.35
  const left = x - VESSEL.radius - 0.35
  const labels: WorldLabel[] = []
  if (v.income > 0) {
    labels.push({
      key: 'v-in',
      text: `In ${formatCurrency(v.income)}`,
      anchor: [right, vesselHeight(v, v.income), 0],
      station: s,
      align: 'start',
      tone: 'strong',
    })
  }
  if (v.spent > 0) {
    const hOut = vesselHeight(v, v.spent)
    // Nudge down when it would sit on top of the income label.
    const clash = v.income > 0 && Math.abs(hOut - vesselHeight(v, v.income)) < 0.4
    labels.push({
      key: 'v-out',
      text: `Out ${formatCurrency(v.spent)}`,
      anchor: [right, clash ? hOut - 0.45 : hOut, 0],
      station: s,
      align: 'start',
    })
  }
  if (v.budget > 0) {
    labels.push({
      key: 'v-budget',
      text: `Budget ${formatCurrency(v.budget)}`,
      anchor: [left, vesselHeight(v, v.budget), 0],
      station: s,
      align: 'end',
    })
  }
  if (v.pace !== null) {
    const hPace = vesselHeight(v, v.pace)
    if (v.budget <= 0 || Math.abs(hPace - vesselHeight(v, v.budget)) >= 0.4) {
      labels.push({
        key: 'v-pace',
        text: 'Expected by today',
        anchor: [left, hPace, 0],
        station: s,
        align: 'end',
        tone: 'current',
      })
    }
  }
  return labels
}

// ── Station 2 · towers ──────────────────────────────────────────────────────

export const TOWERS = { step: 1.3, width: 0.9, height: 4.2 }

export function towerX(index: number, count: number): number {
  return stationX(STATION.where) + (index - (count - 1) / 2) * TOWERS.step
}

export function towerHeight(max: number, amount: number): number {
  return max > 0 ? Math.max(0.02, (amount / max) * TOWERS.height) : 0.02
}

export function towersMax(towers: Tower[]): number {
  return towers.reduce((m, t) => Math.max(m, t.actual, t.allocated), 0)
}

export function towersFrame(count: number): StationFrame {
  return {
    center: [stationX(STATION.where), TOWERS.height / 2, 0],
    size: [Math.max(6, count * TOWERS.step), TOWERS.height + 0.6, 1.5],
    view: [0.22, 0.5, 1],
  }
}

export function towerTip(towers: Tower[], index: number): WorldTip | null {
  const t = towers[index]
  if (!t) return null
  const max = towersMax(towers)
  const lines = [`Spent: ${formatCurrency(Math.round(t.actual))}`]
  if (t.allocated > 0) {
    lines.push(`${Math.round((t.actual / t.allocated) * 100)}% of ${formatCurrency(t.allocated)}`)
  } else {
    lines.push('No budget')
  }
  return {
    anchor: [
      towerX(index, towers.length),
      towerHeight(max, Math.max(t.actual, t.allocated)) + 0.3,
      0,
    ],
    station: STATION.where,
    title: t.category,
    lines,
  }
}

// ── Station 3 · the year terrain ────────────────────────────────────────────

export const TERRAIN = { cell: 0.78, step: 1.1, height: 3.2, planCap: 0.035 }

export function terrainCellXZ(terrain: YearTerrain, row: number, col: number): [number, number] {
  return [
    stationX(STATION.year) + (col - 5.5) * TERRAIN.step,
    (row - (terrain.rows.length - 1) / 2) * TERRAIN.step,
  ]
}

export function terrainHeight(terrain: YearTerrain, amount: number): number {
  return terrain.max > 0 ? Math.max(0.02, (amount / terrain.max) * TERRAIN.height) : 0.02
}

export function terrainHalf(terrain: YearTerrain) {
  return {
    halfWidth: 5.5 * TERRAIN.step + TERRAIN.step / 2,
    halfDepth: ((Math.max(1, terrain.rows.length) - 1) / 2) * TERRAIN.step + TERRAIN.step / 2,
  }
}

export function terrainFrame(terrain: YearTerrain): StationFrame {
  const { halfWidth, halfDepth } = terrainHalf(terrain)
  return {
    // Shifted left and widened for the category labels down the left edge.
    center: [stationX(STATION.year) - 1.2, TERRAIN.height / 2, 0],
    size: [halfWidth * 2 + 2.4, TERRAIN.height, halfDepth * 2 + 0.8],
    view: [3, 9, 14],
  }
}

export function terrainLabels(terrain: YearTerrain): WorldLabel[] {
  const { halfWidth, halfDepth } = terrainHalf(terrain)
  const s = STATION.year
  return [
    ...terrain.months.map<WorldLabel>((m, col) => ({
      key: `y-m${m.periodMonth}`,
      text: m.label,
      anchor: [terrainCellXZ(terrain, 0, col)[0], 0, halfDepth + 0.35],
      station: s,
      align: 'center',
      tone: col === terrain.currentCol ? 'current' : undefined,
    })),
    ...terrain.rows.map<WorldLabel>((r, row) => ({
      key: `y-r${r.category}`,
      text: r.category,
      anchor: [stationX(s) - halfWidth - 0.2, 0, terrainCellXZ(terrain, row, 0)[1]],
      station: s,
      align: 'end',
    })),
  ]
}

// ── Station 4 · trend ribbons ───────────────────────────────────────────────

export const RIBBON = { step: 1.2, height: 4, depth: 0.5, gap: 0.9 }

export function ribbonX(index: number, count: number): number {
  return stationX(STATION.trend) + (index - (count - 1) / 2) * RIBBON.step
}

export function ribbonHeight(trend: TrendModel, amount: number): number {
  return trend.max > 0 ? (amount / trend.max) * RIBBON.height : 0
}

export function trendFrame(count: number): StationFrame {
  return {
    center: [stationX(STATION.trend), RIBBON.height / 2, 0],
    size: [Math.max(6, count * RIBBON.step) + 2, RIBBON.height + 0.8, RIBBON.gap * 2 + 1],
    view: [-0.3, 0.38, 1],
  }
}

function monthOf(key: string): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return names[Number(key.split('-')[1]) - 1] ?? key
}

export function trendLabels(trend: TrendModel): WorldLabel[] {
  const n = trend.points.length
  const s = STATION.trend
  const labels = trend.points.map<WorldLabel>((p, i) => ({
    key: `t-${p.key}`,
    text: monthOf(p.key),
    anchor: [ribbonX(i, n), 0, RIBBON.gap + RIBBON.depth + 0.3],
    station: s,
    align: 'center',
    tone: i === n - 1 ? 'current' : undefined,
  }))
  if (trend.avgExpense !== null && n > 0) {
    labels.push({
      key: 't-avg',
      text: `Average out ${formatCurrency(Math.round(trend.avgExpense))}`,
      anchor: [
        ribbonX(0, n) - RIBBON.step * 0.8,
        ribbonHeight(trend, trend.avgExpense),
        RIBBON.gap,
      ],
      station: s,
      align: 'end',
    })
  }
  return labels
}

export function trendTip(trend: TrendModel, index: number): WorldTip | null {
  const p = trend.points[index]
  if (!p) return null
  const [year] = p.key.split('-')
  return {
    anchor: [
      ribbonX(index, trend.points.length),
      ribbonHeight(trend, Math.max(p.income, p.expense)) + 0.35,
      0,
    ],
    station: STATION.trend,
    title: `${monthOf(p.key)} ${year}`,
    lines: [
      `In: ${formatCurrency(Math.round(p.income))}`,
      `Out: ${formatCurrency(Math.round(p.expense))}`,
    ],
  }
}

export function terrainTip(terrain: YearTerrain, cell: TerrainCell): WorldTip {
  const [x, z] = terrainCellXZ(terrain, cell.row, cell.col)
  const lines = [
    `${cell.kind === 'projected' ? 'At this pace' : 'Spent'}: ${formatCurrency(Math.round(cell.amount))}`,
  ]
  if (cell.plan > 0) lines.push(`Plan: ${formatCurrency(cell.plan)}`)
  if (cell.paceAt !== null)
    lines.push(`Expected by today: ${formatCurrency(Math.round(cell.paceAt))}`)
  return {
    anchor: [x, terrainHeight(terrain, Math.max(cell.amount, cell.plan)) + 0.3, z],
    station: STATION.year,
    title: `${cell.category} · ${terrain.months[cell.col]?.label ?? ''}${cell.kind === 'projected' ? ' · projected' : ''}`,
    lines,
  }
}
