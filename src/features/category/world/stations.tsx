import { useMemo } from 'react'

import { stationX } from '@/components/world/cameraPath'
import { InstancedBoxes, type BoxItem } from '@/components/world/primitives'
import type { SceneColors } from '@/components/world/sceneColors'
import { useGrow } from '@/components/world/useGrow'

import {
  BREAKDOWN,
  breakdownHeight,
  breakdownWidth,
  breakdownX,
  COLUMNS,
  columnHeight,
  columnX,
  DAYS,
  dayHeight,
  daySlotZ,
  daysHalfDepth,
  dayX,
  STATION,
} from './layout'
import type { BreakdownModel, DaysModel, MonthColumn, MonthsModel } from './stationData'

// ── Station 1 · the trend as monthly columns ────────────────────────────────

export function MonthsStation({
  model,
  colors,
  active,
  instant,
  onHover,
  onPick,
}: {
  model: MonthsModel
  colors: SceneColors
  active: boolean
  instant: boolean
  onHover: (index: number | null) => void
  onPick: (column: MonthColumn) => void
}) {
  const grow = useGrow(active, model, instant)
  const n = model.columns.length

  const bodies = useMemo<BoxItem[]>(
    () =>
      model.columns.map((c, i) => ({
        x: columnX(i, n),
        z: 0,
        y: 0,
        h: columnHeight(model, c.amount),
        w: COLUMNS.width,
        d: COLUMNS.width,
        color: c.selected ? colors.accent : c.over ? colors.neg : colors.ink,
      })),
    [model, n, colors]
  )
  const caps = useMemo<BoxItem[]>(
    () =>
      model.columns.flatMap((c, i) =>
        c.budget > 0
          ? [
              {
                x: columnX(i, n),
                z: 0,
                y: columnHeight(model, c.budget),
                h: COLUMNS.cap,
                w: COLUMNS.width + 0.16,
                d: COLUMNS.width + 0.16,
                color: colors.line,
              },
            ]
          : []
      ),
    [model, n, colors]
  )
  const width = Math.max(6, n * COLUMNS.step) + 1
  const median = model.median !== null && model.median > 0 ? model.median : null
  const medianLine = useMemo<BoxItem[]>(
    () =>
      median === null
        ? []
        : [
            {
              x: stationX(STATION.trend),
              // Behind the columns, so it reads as a rule across the row.
              z: -COLUMNS.width / 2 - 0.1,
              y: columnHeight(model, median),
              h: 0.03,
              w: width - 0.6,
              d: 0.03,
              color: colors.ink4,
            },
          ],
    [median, model, width, colors]
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(STATION.trend), -0.001, 0]}>
        <planeGeometry args={[width, 2.2]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes
        items={bodies}
        grow={grow}
        onHover={onHover}
        onPick={(i) => model.columns[i] && onPick(model.columns[i])}
      />
      <InstancedBoxes items={caps} grow={grow} />
      <InstancedBoxes items={medianLine} grow={grow} />
    </group>
  )
}

// ── Station 2 · merchants and tags as ranked towers ─────────────────────────

export function BreakdownStation({
  model,
  colors,
  active,
  instant,
  highlight,
  onHover,
}: {
  model: BreakdownModel
  colors: SceneColors
  active: boolean
  instant: boolean
  highlight: string | null
  onHover: (key: string | null) => void
}) {
  const grow = useGrow(active, model, instant)
  const towers = useMemo(() => [...model.merchants, ...model.tags], [model])
  const items = useMemo<BoxItem[]>(
    () =>
      towers.map((t) => ({
        x: breakdownX(model, t),
        z: 0,
        y: 0,
        h: breakdownHeight(model, t.total),
        w: BREAKDOWN.width,
        d: BREAKDOWN.width,
        color: t.key === highlight ? colors.accent : t.kind === 'tag' ? colors.ink4 : colors.ink,
      })),
    [towers, model, highlight, colors]
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(STATION.breakdown), -0.001, 0]}>
        <planeGeometry args={[breakdownWidth(model) + 1, 2.2]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes
        items={items}
        grow={grow}
        onHover={(i) => onHover(i === null ? null : (towers[i]?.key ?? null))}
      />
    </group>
  )
}

// ── Station 3 · the transactions as a day-of-month field ────────────────────

export function DaysStation({
  model,
  colors,
  active,
  instant,
  highlight,
  onHover,
  onPick,
}: {
  model: DaysModel
  colors: SceneColors
  active: boolean
  instant: boolean
  highlight: string | null
  onHover: (id: string | null) => void
  onPick: (id: string) => void
}) {
  const grow = useGrow(active, model, instant)
  const items = useMemo<BoxItem[]>(
    () =>
      model.blocks.map((b) => ({
        x: dayX(b.day, model.daysInMonth),
        z: daySlotZ(b.slot, model.depth),
        y: 0,
        h: dayHeight(model, b.amount),
        w: DAYS.block,
        d: DAYS.block,
        color: b.id === highlight ? colors.accent : colors.ink,
      })),
    [model, highlight, colors]
  )
  // A faint tile per day, so empty days still read as days.
  const tiles = useMemo<BoxItem[]>(
    () =>
      Array.from({ length: model.daysInMonth }, (_, i) => ({
        x: dayX(i + 1, model.daysInMonth),
        z: 0,
        y: 0,
        h: 0.01,
        w: DAYS.block + 0.08,
        d: daysHalfDepth(model) * 2 - 0.4,
        color: colors.line,
      })),
    [model, colors]
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(STATION.days), -0.001, 0]}>
        <planeGeometry args={[model.daysInMonth * DAYS.step + 0.6, daysHalfDepth(model) * 2]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes items={tiles} grow={grow} opacity={0.35} />
      <InstancedBoxes
        items={items}
        grow={grow}
        onHover={(i) => onHover(i === null ? null : (model.blocks[i]?.id ?? null))}
        onPick={(i) => model.blocks[i] && onPick(model.blocks[i].id)}
      />
    </group>
  )
}
