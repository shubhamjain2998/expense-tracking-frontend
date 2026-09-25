import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Building blocks shared by every world scene. Stations are made of these so
 * boxes rise, pick and colour the same way on every page.
 */

/** Scales a group's height by a grow ref, so everything in it rises together. */
export function GrowGroup({
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
export function InstancedBoxes({
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
