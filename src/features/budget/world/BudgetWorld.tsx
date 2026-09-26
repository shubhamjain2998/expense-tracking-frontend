import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import type { WorldStation } from '@/components/world/types'
import { WorldPage } from '@/components/world/WorldPage'
import { formatCurrency } from '@/lib/format'

import {
  budgetStations,
  inflowFrame,
  inflowLabels,
  inflowTip,
  looseFrame,
  looseLabels,
  looseTip,
  planFrame,
  vesselTip,
  yearFrame,
  yearLabels,
} from './layout'
import type {
  InflowModel,
  LooseBlock,
  PeriodView,
  PlanVessel,
  YearVesselModel,
} from './stationData'
import { InflowStation, PlanStation, YearStation } from './stations'

const money = (n: number) => formatCurrency(Math.round(n))

/**
 * Screen-reader copy of what the stage adds to the panels: the pace marks,
 * the year-end projection and, in the annual view, unplanned spend so far.
 */
function BudgetWorldTable({
  year,
  vessels,
  blocks,
  view,
}: {
  year: YearVesselModel
  vessels: PlanVessel[]
  blocks: LooseBlock[]
  view: PeriodView
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>The year</caption>
        <tbody>
          <tr>
            <th>Spent so far</th>
            <td>{money(year.spent)}</td>
          </tr>
          <tr>
            <th>Plan</th>
            <td>{money(year.plan)}</td>
          </tr>
          {year.pace !== null && (
            <tr>
              <th>Expected by now</th>
              <td>{money(year.pace)}</td>
            </tr>
          )}
          {year.projected !== null && (
            <tr>
              <th>Year-end at this rate</th>
              <td>{money(year.projected)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {vessels.length > 0 && (
        <table>
          <caption>The plan, {view === 'monthly' ? 'this month' : 'this year'}</caption>
          <thead>
            <tr>
              <th>Category</th>
              <th>Plan</th>
              <th>Spent</th>
              <th>Expected by today</th>
            </tr>
          </thead>
          <tbody>
            {vessels.map((v) => (
              <tr key={v.key}>
                <th>{v.name}</th>
                <td>{money(v.plan)}</td>
                <td>{money(v.spent)}</td>
                <td>{v.pace !== null ? money(v.pace) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {blocks.length > 0 && (
        <table>
          <caption>Outside the plan, {view === 'monthly' ? 'this month' : 'this year'}</caption>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.key}>
                <th>{b.name}</th>
                <td>{money(b.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export interface BudgetWorldProps {
  panels: { year: ReactNode; plan: ReactNode; outside: ReactNode | null; income: ReactNode }
  yearVessel: YearVesselModel
  vessels: PlanVessel[]
  blocks: LooseBlock[]
  /** Shared height scale of the vessels and the loose blocks. */
  planMax: number
  inflow: InflowModel
  view: PeriodView
  /** Category id lit in the scene and in the panel rows. */
  highlight: string | null
  onHighlight: (key: string | null) => void
  /** Selected period, carried into category links like Home's. */
  year: number
  month: number
  isDark: boolean
}

/**
 * Budget as a 3D world: the year as one large vessel, the plan as a row of
 * glass vessels, unplanned spend as loose blocks set down off the plan's
 * plate, and expected income as inflow columns. See
 * components/world/WorldPage for how panels and stage fit together.
 */
export function BudgetWorld({
  panels,
  yearVessel,
  vessels,
  blocks,
  planMax,
  inflow,
  view,
  highlight,
  onHighlight,
  year,
  month,
  isDark,
}: BudgetWorldProps) {
  const navigate = useNavigate()
  const hasOutside = panels.outside !== null && blocks.length > 0
  const at = budgetStations(hasOutside)
  const n = vessels.length

  const stations = useMemo<WorldStation[]>(() => {
    const list: WorldStation[] = [
      {
        name: 'The year',
        panel: panels.year,
        frame: yearFrame(),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Spent' },
          { swatch: 'bg-[var(--neg)]', label: 'Past the plan' },
          { swatch: 'is-line bg-[var(--line-strong)]', label: 'Plan (rim)' },
          { swatch: 'is-line bg-[var(--accent)]', label: 'Expected by now' },
          { swatch: 'is-line bg-[var(--ink-4)]', label: 'At this rate' },
        ],
        hint: 'Scroll to move through the year, the plan and income',
      },
      {
        name: 'The plan',
        panel: panels.plan,
        frame: planFrame(n),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Spent' },
          { swatch: 'bg-[var(--neg)]', label: 'Over plan' },
          { swatch: 'is-line bg-[var(--line-strong)]', label: 'Plan (rim)' },
          { swatch: 'is-line bg-[var(--accent)]', label: 'Expected by today' },
        ],
        hint: 'Hover a vessel or a row · click to open the category',
      },
    ]
    if (hasOutside) {
      list.push({
        name: 'Outside the plan',
        panel: panels.outside,
        frame: looseFrame(blocks, n, planMax),
        legend: [
          { swatch: 'bg-[var(--ink-4)]', label: 'Spend with no plan line' },
          { swatch: 'bg-[var(--surface-2)]', label: 'The plan' },
        ],
        hint: 'Hover a block or a row · click to open the category',
      })
    }
    list.push({
      name: 'Expected income',
      panel: panels.income,
      frame: inflowFrame(inflow.columns.length),
      legend: [
        { swatch: 'bg-[var(--accent)]', label: 'Received' },
        { swatch: 'is-line bg-[var(--line-strong)]', label: 'Expected per month' },
      ],
      hint: 'Hover a column or a row for its figures',
    })
    return list
  }, [panels, n, hasOutside, blocks, planMax, inflow.columns.length])

  const labels = useMemo(
    () => [
      ...yearLabels(yearVessel, at.year),
      ...(at.outside !== null ? looseLabels(blocks, n, at.outside) : []),
      ...inflowLabels(inflow, at.income),
    ],
    [yearVessel, blocks, n, inflow, at.year, at.outside, at.income]
  )

  // The lit row's tip, whichever station it belongs to.
  const highlightTip = useMemo(() => {
    if (highlight === null) return null
    const v = vessels.findIndex((x) => x.key === highlight)
    if (v >= 0) return vesselTip(vessels, v, planMax, view, at.plan)
    const b = blocks.findIndex((x) => x.key === highlight)
    if (b >= 0 && at.outside !== null) {
      return looseTip(blocks, b, n, planMax, view, at.outside)
    }
    const c = inflow.columns.findIndex((x) => x.key === highlight)
    if (c >= 0) return inflowTip(inflow, c, at.income)
    return null
  }, [highlight, vessels, blocks, inflow, n, planMax, view, at.plan, at.outside, at.income])

  // Every hover in the scene is a row's hover too, so the tip follows the
  // highlight rather than the pointer.
  const onHover = (key: string | null) => {
    onHighlight(key)
    document.body.style.cursor = key === null ? '' : 'pointer'
  }
  const onInflowHover = (key: string | null) => {
    onHighlight(key)
    document.body.style.cursor = ''
  }

  return (
    <div className="budget-world">
      <WorldPage
        stations={stations}
        labels={labels}
        tip={highlightTip}
        isDark={isDark}
        railLabel="Budget sections"
        srOnly={
          <BudgetWorldTable year={yearVessel} vessels={vessels} blocks={blocks} view={view} />
        }
        renderScene={({ colors, reached, instant }) => (
          <>
            <YearStation
              model={yearVessel}
              colors={colors}
              active={reached.has(at.year)}
              instant={instant}
            />
            <PlanStation
              vessels={vessels}
              blocks={hasOutside ? blocks : []}
              max={planMax}
              colors={colors}
              active={reached.has(at.plan) || (at.outside !== null && reached.has(at.outside))}
              instant={instant}
              highlight={highlight}
              onHover={onHover}
              onPick={(name) =>
                navigate(`/c/${encodeURIComponent(name)}?year=${year}&month=${month}`)
              }
            />
            <InflowStation
              model={inflow}
              colors={colors}
              active={reached.has(at.income)}
              instant={instant}
              highlight={highlight}
              onHover={onInflowHover}
            />
          </>
        )}
      />
    </div>
  )
}
