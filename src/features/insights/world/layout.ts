/**
 * Where everything sits in the Insights world, in world units. Pure: the
 * scene reads positions from here and the camera reads each station's frame,
 * so the two can't drift apart.
 *
 * Insights has two shapes — a saved run (verdict, findings, patterns,
 * people) or the prompt workflow (your data, people) — so every helper takes
 * the index of the station it draws rather than assuming a fixed slot.
 */
import { stationX, type StationFrame } from '@/components/world/cameraPath'
import type { WorldLabel, WorldTip } from '@/components/world/types'
import { formatCompact, formatCurrency } from '@/lib/format'

import { formatInsightsValue } from '../lib/insightsFormat'

import {
  monthName,
  type BeamModel,
  type MetricToken,
  type MonthRing,
  type Plate,
  type SlabModel,
} from './stationData'

/** World labels don't wrap; long LLM titles are cut to this many characters. */
const LABEL_CHARS = 24

export function clip(text: string, max = LABEL_CHARS): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

// ── Your data · rings of months ─────────────────────────────────────────────

export const RING = { outer: 3.8, step: 1.05, col: 0.6, height: 3.2, cap: 0.05 }

export function ringRadius(ring: number): number {
  return RING.outer - ring * RING.step
}

/** Top-down position of a month: January at the back, running clockwise. */
export function ringXZ(station: number, calMonth: number, ring: number): [number, number] {
  const theta = ((calMonth - 1) / 12) * Math.PI * 2
  const r = ringRadius(ring)
  return [stationX(station) + r * Math.sin(theta), -r * Math.cos(theta)]
}

export function ringHeight(model: MonthRing, amount: number): number {
  return model.max > 0 ? Math.max(0.02, (amount / model.max) * RING.height) : 0.02
}

export function ringFrame(station: number): StationFrame {
  const span = (RING.outer + 1.1) * 2
  return {
    center: [stationX(station), RING.height / 2, 0],
    size: [span, RING.height, span],
    view: [0.3, 1.7, 1],
  }
}

export function ringLabels(station: number, model: MonthRing): WorldLabel[] {
  if (model.months.length === 0) return []
  const latest = model.months[model.months.length - 1]
  const labels: WorldLabel[] = []
  for (let m = 1; m <= 12; m++) {
    const theta = ((m - 1) / 12) * Math.PI * 2
    // Spokes at the back sit behind their own columns from the camera, so
    // their label rides just above the spoke's tallest column instead.
    const back = Math.cos(theta) > 0.3
    const top = model.months
      .filter((x) => x.calMonth === m)
      .reduce((h, x) => Math.max(h, ringHeight(model, Math.max(x.spent, x.income))), 0)
    const r = RING.outer + 1
    labels.push({
      key: `r-m${m}`,
      text: monthName(m),
      anchor: [stationX(station) + r * Math.sin(theta), back ? top + 0.2 : 0, -r * Math.cos(theta)],
      station,
      align: 'center',
      tone: latest && m === latest.calMonth ? 'current' : undefined,
    })
  }
  return labels
}

export function ringTip(station: number, model: MonthRing, index: number): WorldTip | null {
  const m = model.months[index]
  if (!m) return null
  const [x, z] = ringXZ(station, m.calMonth, m.ring)
  const lines = [`Spent: ${formatCurrency(Math.round(m.spent))}`]
  lines.push(m.income > 0 ? `In: ${formatCurrency(Math.round(m.income))}` : 'No income recorded')
  return {
    anchor: [x, ringHeight(model, Math.max(m.spent, m.income)) + 0.3, z],
    station,
    title: `${monthName(m.calMonth)} ${m.year}`,
    lines,
  }
}

// ── Verdict · metric tokens ─────────────────────────────────────────────────

export const TOKEN = { step: 2.4, base: 1.3, baseH: 0.4, arrow: 0.95 }

export function tokenX(station: number, index: number, count: number): number {
  return stationX(station) + (index - (count - 1) / 2) * TOKEN.step
}

export function tokensFrame(station: number, count: number): StationFrame {
  return {
    center: [stationX(station), 0.9, 0],
    size: [Math.max(6, count * TOKEN.step + 1), 2.6, 2.4],
    view: [0.25, 0.45, 1],
  }
}

export function tokenLabels(station: number, tokens: MetricToken[]): WorldLabel[] {
  const n = tokens.length
  return tokens.flatMap<WorldLabel>((t, i) => [
    {
      key: `m-v${i}`,
      text: formatInsightsValue(t.metric.value, t.metric.unit),
      anchor: [tokenX(station, i, n), TOKEN.baseH + TOKEN.arrow + 0.45, 0],
      station,
      align: 'center',
      tone: 'strong',
    },
    {
      key: `m-l${i}`,
      text: clip(t.label, 22),
      anchor: [tokenX(station, i, n), 0, TOKEN.base / 2 + 0.55],
      station,
      align: 'center',
    },
  ])
}

export function tokenTip(station: number, tokens: MetricToken[], index: number): WorldTip | null {
  const t = tokens[index]
  if (!t) return null
  const dir =
    t.direction === 'up' ? 'Rising' : t.direction === 'down' ? 'Falling' : t.direction ? 'Flat' : ''
  const read =
    t.tone === 'pos'
      ? 'Good news'
      : t.tone === 'neg'
        ? 'Bad news'
        : t.tone === 'neutral'
          ? 'Neutral'
          : ''
  return {
    anchor: [tokenX(station, index, tokens.length), TOKEN.baseH + TOKEN.arrow + 0.8, 0],
    station,
    title: t.label,
    lines: [
      formatInsightsValue(t.metric.value, t.metric.unit),
      [dir, read].filter(Boolean).join(' · '),
    ].filter(Boolean),
  }
}

// ── At stake · slabs ────────────────────────────────────────────────────────

export const SLAB = { step: 1.3, width: 0.9, depth: 1.1, height: 4, floor: 0.06 }

export function slabX(station: number, index: number, count: number): number {
  return stationX(station) + (index - (count - 1) / 2) * SLAB.step
}

export function slabHeight(model: SlabModel, amount: number): number {
  return model.max > 0 && amount > 0
    ? Math.max(SLAB.floor, (amount / model.max) * SLAB.height)
    : SLAB.floor
}

export function slabsFrame(station: number, count: number): StationFrame {
  return {
    center: [stationX(station), SLAB.height / 2, 0],
    size: [Math.max(6, count * SLAB.step + 1), SLAB.height + 0.8, SLAB.depth],
    view: [0.3, 0.48, 1],
  }
}

export function slabLabels(station: number, model: SlabModel): WorldLabel[] {
  const n = model.slabs.length
  return model.slabs.flatMap<WorldLabel>((s, i) =>
    s.amount > 0
      ? [
          {
            key: `s-${i}`,
            text: formatCompact(s.amount),
            anchor: [slabX(station, i, n), slabHeight(model, s.amount) + 0.3, -SLAB.depth / 2],
            station,
            align: 'center',
          },
        ]
      : []
  )
}

const SEVERITY_LABEL = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'For information',
  good: 'Going well',
} as const

export function slabTip(station: number, model: SlabModel, index: number): WorldTip | null {
  const s = model.slabs[index]
  if (!s) return null
  return {
    anchor: [
      slabX(station, index, model.slabs.length),
      slabHeight(model, s.amount) + 0.75,
      -SLAB.depth / 2,
    ],
    station,
    title: clip(s.title, 48),
    lines: [
      s.amount > 0 ? `${formatCurrency(Math.round(s.amount))} a year` : 'No yearly figure',
      SEVERITY_LABEL[s.severity],
    ],
  }
}

// ── Patterns · a stack of plates ────────────────────────────────────────────

export const PLATE = { size: 3, h: 0.28, gap: 0.2 }

export function plateY(index: number, count: number): number {
  return (count - 1 - index) * (PLATE.h + PLATE.gap)
}

export function platesFrame(station: number, count: number): StationFrame {
  const h = Math.max(1, count) * (PLATE.h + PLATE.gap)
  return {
    center: [stationX(station), h / 2, 0],
    size: [PLATE.size + 4, Math.max(2.5, h + 1), PLATE.size],
    view: [0.5, 0.6, 1],
  }
}

export function plateTip(station: number, plates: Plate[], index: number): WorldTip | null {
  const p = plates[index]
  if (!p) return null
  return {
    anchor: [stationX(station), plateY(index, plates.length) + PLATE.h + 0.2, 0],
    station,
    title: clip(p.title, 48),
    lines: [`Pattern ${index + 1} of ${plates.length}`],
  }
}

// ── People · balance beams ──────────────────────────────────────────────────

export const BEAM = {
  length: 6,
  thick: 0.16,
  depth: 0.46,
  row: 1.5,
  pivot: 0.9,
  weight: 0.75,
  height: 2.2,
  /** Radians the heaviest balance tips its beam. */
  maxTilt: 0.2,
}

export function beamZ(index: number, count: number): number {
  return (index - (count - 1) / 2) * BEAM.row
}

export function beamWeightHeight(model: BeamModel, amount: number): number {
  return model.max > 0 && amount > 0 ? Math.max(0.05, (amount / model.max) * BEAM.height) : 0
}

/** Where a point on a beam lands once the beam has tipped, local x along it. */
function onBeam(station: number, z: number, tilt: number, localX: number, lift: number) {
  const a = -tilt * BEAM.maxTilt
  return [
    stationX(station) + localX * Math.cos(a) - lift * Math.sin(a),
    BEAM.pivot + localX * Math.sin(a) + lift * Math.cos(a),
    z,
  ] as [number, number, number]
}

export function beamsFrame(station: number, count: number): StationFrame {
  const depth = Math.max(1, count) * BEAM.row
  return {
    center: [stationX(station) + 0.4, (BEAM.pivot + BEAM.height) / 2, 0],
    size: [BEAM.length + 5, BEAM.pivot + BEAM.height + 0.6, depth + 1],
    view: [0.3, 0.5, 1],
  }
}

export function beamLabels(station: number, model: BeamModel): WorldLabel[] {
  const n = model.beams.length
  if (n === 0) return []
  const half = BEAM.length / 2
  const front = beamZ(n - 1, n) + BEAM.row * 0.7
  const labels: WorldLabel[] = [
    {
      key: 'p-you',
      text: 'You owe them',
      anchor: [stationX(station) - half, 0, front],
      station,
      align: 'center',
    },
    {
      key: 'p-them',
      text: 'They owe you',
      anchor: [stationX(station) + half, 0, front],
      station,
      align: 'center',
    },
  ]
  model.beams.forEach((b, i) => {
    const z = beamZ(i, n)
    labels.push({
      key: `p-n${i}`,
      text: clip(b.person, 20),
      anchor: onBeam(station, z, b.tilt, -half - 0.3, 0),
      station,
      align: 'end',
      tone: 'strong',
    })
    labels.push({
      key: `p-a${i}`,
      text: formatCurrency(Math.round(b.theyOweYou)),
      anchor: onBeam(station, z, b.tilt, half + 0.3, BEAM.thick / 2),
      station,
      align: 'start',
    })
  })
  return labels
}

export function beamTip(station: number, model: BeamModel, index: number): WorldTip | null {
  const b = model.beams[index]
  if (!b) return null
  const half = BEAM.length / 2
  return {
    anchor: onBeam(
      station,
      beamZ(index, model.beams.length),
      b.tilt,
      half - BEAM.weight / 2,
      BEAM.thick / 2 + beamWeightHeight(model, b.theyOweYou) + 0.3
    ),
    station,
    title: b.person,
    lines: [
      `They owe you: ${formatCurrency(Math.round(b.theyOweYou))}`,
      `You owe them: ${formatCurrency(Math.round(b.youOweThem))}`,
    ],
  }
}
