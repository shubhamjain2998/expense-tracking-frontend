import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { formatCurrency } from '@/lib/format'

import { TOOLTIP_STYLE } from '../../lib/chartTheme'
import type { TerrainCell, YearTerrain } from '../../lib/yearTerrain'

import { readSceneColors, type SceneColors } from './sceneColors'

// World units. One cell is CELL wide and deep; STEP is cell + gutter.
const CELL = 0.78
const STEP = 1.1
const HEIGHT = 3.2
const PLAN_CAP = 0.035
const GROW_SECONDS = 0.7

interface YearSceneProps {
  terrain: YearTerrain
  isDark: boolean
  onSelect: (cell: TerrainCell) => void
}

/** Cell centre on the ground plane, with the whole grid centred on the origin. */
function cellXZ(terrain: YearTerrain, cell: Pick<TerrainCell, 'row' | 'col'>): [number, number] {
  const x = (cell.col - 5.5) * STEP
  const z = (cell.row - (terrain.rows.length - 1) / 2) * STEP
  return [x, z]
}

function heightOf(amount: number, max: number): number {
  return max > 0 ? Math.max(0.02, (amount / max) * HEIGHT) : 0.02
}

const box = new THREE.BoxGeometry(1, 1, 1)
const matrix = new THREE.Matrix4()
const color = new THREE.Color()

/**
 * One InstancedMesh for a set of cells: one draw call however many boxes.
 * `grow` (0–1) scales every box's height so the terrain can rise in.
 */
function Boxes({
  terrain,
  cells,
  colorOf,
  opacity = 1,
  heightFor,
  grow,
  onHover,
  onSelect,
}: {
  terrain: YearTerrain
  cells: TerrainCell[]
  colorOf: (cell: TerrainCell) => string
  opacity?: number
  heightFor: (cell: TerrainCell) => { y: number; h: number }
  grow: React.RefObject<number>
  onHover?: (cell: TerrainCell | null) => void
  onSelect?: (cell: TerrainCell) => void
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const lastGrow = useRef(-1)
  const invalidate = useThree((s) => s.invalidate)

  const layout = useMemo(
    () => cells.map((c) => ({ xz: cellXZ(terrain, c), ...heightFor(c) })),
    [cells, terrain, heightFor]
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    cells.forEach((c, i) => mesh.setColorAt(i, color.set(colorOf(c))))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    invalidate()
  }, [cells, colorOf, invalidate])

  useLayoutEffect(() => {
    lastGrow.current = -1 // force a matrix pass on the next frame
    invalidate()
  }, [layout, invalidate])

  useFrame(() => {
    const mesh = ref.current
    const g = grow.current ?? 1
    if (!mesh || g === lastGrow.current) return
    lastGrow.current = g
    layout.forEach(({ xz, y, h }, i) => {
      const hh = Math.max(0.001, h * g)
      matrix.makeScale(CELL, hh, CELL).setPosition(xz[0], y * g + hh / 2, xz[1])
      mesh.setMatrixAt(i, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  })

  if (cells.length === 0) return null
  return (
    <instancedMesh
      // Remount when the count changes: InstancedMesh capacity is fixed.
      key={cells.length}
      ref={ref}
      args={[box, undefined, cells.length]}
      onPointerMove={
        onHover
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              if (e.instanceId !== undefined) onHover(cells[e.instanceId] ?? null)
            }
          : undefined
      }
      onPointerOut={onHover ? () => onHover(null) : undefined}
      onClick={
        onSelect
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation()
              const cell = e.instanceId !== undefined ? cells[e.instanceId] : undefined
              if (cell) onSelect(cell)
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

/** Drives the rise-in: a 0→1 ref advanced per frame, asking for frames only until done. */
function useGrow(key: unknown, instant: boolean) {
  const grow = useRef(instant ? 1 : 0)
  useLayoutEffect(() => {
    grow.current = instant ? 1 : 0
  }, [key, instant])
  useFrame((state, dt) => {
    if (grow.current >= 1) return
    grow.current = Math.min(1, grow.current + dt / GROW_SECONDS)
    state.invalidate()
  })
  return grow
}

interface Label {
  key: string
  text: string
  anchor: [number, number, number]
  /** 'center' sits the label on its anchor; 'end' right-aligns it to it. */
  align: 'center' | 'end'
  current?: boolean
}

function gridHalf(terrain: YearTerrain) {
  return {
    halfWidth: 5.5 * STEP + STEP / 2,
    halfDepth: ((terrain.rows.length - 1) / 2) * STEP + STEP / 2,
  }
}

/** Month labels along the front edge, category labels down the left. */
function buildLabels(terrain: YearTerrain): Label[] {
  const { halfWidth, halfDepth } = gridHalf(terrain)
  return [
    ...terrain.months.map<Label>((m, col) => ({
      key: `m${m.periodMonth}`,
      text: m.label,
      anchor: [cellXZ(terrain, { row: 0, col })[0], 0, halfDepth + 0.35],
      align: 'center',
      current: col === terrain.currentCol,
    })),
    ...terrain.rows.map<Label>((r, row) => ({
      key: `r${r.category}`,
      text: r.category,
      anchor: [-halfWidth - 0.2, 0, cellXZ(terrain, { row, col: 0 })[1]],
      align: 'end',
    })),
  ]
}

function tooltipAnchor(terrain: YearTerrain, cell: TerrainCell): [number, number, number] {
  const [x, z] = cellXZ(terrain, cell)
  return [x, heightOf(Math.max(cell.amount, cell.plan), terrain.max) + 0.3, z]
}

const scratch = new THREE.Vector3()

/**
 * Pins DOM elements to 3D anchors. Runs only on frames the scene already
 * renders (camera turn, fit, rise-in), writing transforms straight to the
 * elements — no React render per frame, and one overlay instead of a
 * portal root per label.
 */
function Projector({
  labels,
  tip,
  elements,
}: {
  labels: Label[]
  tip: [number, number, number] | null
  /** The overlay's current elements, read at frame time (they live outside the canvas). */
  elements: () => { labels: (HTMLElement | null)[]; tip: HTMLElement | null }
}) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [labels, tip, invalidate])

  useFrame(({ camera, size }) => {
    const els = elements()
    const place = (el: HTMLElement, anchor: [number, number, number], shift: string) => {
      scratch.set(...anchor).project(camera)
      const x = ((scratch.x + 1) / 2) * size.width
      const y = ((1 - scratch.y) / 2) * size.height
      el.style.transform = `translate3d(${x}px, ${y}px, 0) ${shift}`
      el.style.visibility = 'visible'
    }
    labels.forEach((l, i) => {
      const el = els.labels[i]
      if (el) {
        place(el, l.anchor, l.align === 'end' ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)')
      }
    })
    if (tip && els.tip) place(els.tip, tip, 'translate(-50%, -100%)')
  })
  return null
}

function Terrain({
  terrain,
  colors,
  instant,
  onHover,
  onSelect,
}: {
  terrain: YearTerrain
  colors: SceneColors
  instant: boolean
  onHover: (cell: TerrainCell | null) => void
  onSelect: (cell: TerrainCell) => void
}) {
  const grow = useGrow(terrain, instant)

  const { solid, projected, planned, paced } = useMemo(() => {
    const withSpend = terrain.cells.filter((c) => c.amount > 0)
    return {
      solid: withSpend.filter((c) => c.kind !== 'projected'),
      projected: withSpend.filter((c) => c.kind === 'projected'),
      planned: terrain.cells.filter((c) => c.plan > 0),
      paced: terrain.cells.filter((c) => c.paceAt !== null),
    }
  }, [terrain])

  const max = terrain.max
  const spendHeight = useMemo(
    () => (c: TerrainCell) => ({ y: 0, h: heightOf(c.amount, max) }),
    [max]
  )
  const planHeight = useMemo(
    () => (c: TerrainCell) => ({ y: heightOf(c.plan, max), h: PLAN_CAP }),
    [max]
  )
  const paceHeight = useMemo(
    () => (c: TerrainCell) => ({ y: heightOf(c.paceAt ?? 0, max), h: PLAN_CAP * 1.5 }),
    [max]
  )
  const paint = useMemo(
    () => ({
      solid: (c: TerrainCell) => (c.over ? colors.neg : colors.ink),
      projected: () => colors.ink4,
      plan: () => colors.line,
      pace: () => colors.accent,
    }),
    [colors]
  )

  const select = (cell: TerrainCell) => {
    if (cell.linkable) onSelect(cell)
  }
  const { halfWidth, halfDepth } = gridHalf(terrain)

  return (
    <Bounds fit clip observe margin={1.1} maxDuration={instant ? 0 : 0.6}>
      <group>
        {/* Fit target: the full-height extent, so the camera frames the
            grown terrain rather than the flat one it sees on first frame. */}
        <mesh position-y={HEIGHT / 2} visible={false}>
          <boxGeometry args={[halfWidth * 2, HEIGHT, halfDepth * 2]} />
        </mesh>
        {/* ground */}
        <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
          <planeGeometry args={[halfWidth * 2, halfDepth * 2]} />
          <meshBasicMaterial color={colors.surface2} />
        </mesh>
        <Boxes
          terrain={terrain}
          cells={solid}
          colorOf={paint.solid}
          heightFor={spendHeight}
          grow={grow}
          onHover={onHover}
          onSelect={select}
        />
        <Boxes
          terrain={terrain}
          cells={projected}
          colorOf={paint.projected}
          opacity={0.35}
          heightFor={spendHeight}
          grow={grow}
          onHover={onHover}
          onSelect={select}
        />
        <Boxes
          terrain={terrain}
          cells={planned}
          colorOf={paint.plan}
          heightFor={planHeight}
          grow={grow}
        />
        <Boxes
          terrain={terrain}
          cells={paced}
          colorOf={paint.pace}
          heightFor={paceHeight}
          grow={grow}
        />
      </group>
    </Bounds>
  )
}

/**
 * The 3D year view: months across, categories deep, spend up. Plan is a thin
 * cap at each category's monthly budget; the accent cap on today's month is
 * the pace tick from Where it went. Orthographic, so heights stay comparable
 * wherever they sit on screen.
 *
 * Decorative for assistive tech — YearBlock renders the same numbers as a
 * table alongside it.
 */
export default function YearScene({ terrain, isDark, onSelect }: YearSceneProps) {
  const reduceMotion = useReducedMotion() ?? false
  // Re-read the tokens when the theme flips; html.dark swaps the CSS vars.
  const colors = useMemo(() => readSceneColors(), [isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  const [hovered, setHovered] = useState<TerrainCell | null>(null)
  const labels = useMemo(() => buildLabels(terrain), [terrain])
  const labelEls = useRef<(HTMLElement | null)[]>([])
  const tipEl = useRef<HTMLDivElement>(null)
  const tip = useMemo(() => (hovered ? tooltipAnchor(terrain, hovered) : null), [terrain, hovered])

  const hover = (cell: TerrainCell | null) => {
    setHovered(cell)
    document.body.style.cursor = cell?.linkable ? 'pointer' : ''
  }
  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    []
  )

  return (
    <div className="year-scene" aria-hidden="true">
      <Canvas
        orthographic
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [3, 9, 14], zoom: 40, near: -100, far: 200 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onPointerMissed={() => hover(null)}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[6, 12, 8]} intensity={1.4} />
        <Terrain
          terrain={terrain}
          colors={colors}
          instant={reduceMotion}
          onHover={hover}
          onSelect={onSelect}
        />
        <Projector
          labels={labels}
          tip={tip}
          elements={() => ({ labels: labelEls.current, tip: tipEl.current })}
        />
        <OrbitControls
          makeDefault
          enableZoom={false}
          enablePan={false}
          minPolarAngle={0.5}
          maxPolarAngle={1.25}
          minAzimuthAngle={-0.7}
          maxAzimuthAngle={0.9}
          enableDamping={!reduceMotion}
        />
      </Canvas>

      <div className="year-scene-overlay">
        {labels.map((l, i) => (
          <span
            key={l.key}
            ref={(el) => {
              labelEls.current[i] = el
            }}
            className={[
              'year-scene-label',
              l.align === 'end' ? 'is-row' : 'num',
              l.current ? 'is-current' : null,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {l.text}
          </span>
        ))}
        {hovered && (
          <div ref={tipEl} className="year-scene-tip" style={TOOLTIP_STYLE}>
            <div className="mb-1 font-semibold">
              {hovered.category} · {terrain.months[hovered.col]?.label}
              {hovered.kind === 'projected' ? ' · projected' : ''}
            </div>
            <div>
              {hovered.kind === 'projected' ? 'At this pace' : 'Spent'}:{' '}
              {formatCurrency(Math.round(hovered.amount))}
            </div>
            {hovered.plan > 0 && <div>Plan: {formatCurrency(hovered.plan)}</div>}
            {hovered.paceAt !== null && (
              <div>Expected by today: {formatCurrency(Math.round(hovered.paceAt))}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
