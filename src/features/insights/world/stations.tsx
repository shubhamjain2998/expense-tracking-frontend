import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type * as THREE from 'three'

import { stationX } from '@/components/world/cameraPath'
import { GrowGroup, InstancedBoxes, type BoxItem } from '@/components/world/primitives'
import type { SceneColors } from '@/components/world/sceneColors'
import { useGrow } from '@/components/world/useGrow'

import {
  BEAM,
  beamWeightHeight,
  beamZ,
  PLATE,
  plateY,
  RING,
  ringHeight,
  ringXZ,
  SLAB,
  slabHeight,
  slabX,
  TOKEN,
  tokenX,
} from './layout'
import type {
  BeamModel,
  MetricToken,
  MonthRing,
  Plate,
  SlabModel,
  SlabTone,
  TokenTone,
} from './stationData'

interface StationBase {
  station: number
  colors: SceneColors
  active: boolean
  instant: boolean
}

// ── Your data · rings of months ─────────────────────────────────────────────

export function RingStation({
  station,
  model,
  colors,
  active,
  instant,
  onHover,
}: StationBase & { model: MonthRing; onHover: (index: number | null) => void }) {
  const grow = useGrow(active, model, instant)

  const { cols, caps } = useMemo(() => {
    const at = (calMonth: number, ring: number) => ringXZ(station, calMonth, ring)
    return {
      cols: model.months.map<BoxItem>((m) => {
        const [x, z] = at(m.calMonth, m.ring)
        return {
          x,
          z,
          y: 0,
          h: ringHeight(model, m.spent),
          w: RING.col,
          d: RING.col,
          color: m.over ? colors.neg : m.ring === 0 ? colors.ink : colors.ink4,
        }
      }),
      caps: model.months
        .filter((m) => m.income > 0)
        .map<BoxItem>((m) => {
          const [x, z] = at(m.calMonth, m.ring)
          return {
            x,
            z,
            y: ringHeight(model, m.income),
            h: RING.cap,
            w: RING.col + 0.08,
            d: RING.col + 0.08,
            color: colors.accent,
          }
        }),
    }
  }, [model, station, colors])

  return (
    <group>
      <mesh position={[stationX(station), -0.03, 0]}>
        <cylinderGeometry args={[RING.outer + 0.6, RING.outer + 0.6, 0.06, 72]} />
        <meshStandardMaterial color={colors.surface2} roughness={1} />
      </mesh>
      <InstancedBoxes items={cols} grow={grow} onHover={onHover} />
      <InstancedBoxes items={caps} grow={grow} />
    </group>
  )
}

// ── Verdict · metric tokens ─────────────────────────────────────────────────

function toneColor(tone: TokenTone | SlabTone, colors: SceneColors): string {
  if (tone === 'pos') return colors.pos
  if (tone === 'neg') return colors.neg
  if (tone === 'neutral') return colors.ink4
  return colors.ink
}

export function TokensStation({
  station,
  tokens,
  colors,
  active,
  instant,
  onHover,
}: StationBase & { tokens: MetricToken[]; onHover: (index: number | null) => void }) {
  const grow = useGrow(active, tokens, instant)
  const n = tokens.length
  const bases = useMemo<BoxItem[]>(
    () =>
      tokens.map((t, i) => ({
        x: tokenX(station, i, n),
        z: 0,
        y: 0,
        h: TOKEN.baseH,
        w: TOKEN.base,
        d: TOKEN.base,
        color: toneColor(t.tone, colors),
      })),
    [tokens, station, n, colors]
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(station), -0.001, 0]}>
        <planeGeometry args={[Math.max(6, n * TOKEN.step + 1), 2.6]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes items={bases} grow={grow} onHover={onHover} />
      <GrowGroup grow={grow}>
        {tokens.map((t, i) =>
          t.direction === 'up' || t.direction === 'down' ? (
            <mesh
              key={t.id + i}
              position={[tokenX(station, i, n), TOKEN.baseH + TOKEN.arrow / 2 + 0.08, 0]}
              rotation={[t.direction === 'down' ? Math.PI : 0, Math.PI / 4, 0]}
            >
              <coneGeometry args={[0.42, TOKEN.arrow, 4]} />
              <meshStandardMaterial color={toneColor(t.tone, colors)} flatShading roughness={0.9} />
            </mesh>
          ) : (
            <mesh key={t.id + i} position={[tokenX(station, i, n), TOKEN.baseH + 0.2, 0]}>
              <boxGeometry args={[0.8, 0.14, 0.3]} />
              <meshStandardMaterial color={toneColor(t.tone, colors)} flatShading roughness={0.9} />
            </mesh>
          )
        )}
      </GrowGroup>
    </group>
  )
}

// ── At stake · slabs ────────────────────────────────────────────────────────

export function SlabsStation({
  station,
  model,
  colors,
  active,
  instant,
  highlight,
  onHover,
  onPick,
}: StationBase & {
  model: SlabModel
  highlight: string | null
  onHover: (index: number | null) => void
  onPick: (index: number) => void
}) {
  const grow = useGrow(active, model, instant)
  const n = model.slabs.length
  const items = useMemo<BoxItem[]>(
    () =>
      model.slabs.map((s, i) => ({
        x: slabX(station, i, n),
        z: 0,
        y: 0,
        h: slabHeight(model, s.amount),
        w: SLAB.width,
        d: SLAB.depth,
        color: s.id === highlight ? colors.accent : toneColor(s.tone, colors),
      })),
    [model, station, n, highlight, colors]
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(station), -0.001, 0]}>
        <planeGeometry args={[Math.max(6, n * SLAB.step + 1), SLAB.depth + 0.8]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes items={items} grow={grow} onHover={onHover} onPick={onPick} />
    </group>
  )
}

// ── Patterns · a stack of plates ────────────────────────────────────────────

export function PlatesStation({
  station,
  plates,
  colors,
  active,
  instant,
  highlight,
  openId,
  onHover,
  onPick,
}: StationBase & {
  plates: Plate[]
  highlight: string | null
  openId: string | null
  onHover: (index: number | null) => void
  onPick: (index: number) => void
}) {
  const grow = useGrow(active, plates, instant)
  const n = plates.length
  const items = useMemo<BoxItem[]>(
    () =>
      plates.map((p, i) => ({
        x: stationX(station),
        z: 0,
        y: plateY(i, n),
        h: PLATE.h,
        w: PLATE.size,
        d: PLATE.size,
        color: p.id === highlight ? colors.accent : p.id === openId ? colors.ink : colors.ink4,
      })),
    [plates, station, n, highlight, openId, colors]
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(station), -0.001, 0]}>
        <planeGeometry args={[PLATE.size + 1.4, PLATE.size + 1.4]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes items={items} grow={grow} onHover={onHover} onPick={onPick} />
    </group>
  )
}

// ── People · balance beams ──────────────────────────────────────────────────

/** Tips its children about z as the station rises, so a beam settles into
 *  its balance rather than appearing already tilted. */
function TiltGroup({
  grow,
  angle,
  children,
  ...props
}: {
  grow: React.RefObject<number>
  angle: number
  children: React.ReactNode
} & React.ComponentProps<'group'>) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = angle * (grow.current ?? 1)
  })
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}

export function BeamsStation({
  station,
  model,
  colors,
  active,
  instant,
  highlight,
  onHover,
}: StationBase & {
  model: BeamModel
  highlight: string | null
  onHover: (index: number | null) => void
}) {
  const grow = useGrow(active, model, instant)
  const n = model.beams.length
  const half = BEAM.length / 2
  const parts = useMemo(
    () =>
      model.beams.map<BoxItem[]>((b) => {
        const lit = b.person === highlight
        const out: BoxItem[] = [
          {
            x: 0,
            z: 0,
            y: -BEAM.thick / 2,
            h: BEAM.thick,
            w: BEAM.length,
            d: BEAM.depth,
            color: lit ? colors.accent : colors.ink,
          },
        ]
        const hThem = beamWeightHeight(model, b.theyOweYou)
        if (hThem > 0) {
          out.push({
            x: half - BEAM.weight / 2,
            z: 0,
            y: BEAM.thick / 2,
            h: hThem,
            w: BEAM.weight,
            d: BEAM.weight,
            color: colors.pos,
          })
        }
        const hYou = beamWeightHeight(model, b.youOweThem)
        if (hYou > 0) {
          out.push({
            x: -half + BEAM.weight / 2,
            z: 0,
            y: BEAM.thick / 2,
            h: hYou,
            w: BEAM.weight,
            d: BEAM.weight,
            color: colors.neg,
          })
        }
        return out
      }),
    [model, highlight, colors, half]
  )
  const depth = Math.max(1, n) * BEAM.row

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[stationX(station), -0.001, 0]}>
        <planeGeometry args={[BEAM.length + 1.4, depth + 0.4]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      {model.beams.map((b, i) => {
        const z = beamZ(i, n)
        return (
          <group key={b.person}>
            {/* the fulcrum */}
            <mesh position={[stationX(station), BEAM.pivot / 2 - 0.08, z]} rotation-y={Math.PI / 4}>
              <coneGeometry args={[0.36, BEAM.pivot - 0.16, 4]} />
              <meshStandardMaterial color={colors.ink4} flatShading roughness={0.9} />
            </mesh>
            <TiltGroup
              grow={grow}
              angle={-b.tilt * BEAM.maxTilt}
              position={[stationX(station), BEAM.pivot, z]}
            >
              <InstancedBoxes
                items={parts[i] ?? []}
                grow={grow}
                onHover={(k) => onHover(k === null ? null : i)}
              />
            </TiltGroup>
          </group>
        )
      })}
    </group>
  )
}
