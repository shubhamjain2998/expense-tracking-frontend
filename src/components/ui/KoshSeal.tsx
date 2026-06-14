/**
 * KoshSeal — an engraved "treasury seal" medallion: concentric rings, a ticked
 * bezel, an inner guilloché rosette (the spirograph line-work printed on
 * banknotes), and the कोश wordmark. Pure geometry, computed once at module
 * load. Inherits colour via `currentColor`; faintness is controlled by the
 * consumer (container opacity). Decorative — always aria-hidden.
 *
 * Used as a faint rotating backdrop on the auth pages and, spun faster, as the
 * app's loading indicator (see KoshSpinner).
 */
const TAU = Math.PI * 2
const C = 120 // centre of the 240×240 viewBox

function rosePath(amp: number, k: number, steps = 720): string {
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU
    const r = amp * Math.cos(k * t)
    const x = C + r * Math.cos(t)
    const y = C + r * Math.sin(t)
    d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  }
  return `${d}Z`
}

const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * TAU
  const r1 = 98
  const r2 = i % 6 === 0 ? 84 : 91 // longer mark every 30°
  return {
    x1: (C + r1 * Math.cos(a)).toFixed(1),
    y1: (C + r1 * Math.sin(a)).toFixed(1),
    x2: (C + r2 * Math.cos(a)).toFixed(1),
    y2: (C + r2 * Math.sin(a)).toFixed(1),
  }
})

const ROSE = rosePath(64, 9)

interface KoshSealProps {
  size?: number
  className?: string
}

export function KoshSeal({ size = 120, className }: KoshSealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle cx={C} cy={C} r={112} stroke="currentColor" strokeOpacity={0.6} strokeWidth={1.4} />
      <circle cx={C} cy={C} r={98} stroke="currentColor" strokeOpacity={0.45} strokeWidth={0.9} />
      {TICKS.map((t, i) => (
        <line key={i} {...t} stroke="currentColor" strokeOpacity={0.5} strokeWidth={0.9} />
      ))}
      <path d={ROSE} stroke="currentColor" strokeOpacity={0.55} strokeWidth={0.8} />
      <text
        x={C}
        y={C + 18}
        textAnchor="middle"
        fill="currentColor"
        fillOpacity={0.9}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={54}
        fontWeight={700}
      >
        कोश
      </text>
    </svg>
  )
}
