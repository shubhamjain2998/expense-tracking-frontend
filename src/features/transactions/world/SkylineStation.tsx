import { useMemo } from 'react'

import { InstancedBoxes, type BoxItem } from '@/components/world/primitives'
import type { SceneColors } from '@/components/world/sceneColors'
import { useGrow } from '@/components/world/useGrow'

import { dayHeight, dayStep, dayX, SKYLINE, type SkylineModel } from './skyline'

/**
 * The month's days as columns: processed spend in ink, pending spend stacked
 * on top in the accent, and a thin tile under every day so empty days still
 * read (and hover) as days. Lazy-loaded with the canvas, so three.js stays
 * out of the page's own chunk.
 */
export default function SkylineStation({
  model,
  riseKey,
  colors,
  instant,
  onHover,
}: {
  model: SkylineModel
  /** The rise-in replays only when this changes (the month), not on every edit. */
  riseKey: string
  colors: SceneColors
  instant: boolean
  onHover: (dayIndex: number | null) => void
}) {
  const grow = useGrow(true, riseKey, instant)
  const n = model.days.length
  const w = dayStep(n) * SKYLINE.fill

  const { tiles, processed, pending } = useMemo(() => {
    const at = (i: number, y: number, h: number, color: string, pad = 0): BoxItem => ({
      x: dayX(i, n),
      z: SKYLINE.z,
      y,
      h,
      w: w + pad,
      d: SKYLINE.depth + pad,
      color,
    })
    const withProcessed = model.days.flatMap((d, i) => (d.processed > 0 ? [i] : []))
    const withPending = model.days.flatMap((d, i) => (d.pending > 0 ? [i] : []))
    return {
      tiles: model.days.map((_, i) => at(i, 0, SKYLINE.tile, colors.line, 0.08)),
      processed: {
        index: withProcessed,
        items: withProcessed.map((i) =>
          at(i, SKYLINE.tile, dayHeight(model, model.days[i].processed), colors.ink)
        ),
      },
      pending: {
        index: withPending,
        items: withPending.map((i) => {
          const d = model.days[i]
          return at(
            i,
            SKYLINE.tile + dayHeight(model, d.processed),
            dayHeight(model, d.pending),
            colors.accent
          )
        }),
      },
    }
  }, [model, n, w, colors])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[SKYLINE.centerX, -0.001, SKYLINE.z]}>
        <planeGeometry args={[SKYLINE.span + 0.6, SKYLINE.depth + 1.2]} />
        <meshBasicMaterial color={colors.surface2} />
      </mesh>
      <InstancedBoxes items={tiles} grow={grow} onHover={onHover} />
      <InstancedBoxes
        items={processed.items}
        grow={grow}
        onHover={(i) => onHover(i === null ? null : (processed.index[i] ?? null))}
      />
      <InstancedBoxes
        items={pending.items}
        grow={grow}
        onHover={(i) => onHover(i === null ? null : (pending.index[i] ?? null))}
      />
    </group>
  )
}
