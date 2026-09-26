import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import type { WorldStation, WorldTip } from '@/components/world/types'
import { WorldPage } from '@/components/world/WorldPage'
import { formatCurrency } from '@/lib/format'

import type { TerrainCell, YearTerrain } from '../lib/yearTerrain'

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
} from './layout'
import type { Tower, TrendModel, VesselModel } from './stationData'
import { TerrainStation, TowersStation, TrendStation, VesselStation } from './stations'

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
 * Home as a 3D world: the month as a vessel, where it went as towers, the year
 * as a terrain and the trend as ribbons. See components/world/WorldPage for
 * how panels and stage fit together.
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
  const [pointerTip, setPointerTip] = useState<WorldTip | null>(null)

  const stations = useMemo<WorldStation[]>(
    () => [
      {
        name: 'The month',
        panel: panels[0],
        frame: vesselFrame(),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Out' },
          { swatch: 'bg-[var(--pos)] opacity-40', label: 'Saved' },
          { swatch: 'bg-[var(--neg)]', label: 'Past income' },
          { swatch: 'is-line bg-[var(--ink-4)]', label: 'Budget' },
          { swatch: 'is-line bg-[var(--accent)]', label: 'Expected by today' },
        ],
        hint: 'Scroll to move through the month, the year and the trend',
      },
      {
        name: 'Where it went',
        panel: panels[1],
        frame: towersFrame(towers.length),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Spent' },
          { swatch: 'bg-[var(--neg)]', label: 'Over budget' },
          { swatch: 'is-line bg-[var(--line-strong)]', label: 'Budget' },
          { swatch: 'is-line bg-[var(--accent)]', label: 'Expected by today' },
        ],
        hint: 'Hover a tower or a row · click to open the category',
      },
      {
        name: 'The year',
        panel: panels[2],
        frame: terrainFrame(terrain),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Spent' },
          { swatch: 'bg-[var(--neg)]', label: 'Over plan' },
          { swatch: 'bg-[var(--ink-4)] opacity-40', label: 'Projected' },
          { swatch: 'is-line bg-[var(--line-strong)]', label: 'Plan' },
          // The current month's pace ticks (terrain cells' paceAt).
          ...(terrain.currentCol !== null
            ? [{ swatch: 'is-line bg-[var(--accent)]', label: 'Expected by today' }]
            : []),
        ],
        hint: 'Hover a box · click to open that category and month',
      },
      {
        name: 'Trend',
        panel: panels[3],
        frame: trendFrame(trend.points.length),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Out' },
          { swatch: 'bg-[var(--accent)]', label: 'In' },
          { swatch: 'is-line bg-[var(--ink-4)]', label: 'Average out' },
        ],
        hint: 'Hover a month for its figures',
      },
    ],
    [panels, towers.length, terrain, trend.points.length]
  )

  const labels = useMemo(
    () => [...vesselLabels(vessel), ...terrainLabels(terrain), ...trendLabels(trend)],
    [vessel, terrain, trend]
  )
  const highlightTip = useMemo(() => {
    const i = highlight === null ? -1 : towers.findIndex((t) => t.category === highlight)
    return i >= 0 ? towerTip(towers, i) : null
  }, [highlight, towers])

  const onTowerHover = (i: number | null) => {
    onHighlight(i === null ? null : (towers[i]?.category ?? null))
    setPointerTip(null)
    document.body.style.cursor = i === null ? '' : 'pointer'
  }
  const onTerrainHover = (cell: TerrainCell | null) => {
    setPointerTip(cell ? terrainTip(terrain, cell) : null)
    document.body.style.cursor = cell?.linkable ? 'pointer' : ''
  }

  return (
    <WorldPage
      stations={stations}
      labels={labels}
      tip={pointerTip ?? highlightTip}
      isDark={isDark}
      railLabel="Home sections"
      srOnly={<TerrainTable terrain={terrain} />}
      renderScene={({ colors, reached, instant }) => (
        <>
          <VesselStation model={vessel} colors={colors} active={reached.has(0)} instant={instant} />
          <TowersStation
            towers={towers}
            colors={colors}
            active={reached.has(1)}
            instant={instant}
            highlight={highlight}
            onHover={onTowerHover}
            onPick={(t) =>
              navigate(`/c/${encodeURIComponent(t.category)}?year=${year}&month=${month}`)
            }
          />
          <TerrainStation
            terrain={terrain}
            colors={colors}
            active={reached.has(2)}
            instant={instant}
            onHover={onTerrainHover}
            onPick={(cell) =>
              navigate(
                `/c/${encodeURIComponent(cell.category)}?year=${year}&month=${cell.periodMonth}`
              )
            }
          />
          <TrendStation
            trend={trend}
            colors={colors}
            active={reached.has(3)}
            instant={instant}
            onHover={(i) => setPointerTip(i === null ? null : trendTip(trend, i))}
          />
        </>
      )}
    />
  )
}
