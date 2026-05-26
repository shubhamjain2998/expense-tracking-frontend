import { useEffect, useRef, useState } from 'react'

interface UseCountUpOptions {
  duration?: number
  /** Number of decimal places to keep while animating. Default 0 (integers). */
  decimals?: number
}

/**
 * Animate a numeric value from 0 → target over `duration` ms. Returns the
 * intermediate display value as a number. Respects `prefers-reduced-motion`
 * by jumping straight to the target.
 *
 * Pair with a formatter at the call site (currency, compact, etc.) — this
 * hook owns the *number*, not the rendering.
 */
export function useCountUp(
  target: number,
  { duration = 700, decimals = 0 }: UseCountUpOptions = {}
) {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Initial value lazily — for reduced-motion or non-finite targets, start
  // at the final value so we never need to setState synchronously inside an effect.
  const [value, setValue] = useState(() => (reduced || !Number.isFinite(target) ? target : 0))
  // Keep the previously-animated-to target around so we can animate from
  // there when `target` changes (e.g. month flips).
  const fromRef = useRef<number>(reduced ? target : 0)

  useEffect(() => {
    if (reduced || !Number.isFinite(target)) return
    const start = performance.now()
    const startVal = fromRef.current
    const delta = target - startVal
    let raf = 0
    const factor = Math.pow(10, decimals)

    function step(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = startVal + delta * eased
      setValue(Math.round(v * factor) / factor)
      if (t < 1) raf = requestAnimationFrame(step)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, decimals, reduced])

  return value
}
