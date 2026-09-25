import { Edges } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { TerrainCell, YearTerrain } from '../lib/yearTerrain'

import { stationX } from './cameraPath'
import {
  RIBBON,
  ribbonHeight,
  ribbonX,
  STATION,
  TERRAIN,
  terrainCellXZ,
  terrainHalf,
  terrainHeight,
  TOWERS,
  towerHeight,
  towersMax,
  towerX,
  VESSEL,
  vesselHeight,
} from './layout'
import type { SceneColors } from './sceneColors'
import type { Tower, TrendModel, VesselModel } from './stationData'

const GROW_SECONDS = 0.8

/**
 * A 0→1 ref that rises once `run` turns true, and again whenever `key`
 * changes while it is true. Asks for frames only while rising.
 */
function useGrow(run: boolean, key: unknown, instant: boolean) {
  const grow = useRef(instant ? 1 : 0)
  const invalidate = useThree((s) => s.invalidate)
  const lastKey = useRef<unknown>(undefined)
  useLayoutEffect(() => {
    if (instant) {
      grow.current = 1
    } else if (run && lastKey.current !== key) {
      lastKey.current = key
      grow.current = 0
      invalidate()
    }
  }, [run, key, instant, invalidate])
  useFrame((state, dt) => {
    if (grow.current >= 1 || (!run && !instant)) return
    grow.current = Math.min(1, grow.current + Math.min(dt, 1 / 30) / GROW_SECONDS)
    state.invalidate()
  })
  return grow
}

/** Scales a group's height by a grow ref, so everything in it rises together. */
function GrowGroup({
  grow,
  children,
  ...props
}: { grow: React.RefObject<number>; children: React.ReactNode } & React.ComponentProps<'group'>) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.scale.y = Math.max(0.001, grow.current ?? 1)
  })
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}

export interface BoxItem {
  x: number
  z: number
  /** Base height and box height, before the rise-in scales them. */
  y: number
  h: number
  w: number
  d: number
  color: string
}

const unitBox = new THREE.BoxGeometry(1, 1, 1)
const matrix = new THREE.Matrix4()
const tint = new THREE.Color()

/** One InstancedMesh for a set of boxes: one draw call however many there are. */
function InstancedBoxes({
  items,
  grow,
  opacity = 1,
  onHover,
  onPick,
}: {
  items: BoxItem[]
  grow: React.RefObject<number>
  opacity?: number
  onHover?: (index: number | null) => void
  onPick?: (index: number) => void
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const lastGrow = useRef(-1)
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((b, i) => mesh.setColorAt(i, tint.set(b.color)))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    lastGrow.current = -1
    invalidate()
  }, [items, invalidate])

  useFrame(() => {
    const mesh = ref.current
    const g = grow.current ?? 1
    if (!mesh || g === lastGrow.current) return
    lastGrow.current = g
    items.forEach((b, i) => {
      const h = Math.max(0.001, b.h * g)
      matrix.makeScale(b.w, h, b.d).setPosition(b.x, b.y * g + h / 2, b.z)
      mesh.setMatrixAt(i, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  })

  if (items.length === 0) return null
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[unitBox, undefined, items.length]}
      onPointerMove={
        onHover
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              onHover(e.instanceId ?? null)
            }
          : undefined
      }
      onPointerOut={onHover ? () => onHover(null) : undefined}
      onClick={
        onPick
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation()
              if (e.instanceId !== undefined) onPick(e.instanceId)
            }
          : undefined
      }
    >
      <meshStandardMaterial
        flatShading
        roughness={0.9}
        metalness={0}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity === 1}
      />
    </instancedMesh>
  )
}

// ── Station 1 · the month as a vessel ───────────────────────────────────────

export function VesselStation({
  model,
  colors,
  active,
  instant,
}: {
  model: VesselModel
  colors: SceneColors
  active: boolean
  instant: boolean
}) {
  const grow = useGrow(active, model, instant)
  const x = stationX(STATION.verdict)
  const r = VESSEL.radius
  const h = (amount: number) => vesselHeight(model, amount)
  const rim = model.income > 0 ? h(model.income) : h(model.spent)
  const inside = h(model.inside)
  const overflow = h(model.overflow)
  const saved = h(model.saved)

  return (
    <group position-x={x}>
      {/* base plate */}
      <mesh position-y={-0.03}>
        <cylinderGeometry args={[r + 0.5, r + 0.5, 0.06, 64]} />
        <meshStandardMaterial color={colors.surface2} roughness={1} />
      </mesh>
      <GrowGroup grow={grow}>
        {/* the glass: income is the rim */}
        {rim > 0 && (
          <mesh position-y={rim / 2}>
            <cylinderGeometry args={[r, r, rim, 64, 1, true]} />
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
        {/* spend inside income */}
        {inside > 0 && (
          <mesh position-y={inside / 2}>
            <cylinderGeometry args={[r * 0.94, r * 0.94, inside, 64]} />
            <meshStandardMaterial color={colors.ink} flatShading roughness={0.9} />
          </mesh>
        )}
        {/* spend past income spills over the rim */}
        {overflow > 0 && (
          <mesh position-y={inside + overflow / 2}>
            <cylinderGeometry args={[r * 0.94, r * 0.94, overflow, 64]} />
            <meshStandardMaterial color={colors.neg} flatShading roughness={0.9} />
          </mesh>
        )}
        {/* what's left of income */}
        {saved > 0 && (
          <mesh position-y={inside + saved / 2}>
            <cylinderGeometry args={[r * 0.94, r * 0.94, saved, 64]} />
            <meshStandardMaterial
              color={colors.pos}
              transparent
              opacity={0.28}
              depthWrite={false}
            />
          </mesh>
        )}
        {model.budget > 0 && (
          <mesh position-y={h(model.budget)} rotation-x={Math.PI / 2}>
            <torusGeometry args={[r + 0.14, 0.035, 8, 96]} />
            <meshBasicMaterial color={colors.ink4} />
          </mesh>
        )}
        {model.pace !== null && (
          <mesh position-y={h(model.pace)} rotation-x={Math.PI / 2}>
            <torusGeometry args={[r + 0.14, 0.05, 8, 96]} />
            <meshBasicMaterial color={colors.accent} />
          </mesh>
        )}
      </GrowGroup>
    </group>
  )
}

// ── Station 2 · where it went, as towers ────────────────────────────────────

export function TowersStation({
  towers,
  colors,
  active,
  instant,
  highlight,
  onHover,
  onPick,
}: {
  towers: Tower[]
  colors: SceneColors
  active: boolean
  instant: boolean
  highlight: string | null
  onHover: (index: number | null) => void
  onPick: (tower: Tower) => void
}) {
  const grow = useGrow(active, towers, instant)
  const max = towersMax(towers)
  const n = towers.length

  const bodies = useMemo<BoxItem[]>(
    () =>
      towers.map((t, i) => ({
        x: towerX(i, n),
        z: 0,
        y: 0,
        h: towerHeight(max, t.actual),
        w: TOWERS.width,
        d: TOWERS.width,
        color: t.category === highlight ? colors.accent : t.over ? colors.neg : colors.ink,
      })),
    [towers, n, max, highlight, colors]
  )
  const caps = useMemo<BoxItem[]>(
    () =>
      towers.flatMap((t, i) => {
        const out: BoxItem[] = []
        const base = { x: towerX(i, n), z: 0, w: TOWERS.width + 0.16, d: TOWERS.width + 0.16 }
        if (t.allocated > 0) {
          out.push({ ...base, y: towerHeight(max, t.allocated), h: 0.04, color: colors.line })
        }
        if (t.paceAt !== null) {
          // A tick on the front face, like Where it went's pace mark — not a
          // second slab, which would hide the budget cap in a finished month.
          out.push({
            ...base,
            z: TOWERS.width / 2 + 0.05,
            d: 0.1,
            y: towerHeight(max, t.paceAt),
            h: 0.07,
            color: colors.accent,
          })
        }
        return out
      }),
    [towers, n, max, colors]
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(STATION.where), -0.001, 0]}>
        <planeGeometry args={[Math.max(6, n * TOWERS.step) + 1, 2.2]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes
        items={bodies}
        grow={grow}
        onHover={onHover}
        onPick={(i) => towers[i] && onPick(towers[i])}
      />
      <InstancedBoxes items={caps} grow={grow} />
    </group>
  )
}

// ── Station 3 · the year terrain ────────────────────────────────────────────

export function TerrainStation({
  terrain,
  colors,
  active,
  instant,
  onHover,
  onPick,
}: {
  terrain: YearTerrain
  colors: SceneColors
  active: boolean
  instant: boolean
  onHover: (cell: TerrainCell | null) => void
  onPick: (cell: TerrainCell) => void
}) {
  const grow = useGrow(active, terrain, instant)

  const { solid, ghost, caps } = useMemo(() => {
    const box = (c: TerrainCell, y: number, h: number, color: string, pad = 0): BoxItem => {
      const [x, z] = terrainCellXZ(terrain, c.row, c.col)
      return { x, z, y, h, w: TERRAIN.cell + pad, d: TERRAIN.cell + pad, color }
    }
    const withSpend = terrain.cells.filter((c) => c.amount > 0)
    const solidCells = withSpend.filter((c) => c.kind !== 'projected')
    const ghostCells = withSpend.filter((c) => c.kind === 'projected')
    return {
      solid: {
        cells: solidCells,
        items: solidCells.map((c) =>
          box(c, 0, terrainHeight(terrain, c.amount), c.over ? colors.neg : colors.ink)
        ),
      },
      ghost: {
        cells: ghostCells,
        items: ghostCells.map((c) => box(c, 0, terrainHeight(terrain, c.amount), colors.ink4)),
      },
      caps: [
        ...terrain.cells
          .filter((c) => c.plan > 0)
          .map((c) => box(c, terrainHeight(terrain, c.plan), TERRAIN.planCap, colors.line)),
        ...terrain.cells
          .filter((c) => c.paceAt !== null)
          .map((c) => ({
            // Front-face tick, as on the towers.
            ...box(c, terrainHeight(terrain, c.paceAt ?? 0), TERRAIN.planCap * 2, colors.accent),
            z: terrainCellXZ(terrain, c.row, c.col)[1] + TERRAIN.cell / 2 + 0.04,
            d: 0.08,
          })),
      ],
    }
  }, [terrain, colors])

  const { halfWidth, halfDepth } = terrainHalf(terrain)
  const pick = (cell: TerrainCell | undefined) => {
    if (cell?.linkable) onPick(cell)
  }

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(STATION.year), -0.001, 0]}>
        <planeGeometry args={[halfWidth * 2, halfDepth * 2]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes
        items={solid.items}
        grow={grow}
        onHover={(i) => onHover(i === null ? null : (solid.cells[i] ?? null))}
        onPick={(i) => pick(solid.cells[i])}
      />
      <InstancedBoxes
        items={ghost.items}
        grow={grow}
        opacity={0.35}
        onHover={(i) => onHover(i === null ? null : (ghost.cells[i] ?? null))}
        onPick={(i) => pick(ghost.cells[i])}
      />
      <InstancedBoxes items={caps} grow={grow} />
    </group>
  )
}

// ── Station 4 · the trend as two ribbons ────────────────────────────────────

/** Area under a series, extruded into a slab one ribbon deep. */
function ribbonGeometry(heights: number[], count: number): THREE.ExtrudeGeometry | null {
  if (heights.length < 2) return null
  const shape = new THREE.Shape()
  const x0 = ribbonX(0, count) - stationX(STATION.trend)
  shape.moveTo(x0, 0)
  heights.forEach((h, i) => shape.lineTo(ribbonX(i, count) - stationX(STATION.trend), h))
  shape.lineTo(ribbonX(count - 1, count) - stationX(STATION.trend), 0)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: RIBBON.depth, bevelEnabled: false })
}

export function TrendStation({
  trend,
  colors,
  active,
  instant,
  onHover,
}: {
  trend: TrendModel
  colors: SceneColors
  active: boolean
  instant: boolean
  onHover: (index: number | null) => void
}) {
  const grow = useGrow(active, trend, instant)
  const n = trend.points.length
  const outGeo = useMemo(
    () =>
      ribbonGeometry(
        trend.points.map((p) => ribbonHeight(trend, p.expense)),
        n
      ),
    [trend, n]
  )
  const inGeo = useMemo(
    () =>
      ribbonGeometry(
        trend.points.map((p) => ribbonHeight(trend, p.income)),
        n
      ),
    [trend, n]
  )
  useLayoutEffect(
    () => () => {
      outGeo?.dispose()
      inGeo?.dispose()
    },
    [outGeo, inGeo]
  )

  const x = stationX(STATION.trend)
  const toIndex = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const i = Math.round((e.point.x - x) / RIBBON.step + (n - 1) / 2)
    onHover(Math.min(n - 1, Math.max(0, i)))
  }
  const width = Math.max(6, n * RIBBON.step) + 1

  return (
    <group position-x={x}>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
        <planeGeometry args={[width, RIBBON.gap * 2 + RIBBON.depth * 2 + 0.6]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <GrowGroup grow={grow}>
        {inGeo && (
          <mesh
            geometry={inGeo}
            position-z={-RIBBON.gap}
            onPointerMove={toIndex}
            onPointerOut={() => onHover(null)}
          >
            <meshStandardMaterial color={colors.accent} flatShading roughness={0.9} />
          </mesh>
        )}
        {outGeo && (
          <mesh
            geometry={outGeo}
            position-z={RIBBON.gap - RIBBON.depth}
            onPointerMove={toIndex}
            onPointerOut={() => onHover(null)}
          >
            <meshStandardMaterial color={colors.ink} flatShading roughness={0.9} />
          </mesh>
        )}
        {trend.avgExpense !== null && n > 1 && (
          <mesh position={[0, ribbonHeight(trend, trend.avgExpense), RIBBON.gap]}>
            <boxGeometry args={[width - 0.6, 0.03, 0.03]} />
            <meshBasicMaterial color={colors.ink4} />
          </mesh>
        )}
      </GrowGroup>
    </group>
  )
}
