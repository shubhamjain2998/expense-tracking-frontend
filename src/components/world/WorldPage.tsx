import { useReducedMotion } from 'motion/react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { Skeleton } from '@/components/ui/Skeleton'

import { panelAnchor, progressFromCenters } from './cameraPath'
import { readSceneColors } from './sceneColors'
import type { SceneContext, WorldLabel, WorldStation, WorldTip } from './types'
import type { WorldMotion } from './WorldCanvas'

// three.js, fiber and drei are ~250 KB gzipped: fetched only when a world mounts.
const WorldCanvas = lazy(() => import('./WorldCanvas'))

/** The nearest ancestor that scrolls — `main.app-scroll` in the app shell. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

export interface WorldPageProps {
  stations: WorldStation[]
  labels: WorldLabel[]
  tip: WorldTip | null
  isDark: boolean
  /** The page's station meshes, given the shared colours and rise-in state. */
  renderScene: (ctx: SceneContext) => ReactNode
  /** Screen-reader copies of anything the stage shows that no panel does. */
  srOnly?: ReactNode
  /** Accessible name for the section rail. */
  railLabel: string
}

/**
 * A page as a 3D world. The page's blocks stay real DOM panels in a column;
 * beside them a sticky stage holds one scene, and scrolling the panels flies
 * the camera from station to station. Every figure the scene draws is in a
 * panel as text, so the page reads the same without the canvas.
 *
 * Pages mount this only when `useWorldSupported()` is true and render their
 * flat layout otherwise.
 */
export function WorldPage({
  stations,
  labels,
  tip,
  isDark,
  renderScene,
  srOnly,
  railLabel,
}: WorldPageProps) {
  const instant = useReducedMotion() ?? false
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLElement | null)[]>([])
  const motion = useRef<WorldMotion>({ target: 0, current: 0, invalidate: () => {} })
  const getMotion = useCallback(() => motion.current, [])
  const [active, setActive] = useState(0)
  const [reached, setReached] = useState<ReadonlySet<number>>(() => new Set([0]))

  // Re-read the tokens when the theme flips; html.dark swaps the CSS vars.
  const colors = useMemo(() => readSceneColors(), [isDark]) // eslint-disable-line react-hooks/exhaustive-deps
  const frames = useMemo(() => stations.map((s) => s.frame), [stations])

  // Scroll → camera. Progress comes from where the panels sit relative to the
  // scroller's centre; the rig eases towards it.
  useEffect(() => {
    const scroller = scrollParent(rootRef.current)
    let frame = 0
    const measure = () => {
      frame = 0
      const view = scroller?.getBoundingClientRect() ?? { top: 0, height: window.innerHeight }
      const viewCenter = view.top + view.height / 2
      const centers = panelRefs.current.map((el) => {
        const r = el?.getBoundingClientRect()
        return r ? panelAnchor(r.top, r.height, viewCenter, view.height) : 0
      })
      const t = progressFromCenters(centers, viewCenter)
      motion.current.target = t
      motion.current.invalidate()
      const now = Math.round(t)
      setActive(now)
      setReached((prev) => (prev.has(now) ? prev : new Set([...prev, now])))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    const target: HTMLElement | Window = scroller ?? window
    target.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      target.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [stations.length])

  // A panel taller than the scroller opens at its top (where the camera
  // already holds its station, see panelAnchor), not halfway down it.
  const goTo = (i: number) => {
    const el = panelRefs.current[i]
    if (!el) return
    const viewHeight = scrollParent(rootRef.current)?.clientHeight ?? window.innerHeight
    el.scrollIntoView({
      behavior: instant ? 'auto' : 'smooth',
      block: el.offsetHeight > viewHeight ? 'start' : 'center',
    })
  }

  const current = stations[active]

  return (
    <div ref={rootRef} className="world-page">
      <div className="world-panels">
        {stations.map((station, i) => (
          <section
            key={station.name}
            ref={(el) => {
              panelRefs.current[i] = el
            }}
            className={['world-station', active === i ? 'is-active' : null]
              .filter(Boolean)
              .join(' ')}
            aria-label={station.name}
          >
            {station.panel}
          </section>
        ))}
        {srOnly}
      </div>

      <div className="world-stage-wrap">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <WorldCanvas
            frames={frames}
            labels={labels}
            tip={tip}
            motion={getMotion}
            instant={instant}
            colors={colors}
          >
            {renderScene({ colors, reached, instant })}
          </WorldCanvas>
        </Suspense>

        {current && (
          <p className="world-hint" aria-hidden="true">
            {current.hint}
          </p>
        )}

        {stations.length > 1 && (
          <nav className="world-rail" aria-label={railLabel}>
            {stations.map((station, i) => (
              <button
                key={station.name}
                type="button"
                className={active === i ? 'on' : ''}
                aria-current={active === i ? 'true' : undefined}
                onClick={() => goTo(i)}
              >
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                {station.name}
              </button>
            ))}
          </nav>
        )}

        {current && (
          <div className="world-legend" aria-hidden="true">
            {current.legend.map((item) => (
              <span key={item.label}>
                <i className={item.swatch} />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
