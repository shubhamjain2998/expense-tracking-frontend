import { Edges } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'

import { GrowGroup, InstancedBoxes, type BoxItem } from '@/components/world/primitives'
import type { SceneColors } from '@/components/world/sceneColors'
import { useGrow } from '@/components/world/useGrow'
import WorldCanvas, { type WorldMotion } from '@/components/world/WorldCanvas'

import {
  AUTH,
  authFrame,
  authTerrain,
  authTowers,
  authVessel,
  HERO_ORIGIN,
  LOST,
  lostFallen,
  lostFrame,
  lostStanding,
  turnAngle,
  type HeroBox,
} from './heroLayout'

export type HeroSceneName = 'auth' | 'lost'

function boxes(items: HeroBox[], colors: SceneColors): BoxItem[] {
  return items.map(({ tone, ...b }) => ({ ...b, color: colors[tone] }))
}

/**
 * Turns its children slowly about the vertical axis. Asks for a frame only
 * while turning; under reduced motion it rests at one angle and asks for none.
 */
function Turntable({ still, children }: { still: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const elapsed = useRef(0)
  useFrame((state, dt) => {
    if (!ref.current) return
    if (!still) elapsed.current += Math.min(dt, 1 / 30)
    ref.current.rotation.y = turnAngle(elapsed.current, still)
    if (!still) state.invalidate()
  })
  return (
    <group ref={ref} position={HERO_ORIGIN}>
      {children}
    </group>
  )
}

function Plate({ radius, colors }: { radius: number; colors: SceneColors }) {
  return (
    <mesh position-y={-0.03}>
      <cylinderGeometry args={[radius, radius, 0.06, 72]} />
      <meshStandardMaterial color={colors.surface2} roughness={1} />
    </mesh>
  )
}

/** A vessel filling, a few towers and a patch of terrain — Home in miniature. */
function AuthScene({ colors, still }: { colors: SceneColors; still: boolean }) {
  const grow = useGrow(true, 'auth', still)
  const v = authVessel()
  const towers = useMemo(() => boxes(authTowers(), colors), [colors])
  const terrain = useMemo(() => boxes(authTerrain(), colors), [colors])

  return (
    <>
      <Plate radius={AUTH.plate} colors={colors} />
      <GrowGroup grow={grow} position={[v.x, 0, v.z]}>
        <mesh position-y={v.rim / 2}>
          <cylinderGeometry args={[v.radius, v.radius, v.rim, 64, 1, true]} />
          <meshStandardMaterial
            color={colors.line}
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
          <Edges color={colors.ink4} threshold={20} />
        </mesh>
        <mesh position-y={v.fill / 2}>
          <cylinderGeometry args={[v.radius * 0.94, v.radius * 0.94, v.fill, 64]} />
          <meshStandardMaterial color={colors.ink} flatShading roughness={0.9} />
        </mesh>
        <mesh position-y={v.pace} rotation-x={Math.PI / 2}>
          <torusGeometry args={[v.radius + 0.12, 0.045, 8, 96]} />
          <meshBasicMaterial color={colors.accent} />
        </mesh>
      </GrowGroup>
      <InstancedBoxes items={towers} grow={grow} />
      <InstancedBoxes items={terrain} grow={grow} />
    </>
  )
}

/** Two towers standing and one knocked over: the page that isn't there. */
function LostScene({ colors, still }: { colors: SceneColors; still: boolean }) {
  const grow = useGrow(true, 'lost', still)
  const standing = useMemo(() => boxes(lostStanding(), colors), [colors])
  const fallen = lostFallen()

  return (
    <>
      <Plate radius={LOST.plate} colors={colors} />
      <InstancedBoxes items={standing} grow={grow} />
      <GrowGroup grow={grow}>
        <mesh position={fallen.position} rotation-y={fallen.yaw}>
          <boxGeometry args={fallen.size} />
          <meshStandardMaterial color={colors.accent} flatShading roughness={0.9} />
        </mesh>
      </GrowGroup>
    </>
  )
}

/**
 * A small decorative turntable for the signed-out pages, drawn through the
 * kit's WorldCanvas with a single fixed station. It shows no data and no
 * labels, so there is nothing for assistive tech to miss; the canvas is
 * aria-hidden by WorldCanvas.
 */
export default function HeroCanvas({
  scene,
  colors,
  still,
}: {
  scene: HeroSceneName
  colors: SceneColors
  still: boolean
}) {
  const frames = useMemo(() => [scene === 'auth' ? authFrame() : lostFrame()], [scene])
  // One station, so the camera never flies: a fixed pose the rig settles on.
  const motion = useRef<WorldMotion>({ target: 0, current: 0, invalidate: () => {} })
  const getMotion = useCallback(() => motion.current, [])

  return (
    <WorldCanvas
      frames={frames}
      labels={[]}
      tip={null}
      motion={getMotion}
      instant
      colors={colors}
      showPath={false}
    >
      <Turntable still={still}>
        {scene === 'auth' ? (
          <AuthScene colors={colors} still={still} />
        ) : (
          <LostScene colors={colors} still={still} />
        )}
      </Turntable>
    </WorldCanvas>
  )
}
