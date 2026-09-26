import { Edges } from '@react-three/drei'
import { type ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

import { stationX } from '@/components/world/cameraPath'
import { GrowGroup, InstancedBoxes, type BoxItem } from '@/components/world/primitives'
import type { SceneColors } from '@/components/world/sceneColors'
import { useGrow } from '@/components/world/useGrow'

import {
  INFLOW,
  INFLOW_X,
  inflowHalfWidth,
  inflowHeight,
  inflowX,
  LOOSE,
  looseHeight,
  looseXZ,
  PLAN,
  planHalfWidth,
  planHeight,
  planX,
  YEAR,
  yearHeight,
} from './layout'
import type { InflowModel, LooseBlock, PlanVessel, YearVesselModel } from './stationData'

/**
 * A glass vessel: the rim is the plan, the fill is spend inside it, the
 * spill past the rim is --neg and the ring is where spend should be by
 * today. Heights arrive already scaled. Home's month vessel, reused per
 * category and for the year.
 */
function Vessel({
  radius,
  rim,
  fill,
  spill,
  pace,
  fillColor,
  colors,
  segments = 48,
}: {
  radius: number
  rim: number
  fill: number
  spill: number
  pace: number | null
  fillColor: string
  colors: SceneColors
  segments?: number
}) {
  const inner = radius * 0.92
  return (
    <>
      {rim > 0 && (
        <mesh position-y={rim / 2}>
          <cylinderGeometry args={[radius, radius, rim, segments, 1, true]} />
          <meshStandardMaterial
            color={colors.line}
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
          <Edges color={colors.ink4} threshold={20} />
        </mesh>
      )}
      {fill > 0 && (
        <mesh position-y={fill / 2}>
          <cylinderGeometry args={[inner, inner, fill, segments]} />
          <meshStandardMaterial color={fillColor} flatShading roughness={0.9} />
        </mesh>
      )}
      {spill > 0 && (
        <mesh position-y={fill + spill / 2}>
          <cylinderGeometry args={[inner, inner, spill, segments]} />
          <meshStandardMaterial color={colors.neg} flatShading roughness={0.9} />
        </mesh>
      )}
      {pace !== null && (
        <mesh position-y={pace} rotation-x={Math.PI / 2}>
          <torusGeometry args={[radius + 0.1, radius * 0.045, 8, segments * 2]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
      )}
    </>
  )
}

// ── Station 1 · the year as one large vessel ────────────────────────────────

export function YearStation({
  model,
  colors,
  active,
  instant,
}: {
  model: YearVesselModel
  colors: SceneColors
  active: boolean
  instant: boolean
}) {
  const grow = useGrow(active, model, instant)
  const r = YEAR.radius
  const h = (amount: number) => yearHeight(model, amount)

  return (
    <group position-x={stationX(0)}>
      <mesh position-y={-0.03}>
        <cylinderGeometry args={[r + 0.5, r + 0.5, 0.06, 64]} />
        <meshStandardMaterial color={colors.surface2} roughness={1} />
      </mesh>
      <GrowGroup grow={grow}>
        <Vessel
          radius={r}
          rim={h(model.plan)}
          fill={h(model.fill)}
          spill={h(model.spill)}
          pace={model.pace !== null ? h(model.pace) : null}
          fillColor={colors.ink}
          colors={colors}
          segments={64}
        />
        {/* Where the year lands at this rate: a thin grey ring, like the budget line on Home. */}
        {model.projected !== null && model.plan > 0 && (
          <mesh position-y={h(model.projected)} rotation-x={Math.PI / 2}>
            <torusGeometry args={[r + 0.14, 0.035, 8, 128]} />
            <meshBasicMaterial color={colors.ink4} />
          </mesh>
        )}
      </GrowGroup>
    </group>
  )
}

// ── Station 2 + 3 · the plan's vessels and the loose blocks off its plate ───

export function PlanStation({
  vessels,
  blocks,
  max,
  colors,
  active,
  instant,
  highlight,
  onHover,
  onPick,
}: {
  vessels: PlanVessel[]
  blocks: LooseBlock[]
  /** Shared height scale for vessels and blocks (stationData.planScale). */
  max: number
  colors: SceneColors
  active: boolean
  instant: boolean
  /** Category id lit here and in the panel rows. */
  highlight: string | null
  onHover: (key: string | null) => void
  onPick: (name: string) => void
}) {
  // Re-rise whenever either set changes, e.g. after a budget edit refetches.
  const growKey = useMemo(() => [vessels, blocks], [vessels, blocks])
  const grow = useGrow(active, growKey, instant)
  const n = vessels.length
  const h = (amount: number) => planHeight(max, amount)

  const blockItems = useMemo<BoxItem[]>(
    () =>
      blocks.map((b, i) => {
        const [x, z] = looseXZ(i, blocks.length, n)
        return {
          x,
          z,
          y: 0,
          h: looseHeight(max, b.amount),
          w: LOOSE.size,
          d: LOOSE.size,
          color: b.key === highlight ? colors.accent : colors.ink4,
        }
      }),
    [blocks, n, max, highlight, colors]
  )

  const hover = (key: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(key)
  }
  const pick = (name: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onPick(name)
  }

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(1), -0.001, 0]}>
        <planeGeometry args={[planHalfWidth(n) * 2, PLAN.plateDepth]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <GrowGroup grow={grow}>
        {vessels.map((v, i) => {
          const top = Math.max(h(v.plan), h(v.spent), 0.3)
          return (
            <group key={v.key} position-x={planX(i, n)}>
              <Vessel
                radius={PLAN.radius}
                rim={h(v.plan)}
                fill={h(v.fill)}
                spill={h(v.spill)}
                pace={v.pace !== null ? h(v.pace) : null}
                fillColor={v.key === highlight ? colors.accent : colors.ink}
                colors={colors}
              />
              {/* Invisible hit volume: one target per vessel, whatever it holds. */}
              <mesh
                position-y={top / 2}
                onPointerMove={hover(v.key)}
                onPointerOut={() => onHover(null)}
                onClick={pick(v.name)}
              >
                <cylinderGeometry args={[PLAN.radius + 0.1, PLAN.radius + 0.1, top, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
              </mesh>
            </group>
          )
        })}
      </GrowGroup>
      <InstancedBoxes
        items={blockItems}
        grow={grow}
        onHover={(i) => onHover(i === null ? null : (blocks[i]?.key ?? null))}
        onPick={(i) => blocks[i] && onPick(blocks[i].name)}
      />
    </group>
  )
}

// ── Station 4 · expected income as inflow columns ───────────────────────────

export function InflowStation({
  model,
  colors,
  active,
  instant,
  highlight,
  onHover,
}: {
  model: InflowModel
  colors: SceneColors
  active: boolean
  instant: boolean
  highlight: string | null
  onHover: (key: string | null) => void
}) {
  // Keyed on the figures, not the model: the income rows are rebuilt on
  // every render (useBudgetData), and an object key would re-rise each time.
  const growKey = model.columns.map((c) => `${c.key}:${c.received}:${c.expected}`).join('|')
  const grow = useGrow(active, growKey, instant)
  const n = model.columns.length

  const bodies = useMemo<BoxItem[]>(
    () =>
      model.columns.map((c, i) => ({
        x: inflowX(i, n),
        z: 0,
        y: 0,
        h: inflowHeight(model, c.received),
        w: INFLOW.width,
        d: INFLOW.width,
        color: c.key === highlight ? colors.ink : colors.accent,
      })),
    [model, n, highlight, colors]
  )
  const caps = useMemo<BoxItem[]>(
    () =>
      model.columns.flatMap((c, i) =>
        c.expected !== null && c.expected > 0
          ? [
              {
                x: inflowX(i, n),
                z: 0,
                y: inflowHeight(model, c.expected),
                h: INFLOW.cap,
                w: INFLOW.width + 0.18,
                d: INFLOW.width + 0.18,
                color: colors.line,
              },
            ]
          : []
      ),
    [model, n, colors]
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[INFLOW_X, -0.001, 0]}>
        <planeGeometry args={[inflowHalfWidth(n) * 2, 2.2]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes
        items={bodies}
        grow={grow}
        onHover={(i) => onHover(i === null ? null : (model.columns[i]?.key ?? null))}
      />
      <InstancedBoxes items={caps} grow={grow} />
    </group>
  )
}
