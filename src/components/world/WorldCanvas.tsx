import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'

import { cameraAt, stationX, type StationFrame, type Vec3 } from './cameraPath'
import type { SceneColors } from './sceneColors'
import type { WorldLabel, WorldTip } from './types'

/** Shared between the scroll handler, the camera rig and the label overlay. */
export interface WorldMotion {
  /** Where scrolling wants the camera, 0…stations-1. */
  target: number
  /** Where the camera is, eased towards `target`. */
  current: number
  /** Set by the canvas once mounted; asks for a frame. */
  invalidate: () => void
}

/** Higher is snappier; the camera closes ~1 - e^(-EASE·dt) of the gap each frame. */
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
 * elements on frames the scene already renders — no React render per frame,
 * and one overlay instead of a portal root per label.
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
    const place = (
      el: HTMLElement,
      anchor: Vec3,
      shift: string,
      station: number,
      keepInside = false
    ) => {
      scratch.set(...anchor).project(camera)
      let x = ((scratch.x + 1) / 2) * size.width
      // A centred tip over an object near the stage's edge would be cut off
      // by the overlay; slide it along until it fits.
      if (keepInside) {
        const half = el.offsetWidth / 2 + 8
        x = Math.min(Math.max(x, half), Math.max(half, size.width - half))
      }
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
    if (tip && els.tip) place(els.tip, tip.anchor, 'translate(-50%, -100%)', tip.station, true)
  })
  return null
}

/** A faint rule along the ground joining the stations, so the flight has a path. */
function Path({ colors, count }: { colors: SceneColors; count: number }) {
  const from = stationX(0) - 8
  const to = stationX(Math.max(0, count - 1)) + 14
  return (
    <mesh rotation-x={-Math.PI / 2} position={[(from + to) / 2, -0.01, 2.2]}>
      <planeGeometry args={[to - from, 0.05]} />
      <meshBasicMaterial color={colors.line} />
    </mesh>
  )
}

export interface WorldCanvasProps {
  frames: StationFrame[]
  labels: WorldLabel[]
  tip: WorldTip | null
  /** Shared camera state, read and written at frame time (a getter so the
   *  rig can ease it without a render). */
  motion: () => WorldMotion
  instant: boolean
  colors: SceneColors
  /** Draw the ground rule joining the stations. Off for single-scene heroes,
   *  where a fixed rule under a turning scene reads as a glitch. */
  showPath?: boolean
  /** The page's station meshes. */
  children: ReactNode
}

/**
 * One orthographic scene for a whole page, flown through by scrolling the
 * panels beside it. Decorative for assistive tech — every number it draws is
 * in a panel as text.
 */
export default function WorldCanvas({
  frames,
  labels,
  tip,
  motion,
  instant,
  colors,
  showPath = true,
  children,
}: WorldCanvasProps) {
  const labelEls = useRef<(HTMLElement | null)[]>([])
  const tipEl = useRef<HTMLDivElement>(null)

  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    []
  )

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
        {showPath && <Path colors={colors} count={frames.length} />}
        {children}
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
          <div ref={tipEl} className="world-tip">
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
