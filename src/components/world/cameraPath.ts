/**
 * Camera path for the Home world — pure math, no three.js.
 *
 * The four stations sit in a line along x. Each one declares the box it
 * occupies and the direction the camera looks at it from; the camera for a
 * scroll position `t` (0 = first station, 3 = last) blends the two stations
 * either side of it. Zoom is solved per station so its box fills the stage
 * whatever the stage's pixel size, which is what an orthographic camera
 * needs in place of a distance.
 */

export type Vec3 = [number, number, number]

/** World units between station centres. */
export const STATION_GAP = 40

export interface StationFrame {
  /** Centre of the station's content, world units. */
  center: Vec3
  /** Full width / height / depth of the content, world units. */
  size: Vec3
  /** Direction from the target towards the camera; need not be normalised. */
  view: Vec3
}

export interface CameraPose {
  position: Vec3
  target: Vec3
  /** Pixels per world unit. */
  zoom: number
}

const DISTANCE = 40
/** Share of the stage the station's box may fill. */
const FILL = 0.84

export function stationX(index: number): number {
  return index * STATION_GAP
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k]
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a[0], a[1], a[2]) || 1
  return scale(a, 1 / len)
}
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k
}
function lerp3(a: Vec3, b: Vec3, k: number): Vec3 {
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]
}

/**
 * Pixels per world unit that fit `frame` in a stage of `width`×`height`
 * pixels, seen from `frame.view`. Projects the box's eight corners onto the
 * camera's right and up axes and fits the larger of the two ratios.
 */
export function fitZoom(frame: StationFrame, width: number, height: number): number {
  const back = normalize(frame.view)
  const right = normalize(cross([0, 1, 0], back))
  const up = cross(back, right)
  let halfW = 0
  let halfH = 0
  for (const sx of [-0.5, 0.5]) {
    for (const sy of [-0.5, 0.5]) {
      for (const sz of [-0.5, 0.5]) {
        const corner: Vec3 = [frame.size[0] * sx, frame.size[1] * sy, frame.size[2] * sz]
        halfW = Math.max(halfW, Math.abs(dot(corner, right)))
        halfH = Math.max(halfH, Math.abs(dot(corner, up)))
      }
    }
  }
  if (halfW === 0 || halfH === 0 || width <= 0 || height <= 0) return 1
  return Math.min((width * FILL) / (2 * halfW), (height * FILL) / (2 * halfH))
}

function smoothstep(k: number): number {
  return k * k * (3 - 2 * k)
}

/** Camera pose for scroll position `t` across `frames`. */
export function cameraAt(
  t: number,
  frames: StationFrame[],
  width: number,
  height: number
): CameraPose {
  if (frames.length === 0) return { position: [0, 0, DISTANCE], target: [0, 0, 0], zoom: 1 }
  const clamped = Math.min(frames.length - 1, Math.max(0, t))
  const i = Math.min(frames.length - 2, Math.floor(clamped))
  const a = frames[Math.max(0, i)]
  const b = frames[Math.min(frames.length - 1, i + 1)]
  const k = frames.length === 1 ? 0 : smoothstep(clamped - Math.max(0, i))

  const target = lerp3(a.center, b.center, k)
  const view = normalize(lerp3(normalize(a.view), normalize(b.view), k))
  // Blend zoom in log space so a wide station and a tall one meet evenly.
  const za = fitZoom(a, width, height)
  const zb = fitZoom(b, width, height)
  const zoom = Math.exp(lerp(Math.log(za), Math.log(zb), k))
  return { position: add(target, scale(view, DISTANCE)), target, zoom }
}

/**
 * Scroll position from where each station's panel sits: 0 when the first
 * panel's centre is at the viewport's centre, 1 at the second, and so on,
 * interpolated between and clamped at both ends.
 */
export function progressFromCenters(panelCenters: number[], viewportCenter: number): number {
  const n = panelCenters.length
  if (n === 0) return 0
  if (viewportCenter <= panelCenters[0]) return 0
  for (let i = 0; i < n - 1; i++) {
    const a = panelCenters[i]
    const b = panelCenters[i + 1]
    if (viewportCenter <= b) return b > a ? i + (viewportCenter - a) / (b - a) : i
  }
  return n - 1
}
