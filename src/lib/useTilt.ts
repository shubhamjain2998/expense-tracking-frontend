import { useCallback, useEffect, useRef, useState } from 'react'

interface TiltOptions {
  /** Peak rotation at the far edge, in degrees. Above ~8 it stops reading as
   *  a lit surface and starts reading as a card flip. */
  max?: number
  /** Set false to keep the pointer-tracked sheen but drop the rotation —
   *  used for wide blocks, where even 4deg of rotateY throws the far edge
   *  several hundred pixels and the text skews visibly. */
  rotate?: boolean
}

/**
 * Pointer-tracked 3D tilt + specular highlight.
 *
 * Writes four custom properties on the host element, all of which have flat
 * defaults in `src/styles/depth.css`, so the surface renders correctly if
 * this hook never runs (no JS, SSR, reduced motion):
 *
 *   --tilt-rx / --tilt-ry  rotation, degrees
 *   --tilt-mx / --tilt-my  highlight centre, percent of the box
 *   --tilt-lit             highlight opacity, 0 on leave
 *
 * Updates are written inside rAF and only when a frame isn't already
 * pending, so a 1000Hz mouse still costs one style write per frame.
 * Coarse pointers (no hover) are skipped outright — there is no cursor to
 * track, and the listener would only fire mid-scroll.
 *
 * `ref` is a callback ref rather than a `RefObject` on purpose: the node is
 * only ever read from an event handler, and returning a RefObject makes
 * react-hooks/refs treat the whole returned object as a ref and reject every
 * property read at the call site.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>({
  max = 5,
  rotate = true,
}: TiltOptions = {}) {
  const node = useRef<T | null>(null)
  const frame = useRef<number | null>(null)
  const [enabled, setEnabled] = useState(false)

  const ref = useCallback((el: T | null) => {
    node.current = el
  }, [])

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setEnabled(fine.matches && !still.matches)
    sync()
    fine.addEventListener('change', sync)
    still.addEventListener('change', sync)
    return () => {
      fine.removeEventListener('change', sync)
      still.removeEventListener('change', sync)
    }
  }, [])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    []
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      const el = node.current
      if (!enabled || !el || frame.current !== null) return
      const { clientX, clientY } = e
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        // -0.5 … 0.5 from the centre of the box.
        const x = (clientX - r.left) / r.width - 0.5
        const y = (clientY - r.top) / r.height - 0.5
        if (rotate) {
          // rotateX is inverted: pointer below centre tips the top toward
          // the viewer, which is the direction a real hinged panel moves.
          el.style.setProperty('--tilt-rx', `${(-y * max).toFixed(2)}deg`)
          el.style.setProperty('--tilt-ry', `${(x * max).toFixed(2)}deg`)
        }
        el.style.setProperty('--tilt-mx', `${((x + 0.5) * 100).toFixed(1)}%`)
        el.style.setProperty('--tilt-my', `${((y + 0.5) * 100).toFixed(1)}%`)
        el.style.setProperty('--tilt-lit', '1')
      })
    },
    [enabled, max, rotate]
  )

  const onPointerLeave = useCallback(() => {
    const el = node.current
    if (!el) return
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    el.style.setProperty('--tilt-rx', '0deg')
    el.style.setProperty('--tilt-ry', '0deg')
    el.style.setProperty('--tilt-lit', '0')
  }, [])

  return { ref, onPointerMove, onPointerLeave }
}
