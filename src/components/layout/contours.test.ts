import { contourPaths } from './contours'

describe('contourPaths', () => {
  const opts = { width: 1600, height: 1000, peaks: 3, rings: 4, seed: 7 }

  it('draws one closed loop per ring per peak', () => {
    const paths = contourPaths(opts)
    expect(paths).toHaveLength(12)
    for (const d of paths) {
      expect(d.startsWith('M')).toBe(true)
      expect(d.endsWith('Z')).toBe(true)
    }
  })

  it('is deterministic for a seed and changes with it', () => {
    expect(contourPaths(opts)).toEqual(contourPaths(opts))
    expect(contourPaths({ ...opts, seed: 8 })).not.toEqual(contourPaths(opts))
  })
})
