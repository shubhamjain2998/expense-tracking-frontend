/**
 * The signed-out scenes — pure layout, no three.js.
 *
 * Login, Register and Not found show a small turntable in Home's visual
 * language beside their content. Nobody is signed in, so there is no data to
 * draw: every figure here is a fixed, illustrative share (0…1), never money,
 * and nothing in the scene is labelled. The shapes only have to *look* like
 * Kosh — a vessel filling, a few towers, a patch of terrain.
 */

import type { StationFrame, Vec3 } from '@/components/world/cameraPath'

/**
 * Where the turntable sits. WorldCanvas always draws its station path along
 * the ground at y≈0 (the kit has no switch for it), and under a turning scene
 * that fixed rule reads as a glitch — so the whole scene is lifted far above
 * it, out of frame.
 */
export const HERO_ORIGIN: Vec3 = [0, 40, 0]

/** Radians per second: one full turn every 90s. */
export const TURN_SPEED = (Math.PI * 2) / 90
/** The resting angle, also the only angle under reduced motion. */
export const TURN_START = -Math.PI / 7

/** Turntable angle after `elapsed` seconds; held at rest when motion is reduced. */
export function turnAngle(elapsed: number, still: boolean): number {
  if (still || !Number.isFinite(elapsed) || elapsed <= 0) return TURN_START
  return TURN_START + ((elapsed * TURN_SPEED) % (Math.PI * 2))
}

/** Which scene colour a box takes; the component maps these to SceneColors. */
export type HeroTone = 'ink' | 'ink4' | 'accent'

export interface HeroBox {
  x: number
  z: number
  y: number
  h: number
  w: number
  d: number
  tone: HeroTone
}

/**
 * fitZoom boxes the plate as a square, and seen from HERO_VIEW (about 36°
 * off the x axis) a square's corners project ~1.4× wider than the round
 * plate inside it. Shrinking the box by this factor fits the plate itself,
 * which is what the turntable sweeps at every angle.
 */
export const FRAME_SQUARE_TO_DISC = 0.75
export const HERO_VIEW: Vec3 = [1, 0.78, 1.35]

/** A camera frame that fits the turntable at every angle. */
function turntableFrame(radius: number, height: number): StationFrame {
  const side = radius * 2 * FRAME_SQUARE_TO_DISC
  return {
    center: [HERO_ORIGIN[0], HERO_ORIGIN[1] + height / 2, HERO_ORIGIN[2]],
    size: [side, height, side],
    view: HERO_VIEW,
  }
}

// ── Login / Register: vessel, towers, terrain ───────────────────────────────

export const AUTH = {
  plate: 5.6,
  height: 4.4,
  vessel: { x: -2.3, z: -0.2, radius: 1.3, rim: 4.2 },
  towers: { z: -1.7, x0: 0.4, step: 0.95, width: 0.68, height: 3.6 },
  terrain: { x0: 0.5, z0: 1.05, step: 0.72, cell: 0.56, height: 1.3, cols: 6, rows: 3 },
}

/** Illustrative shares, not anyone's figures: how full the vessel is, and pace. */
export const SAMPLE_VESSEL = { fill: 0.62, pace: 0.7 }
/** Illustrative tower shares, largest first; one is picked out in the accent. */
export const SAMPLE_TOWERS = [1, 0.72, 0.52, 0.36, 0.2]
const ACCENT_TOWER = 1

export interface HeroVessel {
  x: number
  z: number
  radius: number
  rim: number
  /** Ink fill height, from the floor. */
  fill: number
  /** Height of the pace ring. */
  pace: number
}

export function authVessel(): HeroVessel {
  const v = AUTH.vessel
  return {
    x: v.x,
    z: v.z,
    radius: v.radius,
    rim: v.rim,
    fill: v.rim * SAMPLE_VESSEL.fill,
    pace: v.rim * SAMPLE_VESSEL.pace,
  }
}

/** One height scale for the towers, from their own max. */
export function authTowers(): HeroBox[] {
  const t = AUTH.towers
  const max = Math.max(...SAMPLE_TOWERS)
  return SAMPLE_TOWERS.map((share, i) => ({
    x: t.x0 + i * t.step,
    z: t.z,
    y: 0,
    h: (share / max) * t.height,
    w: t.width,
    d: t.width,
    tone: i === ACCENT_TOWER ? 'accent' : 'ink',
  }))
}

/** A soft hill across the grid, peaking towards the back left. */
function hill(row: number, col: number): number {
  const dx = col - 1.5
  const dz = row - 0.4
  return 0.18 + Math.exp(-(dx * dx) / 5 - (dz * dz) / 3)
}

/** One height scale for the terrain, from its own max. */
export function authTerrain(): HeroBox[] {
  const t = AUTH.terrain
  const raw: { row: number; col: number; v: number }[] = []
  for (let row = 0; row < t.rows; row++) {
    for (let col = 0; col < t.cols; col++) raw.push({ row, col, v: hill(row, col) })
  }
  const max = Math.max(...raw.map((c) => c.v))
  return raw.map(({ row, col, v }) => ({
    x: t.x0 + col * t.step,
    z: t.z0 + row * t.step,
    y: 0,
    h: (v / max) * t.height,
    w: t.cell,
    d: t.cell,
    tone: 'ink4',
  }))
}

export function authFrame(): StationFrame {
  return turntableFrame(AUTH.plate, AUTH.height)
}

// ── Not found: three towers, one knocked over ───────────────────────────────

export const LOST = {
  plate: 2.8,
  height: 2.6,
  width: 0.72,
}

/** The standing towers; the fallen one is `lostFallen()`. */
export function lostStanding(): HeroBox[] {
  const w = LOST.width
  return [
    { x: -1.4, z: -0.4, y: 0, h: 2.4, w, d: w, tone: 'ink' },
    { x: -0.1, z: -1.1, y: 0, h: 1.6, w, d: w, tone: 'ink' },
  ]
}

/** A tower lying on its side: its length runs along x, resting on the plate. */
export function lostFallen(): { position: Vec3; size: Vec3; yaw: number } {
  const w = LOST.width
  const length = 2
  return { position: [0.9, w / 2, 0.6], size: [length, w, w], yaw: -0.35 }
}

export function lostFrame(): StationFrame {
  return turntableFrame(LOST.plate, LOST.height)
}
