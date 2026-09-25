import { describe, expect, it } from 'vitest'

import { fitZoom } from '@/components/world/cameraPath'

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
  TURN_SPEED,
  TURN_START,
  turnAngle,
  type HeroBox,
} from './heroLayout'

/** Farthest horizontal reach of a box from the turntable's axis. */
function reach(b: HeroBox): number {
  return Math.hypot(Math.abs(b.x) + b.w / 2, Math.abs(b.z) + b.d / 2)
}

describe('turnAngle', () => {
  it('rests at the start angle under reduced motion', () => {
    expect(turnAngle(0, true)).toBe(TURN_START)
    expect(turnAngle(30, true)).toBe(TURN_START)
  })

  it('turns slowly and wraps after a full turn', () => {
    expect(turnAngle(10, false)).toBeCloseTo(TURN_START + 10 * TURN_SPEED)
    const period = (Math.PI * 2) / TURN_SPEED
    expect(turnAngle(period + 5, false)).toBeCloseTo(turnAngle(5, false))
    expect(period).toBeGreaterThanOrEqual(60)
  })

  it('ignores bad elapsed values', () => {
    expect(turnAngle(Number.NaN, false)).toBe(TURN_START)
    expect(turnAngle(-3, false)).toBe(TURN_START)
  })
})

describe('auth scene', () => {
  it('keeps every box on the plate, so the turning frame never clips', () => {
    for (const b of [...authTowers(), ...authTerrain()]) {
      expect(reach(b)).toBeLessThanOrEqual(AUTH.plate)
      expect(b.y + b.h).toBeLessThanOrEqual(AUTH.height)
    }
    const v = authVessel()
    expect(Math.hypot(v.x, v.z) + v.radius).toBeLessThanOrEqual(AUTH.plate)
  })

  it('fills the vessel below its rim, with the pace ring inside it', () => {
    const v = authVessel()
    expect(v.fill).toBeGreaterThan(0)
    expect(v.fill).toBeLessThan(v.rim)
    expect(v.pace).toBeLessThan(v.rim)
  })

  it('scales the towers from their own max, one in the accent', () => {
    const towers = authTowers()
    expect(Math.max(...towers.map((t) => t.h))).toBe(AUTH.towers.height)
    expect(towers.filter((t) => t.tone === 'accent')).toHaveLength(1)
    // Largest first, like a sorted category list.
    towers.slice(1).forEach((t, i) => expect(t.h).toBeLessThanOrEqual(towers[i].h))
  })

  it('scales the terrain from its own max', () => {
    const cells = authTerrain()
    expect(cells).toHaveLength(AUTH.terrain.rows * AUTH.terrain.cols)
    expect(Math.max(...cells.map((c) => c.h))).toBeCloseTo(AUTH.terrain.height)
    expect(Math.min(...cells.map((c) => c.h))).toBeGreaterThan(0)
  })

  it('frames the lifted scene, fitting the round plate across the stage', () => {
    const f = authFrame()
    expect(f.center[1]).toBe(HERO_ORIGIN[1] + AUTH.height / 2)
    expect(f.size[0]).toBe(f.size[2])
    // The plate's full diameter must still fit a wide stage at the solved zoom.
    const width = 620
    const zoom = fitZoom(f, width, 600)
    expect(AUTH.plate * 2 * zoom).toBeLessThanOrEqual(width)
  })
})

describe('not-found scene', () => {
  it('keeps the standing and fallen towers on the plate', () => {
    for (const b of lostStanding()) expect(reach(b)).toBeLessThanOrEqual(LOST.plate)
    const fallen = lostFallen()
    const halfLen = fallen.size[0] / 2
    expect(Math.hypot(fallen.position[0], fallen.position[2]) + halfLen).toBeLessThanOrEqual(
      LOST.plate
    )
    // Lying down: it rests on the plate, half its thickness up.
    expect(fallen.position[1]).toBe(fallen.size[1] / 2)
  })

  it('frames the smaller turntable', () => {
    const f = lostFrame()
    expect(LOST.plate * 2 * fitZoom(f, 420, 260)).toBeLessThanOrEqual(420)
  })
})
