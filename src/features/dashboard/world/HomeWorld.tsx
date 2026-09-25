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
import { useNavigate } from 'react-router-dom'

import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/format'

import type { TerrainCell, YearTerrain } from '../lib/yearTerrain'

import { progressFromCenters } from './cameraPath'
import {
  terrainFrame,
  terrainLabels,
  terrainTip,
  towersFrame,
  towerTip,
  trendFrame,
  trendLabels,
  trendTip,
  vesselFrame,
  vesselLabels,
  type WorldTip,
} from './layout'
import { readSceneColors } from './sceneColors'
import type { Tower, TrendModel, VesselModel } from './stationData'
import type { WorldMotion } from './WorldScene'

// three.js, fiber and drei are ~250 KB gzipped: fetched only when the world mounts.
const WorldScene = lazy(() => import('./WorldScene'))

const STATION_NAMES = ['The month', 'Where it went', 'The year', 'Trend'] as const

/** What each station's shapes mean, shown under the stage while it's in view. */
const LEGENDS: { swatch: string; label: string }[][] = [
  [
    { swatch: 'bg-[var(--ink)]', label: 'Out' },
    { swatch: 'bg-[var(--pos)] opacity-40', label: 'Saved' },
    { swatch: 'bg-[var(--neg)]', label: 'Past income' },
    { swatch: 'is-line bg-[var(--ink-4)]', label: 'Budget' },
    { swatch: 'is-line bg-[var(--accent)]', label: 'Expected by today' },
  ],
  [
    { swatch: 'bg-[var(--ink)]', label: 'Spent' },
    { swatch: 'bg-[var(--neg)]', label: 'Over budget' },
    { swatch: 'is-line bg-[var(--line-strong)]', label: 'Budget' },
    { swatch: 'is-line bg-[var(--accent)]', label: 'Expected by today' },
  ],
  [
    { swatch: 'bg-[var(--ink)]', label: 'Spent' },
    { swatch: 'bg-[var(--neg)]', label: 'Over plan' },
    { swatch: 'bg-[var(--ink-4)] opacity-40', label: 'Projected' },
    { swatch: 'is-line bg-[var(--line-strong)]', label: 'Plan' },
  ],
  [
    { swatch: 'bg-[var(--ink)]', label: 'Out' },
    { swatch: 'bg-[var(--accent)]', label: 'In' },
    { swatch: 'is-line bg-[var(--ink-4)]', label: 'Average out' },
  ],
]

const HINTS = [
  'Scroll to move through the month, the year and the trend',
  'Hover a tower or a row · click to open the category',
  'Hover a box · click to open that category and month',
  'Hover a month for its figures',
]

/** Screen-reader copy of the year terrain: the panel beside it is cumulative only. */
function TerrainTable({ terrain }: { terrain: YearTerrain }) {
  if (terrain.cells.length === 0) return null
  return (
    <div className="sr-only">
      <table>
        <caption>Spend by category and month</caption>
        <thead>
          <tr>
            <th>Category</th>
            {terrain.months.map((m) => (
              <th key={m.periodMonth}>{m.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {terrain.rows.map((r, row) => (
            <tr key={r.category}>
              <th>{r.category}</th>
              {terrain.months.map((m, col) => {
                const cell = terrain.cells.find((c) => c.row === row && c.col === col)
                return (
                  <td key={m.periodMonth}>
                    {cell && cell.amount > 0
                      ? `${formatCurrency(Math.round(cell.amount))}${cell.kind === 'projected' ? ' (projected)' : ''}`
                      : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

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

export interface HomeWorldProps {
  /** The four Home blocks, in station order. */
  panels: [ReactNode, ReactNode, ReactNode, ReactNode]
  vessel: VesselModel
  towers: Tower[]
  terrain: YearTerrain
  trend: TrendModel
  /** Category lit in both the towers and Where it went. */
  highlight: string | null
  onHighlight: (category: string | null) => void
  /** Selected period, carried into category links like Where it went's rows. */
  year: number
  month: number
  isDark: boolean
}

/**
 * Home as a 3D world. The four blocks stay as real DOM panels in a column;
 * beside them a sticky stage holds one scene, and scrolling the panels flies
 * the camera from station to station. Every figure the scene draws is in a
 * panel as text, so the page reads the same without the canvas.
 */
export function HomeWorld({
  panels,
  vessel,
  towers,
  terrain,
  trend,
  highlight,
  onHighlight,
  year,
  month,
  isDark,
}: HomeWorldProps) {
  const navigate = useNavigate()
  const instant = useReducedMotion() ?? false
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLElement | null)[]>([])
  const motion = useRef<WorldMotion>({ target: 0, current: 0, invalidate: () => {} })
  const getMotion = useCallback(() => motion.current, [])
  const [active, setActive] = useState(0)
  const [reached, setReached] = useState<ReadonlySet<number>>(() => new Set([0]))
  const [pointerTip, setPointerTip] = useState<WorldTip | null>(null)

  // Re-read the tokens when the theme flips; html.dark swaps the CSS vars.
  const colors = useMemo(() => readSceneColors(), [isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  const frames = useMemo(
    () => [
      vesselFrame(),
      towersFrame(towers.length),
      terrainFrame(terrain),
      trendFrame(trend.points.length),
    ],
    [towers.length, terrain, trend.points.length]
  )
  const labels = useMemo(
    () => [...vesselLabels(vessel), ...terrainLabels(terrain), ...trendLabels(trend)],
    [vessel, terrain, trend]
  )
  const highlightTip = useMemo(() => {
    const i = highlight === null ? -1 : towers.findIndex((t) => t.category === highlight)
    return i >= 0 ? towerTip(towers, i) : null
  }, [highlight, towers])
  const tip = pointerTip ?? highlightTip

  // Scroll → camera. Progress comes from where the panels sit relative to the
  // scroller's centre; the rig eases towards it.
  useEffect(() => {
    const scroller = scrollParent(rootRef.current)
    let frame = 0
    const measure = () => {
      frame = 0
      const view = scroller?.getBoundingClientRect() ?? {
        top: 0,
        height: window.innerHeight,
      }
      const centers = panelRefs.current.map((el) => {
        const r = el?.getBoundingClientRect()
        return r ? r.top + r.height / 2 : 0
      })
      const t = progressFromCenters(centers, view.top + view.height / 2)
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
  }, [])

  const goTo = (i: number) =>
    panelRefs.current[i]?.scrollIntoView({
      behavior: instant ? 'auto' : 'smooth',
      block: 'center',
    })

  const onTowerHover = (i: number | null) => {
    onHighlight(i === null ? null : (towers[i]?.category ?? null))
    setPointerTip(null)
    document.body.style.cursor = i === null ? '' : 'pointer'
  }
  const onTerrainHover = (cell: TerrainCell | null) => {
    setPointerTip(cell ? terrainTip(terrain, cell) : null)
    document.body.style.cursor = cell?.linkable ? 'pointer' : ''
  }
  const onTrendHover = (i: number | null) => setPointerTip(i === null ? null : trendTip(trend, i))

  return (
    <div ref={rootRef} className="home-world">
      <div className="world-panels">
        {panels.map((panel, i) => (
          <section
            key={STATION_NAMES[i]}
            ref={(el) => {
              panelRefs.current[i] = el
            }}
            className={['world-station', active === i ? 'is-active' : null]
              .filter(Boolean)
              .join(' ')}
            aria-label={STATION_NAMES[i]}
          >
            {panel}
          </section>
        ))}
        <TerrainTable terrain={terrain} />
      </div>

      <div className="world-stage-wrap">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <WorldScene
            frames={frames}
            labels={labels}
            tip={tip}
            motion={getMotion}
            reached={reached}
            instant={instant}
            colors={colors}
            vessel={vessel}
            towers={towers}
            terrain={terrain}
            trend={trend}
            highlight={highlight}
            onTowerHover={onTowerHover}
            onTowerPick={(t) =>
              navigate(`/c/${encodeURIComponent(t.category)}?year=${year}&month=${month}`)
            }
            onTerrainHover={onTerrainHover}
            onTerrainPick={(cell) =>
              navigate(
                `/c/${encodeURIComponent(cell.category)}?year=${year}&month=${cell.periodMonth}`
              )
            }
            onTrendHover={onTrendHover}
          />
        </Suspense>

        <p className="world-hint" aria-hidden="true">
          {HINTS[active]}
        </p>

        <nav className="world-rail" aria-label="Home sections">
          {STATION_NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              className={active === i ? 'on' : ''}
              aria-current={active === i ? 'true' : undefined}
              onClick={() => goTo(i)}
            >
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              {name}
            </button>
          ))}
        </nav>

        <div className="world-legend" aria-hidden="true">
          {LEGENDS[active]?.map((item) => (
            <span key={item.label}>
              <i className={item.swatch} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
