import { useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'

import { contourPaths } from './contours'

const VIEW = { width: 1600, height: 1000 }

/**
 * A faint topographic map behind every page: a few hills of contour lines in
 * the ink colour at a few percent opacity, drifting a little slower than the
 * page as it scrolls. Decorative only — no pointer events, hidden from
 * assistive tech, still under reduced motion.
 */
export function AmbientBackdrop({
  scrollerSelector = '.app-scroll',
}: {
  scrollerSelector?: string
}) {
  const ref = useRef<SVGSVGElement>(null)
  const still = useReducedMotion() ?? false
  const paths = useMemo(() => contourPaths({ ...VIEW, peaks: 4, rings: 9, seed: 1801 }), [])

  useEffect(() => {
    if (still) return
    const scroller = document.querySelector<HTMLElement>(scrollerSelector)
    const target: HTMLElement | Window = scroller ?? window
    let frame = 0
    const apply = () => {
      frame = 0
      const top = scroller ? scroller.scrollTop : window.scrollY
      if (ref.current) ref.current.style.transform = `translate3d(0, ${-top * 0.04}px, 0)`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      target.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [still, scrollerSelector])

  return (
    <div className="ambient-backdrop" aria-hidden="true">
      <svg
        ref={ref}
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((d, i) => (
          <path key={i} d={d} className={i % 9 === 8 ? 'is-index' : undefined} />
        ))}
      </svg>
    </div>
  )
}
