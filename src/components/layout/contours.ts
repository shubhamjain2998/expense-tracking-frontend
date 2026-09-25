/**
 * Contour lines for the app backdrop — a quiet topographic map, as if the
 * ledger's money had terrain. Pure and seeded, so the drawing is identical on
 * every load and in tests; the component only renders the paths.
 */

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface ContourOptions {
  width: number
  height: number
  /** Hills on the map; each gets its own set of rings. */
  peaks: number
  /** Rings per hill. */
  rings: number
  seed: number
}

/**
 * SVG path data, one closed loop per ring. Each hill's rings share a wobble
 * (a few low-frequency sine terms) that grows with the ring's radius, so the
 * loops nest without crossing, like real contours.
 */
export function contourPaths({ width, height, peaks, rings, seed }: ContourOptions): string[] {
  const rand = rng(seed)
  const paths: string[] = []
  const steps = 96
  for (let p = 0; p < peaks; p++) {
    const cx = width * (0.15 + rand() * 0.7)
    const cy = height * (0.15 + rand() * 0.7)
    const base = Math.min(width, height) * (0.03 + rand() * 0.03)
    const gap = Math.min(width, height) * (0.028 + rand() * 0.018)
    const terms = Array.from({ length: 3 }, (_, k) => ({
      freq: k + 2,
      amp: 0.06 + rand() * 0.1,
      phase: rand() * Math.PI * 2,
    }))
    const stretch = 0.75 + rand() * 0.5
    for (let r = 0; r < rings; r++) {
      const radius = base + r * gap
      let d = ''
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2
        const wobble = terms.reduce((s, t) => s + t.amp * Math.sin(t.freq * a + t.phase), 0)
        const rr = radius * (1 + wobble)
        const x = cx + Math.cos(a) * rr * stretch
        const y = cy + Math.sin(a) * rr
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
      }
      paths.push(`${d}Z`)
    }
  }
  return paths
}
