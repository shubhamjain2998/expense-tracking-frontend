import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { TOOLTIP_STYLE } from '../lib/chartTheme'
import type { TerrainCell, YearTerrain } from '../lib/yearTerrain'

import { cameraAt, stationX, type StationFrame, type Vec3 } from './cameraPath'
import { STATION, type WorldLabel, type WorldTip } from './layout'
import type { SceneColors } from './sceneColors'
import type { Tower, TrendModel, VesselModel } from './stationData'
import { TerrainStation, TowersStation, TrendStation, VesselStation } from './stations'

/** Shared between the scroll handler, the camera rig and the label overlay. */
export interface WorldMotion {
  /** Where scrolling wants the camera, 0…3. */
  target: number
  /** Where the camera is, eased towards `target`. */
  current: number
  /** Set by the canvas once mounted; asks for a frame. */
  invalidate: () => void
}

/** Lower is lazier; the camera closes ~1 - e^(-EASE·dt) of the gap each frame. */
const EASE = 7

function CameraRig({
  frames,
  motion,
  instant,
}: {
  frames: StationFrame[]
  motion: () => WorldMotion
  instant: boolean
}) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    motion().invalidate = invalidate
    invalidate()
  }, [motion, invalidate])
  useEffect(() => invalidate(), [frames, invalidate])

  useFrame(({ camera, size }, delta) => {
    const m = motion()
    if (instant) {
      // Reduced motion: cut between stations instead of flying.
      m.current = Math.round(m.target)
    } else {
      const k = 1 - Math.exp(-EASE * Math.min(delta, 1 / 30))
      m.current += (m.target - m.current) * k
      if (Math.abs(m.target - m.current) < 0.0005) m.current = m.target
      else invalidate()
    }
    const pose = cameraAt(m.current, frames, size.width, size.height)
    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    camera.zoom = pose.zoom
    camera.updateProjectionMatrix()
  })
  return null
}

const scratch = new THREE.Vector3()

/**
 * Pins the overlay's DOM labels to 3D anchors, and fades each station's
 * labels by how close the camera is to it. Writes styles straight to the
 * elements on frames the scene already renders — no React render per frame.
 */
function Projector({
  labels,
  tip,
  motion,
  elements,
}: {
  labels: WorldLabel[]
  tip: WorldTip | null
  motion: () => WorldMotion
  elements: () => { labels: (HTMLElement | null)[]; tip: HTMLElement | null }
}) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [labels, tip, invalidate])

  useFrame(({ camera, size }) => {
    const els = elements()
    const t = motion().current
    const place = (el: HTMLElement, anchor: Vec3, shift: string, station: number) => {
      scratch.set(...anchor).project(camera)
      const x = ((scratch.x + 1) / 2) * size.width
      const y = ((1 - scratch.y) / 2) * size.height
      const opacity = Math.max(0, 1 - Math.abs(t - station) * 2.5)
      el.style.transform = `translate3d(${x}px, ${y}px, 0) ${shift}`
      el.style.opacity = String(opacity)
      el.style.visibility = opacity > 0 ? 'visible' : 'hidden'
    }
    labels.forEach((l, i) => {
      const el = els.labels[i]
      if (!el) return
      const shift =
        l.align === 'end'
          ? 'translate(-100%, -50%)'
          : l.align === 'start'
            ? 'translate(0, -50%)'
            : 'translate(-50%, -50%)'
      place(el, l.anchor, shift, l.station)
    })
    if (tip && els.tip) place(els.tip, tip.anchor, 'translate(-50%, -100%)', tip.station)
  })
  return null
}

/** A faint rule along the ground joining the stations, so the flight has a path. */
function Path({ colors }: { colors: SceneColors }) {
  const from = stationX(STATION.verdict) - 8
  const to = stationX(STATION.trend) + 14
  return (
    <mesh rotation-x={-Math.PI / 2} position={[(from + to) / 2, -0.01, 2.2]}>
      <planeGeometry args={[to - from, 0.05]} />
      <meshBasicMaterial color={colors.line} />
    </mesh>
  )
}

export interface WorldSceneProps {
  frames: StationFrame[]
  labels: WorldLabel[]
  tip: WorldTip | null
  /** Shared camera state, read and written at frame time (a getter, not a value, so the
   *  rig can ease it without a render). */
  motion: () => WorldMotion
  /** Stations reached so far; each rises in the first time it's reached. */
  reached: ReadonlySet<number>
  instant: boolean
  colors: SceneColors
  vessel: VesselModel
  towers: Tower[]
  terrain: YearTerrain
  trend: TrendModel
  highlight: string | null
  onTowerHover: (index: number | null) => void
  onTowerPick: (tower: Tower) => void
  onTerrainHover: (cell: TerrainCell | null) => void
  onTerrainPick: (cell: TerrainCell) => void
  onTrendHover: (index: number | null) => void
}

/**
 * The Home world: one orthographic scene holding all four stations, flown
 * through by scrolling the panels beside it. Decorative for assistive tech —
 * every number it draws is in the panels, as text.
 */
export default function WorldScene(props: WorldSceneProps) {
  const { frames, labels, tip, motion, reached, instant, colors } = props
  const labelEls = useRef<(HTMLElement | null)[]>([])
  const tipEl = useRef<HTMLDivElement>(null)
  const isOn = (i: number) => reached.has(i)

  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    []
  )
  const tipStyle = useMemo(() => ({ ...TOOLTIP_STYLE }), [])

  return (
    <div className="world-stage" aria-hidden="true">
      <Canvas
        orthographic
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 10, 40], zoom: 40, near: -200, far: 400 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[6, 12, 8]} intensity={1.4} />
        <CameraRig frames={frames} motion={motion} instant={instant} />
        <Path colors={colors} />
        <VesselStation model={props.vessel} colors={colors} active={isOn(0)} instant={instant} />
        <TowersStation
          towers={props.towers}
          colors={colors}
          active={isOn(1)}
          instant={instant}
          highlight={props.highlight}
          onHover={props.onTowerHover}
          onPick={props.onTowerPick}
        />
        <TerrainStation
          terrain={props.terrain}
          colors={colors}
          active={isOn(2)}
          instant={instant}
          onHover={props.onTerrainHover}
          onPick={props.onTerrainPick}
        />
        <TrendStation
          trend={props.trend}
          colors={colors}
          active={isOn(3)}
          instant={instant}
          onHover={props.onTrendHover}
        />
        <Projector
          labels={labels}
          tip={tip}
          motion={motion}
          elements={() => ({ labels: labelEls.current, tip: tipEl.current })}
        />
      </Canvas>

      <div className="world-overlay">
        {labels.map((l, i) => (
          <span
            key={l.key}
            ref={(el) => {
              labelEls.current[i] = el
            }}
            className={[
              'world-label',
              l.align === 'center' ? 'num' : null,
              l.tone ? `is-${l.tone}` : null,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {l.text}
          </span>
        ))}
        {tip && (
          <div ref={tipEl} className="world-tip" style={tipStyle}>
            <div className="mb-1 font-semibold">{tip.title}</div>
            {tip.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
