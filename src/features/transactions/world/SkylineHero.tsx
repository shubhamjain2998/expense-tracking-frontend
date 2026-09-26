import { useReducedMotion } from 'motion/react'
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/Skeleton'
import { readSceneColors } from '@/components/world/sceneColors'
import type { WorldTip } from '@/components/world/types'
import type { WorldMotion } from '@/components/world/WorldCanvas'
import { formatCurrency } from '@/lib/format'

import { skylineFrame, skylineLabels, skylineTip, type SkylineModel } from './skyline'
import './world.css'

// three.js, fiber and drei are ~250 KB gzipped: fetched only when the hero mounts.
const WorldCanvas = lazy(() => import('@/components/world/WorldCanvas'))
const SkylineStation = lazy(() => import('./SkylineStation'))

/** Screen-reader copy of the skyline: the table below lists rows, not day totals. */
function SkylineTable({ model, monthLabel }: { model: SkylineModel; monthLabel: string }) {
  return (
    <div className="sr-only">
      <table>
        <caption>Spend by day, {monthLabel}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Processed</th>
            <th>Pending</th>
            <th>Transactions</th>
          </tr>
        </thead>
        <tbody>
          {model.days
            .filter((d) => d.count > 0)
            .map((d) => (
              <tr key={d.day}>
                <th>{d.label}</th>
                <td>{formatCurrency(Math.round(d.processed))}</td>
                <td>{formatCurrency(Math.round(d.pending))}</td>
                <td>{d.count}</td>
              </tr>
            ))}
        </tbody>
        <tfoot>
          <tr>
            <th>Month</th>
            <td>{formatCurrency(Math.round(model.processed))}</td>
            <td>{formatCurrency(Math.round(model.pending))}</td>
            <td>{model.days.reduce((s, d) => s + d.count, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export interface SkylineHeroProps {
  model: SkylineModel | null
  /** "June 2026" — the rise-in replays when it changes. */
  monthLabel: string
  isDark: boolean
}

/**
 * A 3D band above the Transactions table: the selected month as a skyline of
 * days. One fixed station — the camera never moves — so it borrows the kit's
 * canvas and projector without WorldPage's scroll machinery. Mounted only
 * when `useWorldSupported()` is true; the flat page has nothing here.
 */
export function SkylineHero({ model, monthLabel, isDark }: SkylineHeroProps) {
  const instant = useReducedMotion() ?? false
  const motion = useRef<WorldMotion>({ target: 0, current: 0, invalidate: () => {} })
  const getMotion = useCallback(() => motion.current, [])
  const [hovered, setHovered] = useState<number | null>(null)

  // Re-read the tokens when the theme flips; html.dark swaps the CSS vars.
  const colors = useMemo(() => readSceneColors(), [isDark]) // eslint-disable-line react-hooks/exhaustive-deps
  const frames = useMemo(() => [skylineFrame()], [])
  const labels = useMemo(() => (model ? skylineLabels(model) : []), [model])
  const tip: WorldTip | null = model && hovered !== null ? skylineTip(model, hovered) : null

  if (model && model.max === 0) return null

  return (
    <section className="txn-hero" aria-label={`Spend by day, ${monthLabel}`}>
      {model ? (
        <>
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <WorldCanvas
              frames={frames}
              labels={labels}
              tip={tip}
              motion={getMotion}
              instant={instant}
              colors={colors}
            >
              <Suspense fallback={null}>
                <SkylineStation
                  model={model}
                  riseKey={monthLabel}
                  colors={colors}
                  instant={instant}
                  onHover={setHovered}
                />
              </Suspense>
            </WorldCanvas>
          </Suspense>
          <p className="world-hint" aria-hidden="true">
            {monthLabel} by day · hover a day for its totals
          </p>
          <div className="world-legend" aria-hidden="true">
            <span>
              <i className="bg-[var(--ink)]" />
              Processed {formatCurrency(Math.round(model.processed))}
            </span>
            <span>
              <i className="bg-[var(--accent)]" />
              Pending {formatCurrency(Math.round(model.pending))}
            </span>
          </div>
          <SkylineTable model={model} monthLabel={monthLabel} />
        </>
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </section>
  )
}
