import {
  cameraAt,
  fitZoom,
  panelAnchor,
  progressFromCenters,
  type StationFrame,
} from './cameraPath'

const A: StationFrame = { center: [0, 1, 0], size: [10, 2, 2], view: [0, 0, 1] }
const B: StationFrame = { center: [40, 3, 0], size: [4, 4, 4], view: [1, 0, 0] }

describe('cameraPath', () => {
  it('fits the wider of the two projected extents', () => {
    // Looking straight down z: a 10×2 face in a 1000×1000 stage fills width.
    expect(fitZoom(A, 1000, 1000)).toBeCloseTo((1000 * 0.84) / 10)
    // In a short stage the height binds instead.
    expect(fitZoom(A, 1000, 100)).toBeCloseTo((100 * 0.84) / 2)
  })

  it('sits on each station at whole t and blends between', () => {
    const at0 = cameraAt(0, [A, B], 800, 600)
    expect(at0.target).toEqual([0, 1, 0])
    expect(at0.position[2]).toBeCloseTo(40)

    const at1 = cameraAt(1, [A, B], 800, 600)
    expect(at1.target).toEqual([40, 3, 0])
    expect(at1.position[0]).toBeCloseTo(80)

    const mid = cameraAt(0.5, [A, B], 800, 600)
    expect(mid.target).toEqual([20, 2, 0])
    expect(mid.zoom).toBeGreaterThan(Math.min(at0.zoom, at1.zoom))
    expect(mid.zoom).toBeLessThan(Math.max(at0.zoom, at1.zoom))
  })

  it('clamps t past either end', () => {
    expect(cameraAt(-3, [A, B], 800, 600).target).toEqual(A.center)
    expect(cameraAt(9, [A, B], 800, 600).target).toEqual(B.center)
  })

  it('reads progress from where the panels sit', () => {
    const centers = [100, 300, 700]
    expect(progressFromCenters(centers, 50)).toBe(0)
    expect(progressFromCenters(centers, 200)).toBe(0.5)
    expect(progressFromCenters(centers, 500)).toBe(1.5)
    expect(progressFromCenters(centers, 900)).toBe(2)
    expect(progressFromCenters([], 10)).toBe(0)
  })

  it('holds a panel taller than the viewport on its station while it fills the view', () => {
    // Fits: the centre, wherever the viewport is.
    expect(panelAnchor(100, 400, 900, 800)).toBe(300)
    // Tall (1600 in an 800 view): its top in view pins the anchor to top + half…
    expect(panelAnchor(100, 1600, 400, 800)).toBe(500)
    // …while it fills the view, the anchor is the viewport's centre…
    expect(panelAnchor(-300, 1600, 400, 800)).toBe(400)
    // …and once its bottom shows, bottom - half.
    expect(panelAnchor(-1400, 1600, 400, 800)).toBe(-200)
  })
})
