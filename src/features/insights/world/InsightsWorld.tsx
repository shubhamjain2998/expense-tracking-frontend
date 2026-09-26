import { useMemo, useState, type ReactNode } from 'react'

import type { LegendItem, WorldStation, WorldTip } from '@/components/world/types'
import { WorldPage } from '@/components/world/WorldPage'
import { formatCurrency } from '@/lib/format'

import type { RunViewParts } from '../components/InsightsRunView'
import type { InsightsPayload } from '../lib/insightsResponseSchema'

import {
  beamLabels,
  beamsFrame,
  beamTip,
  platesFrame,
  plateTip,
  ringFrame,
  ringLabels,
  ringTip,
  slabLabels,
  slabsFrame,
  slabTip,
  tokenLabels,
  tokensFrame,
  tokenTip,
} from './layout'
import {
  buildMetricTokens,
  buildPlates,
  buildSlabs,
  monthName,
  type BeamModel,
  type MonthRing,
} from './stationData'
import { BeamsStation, PlatesStation, RingStation, SlabsStation, TokensStation } from './stations'
import './world.css'

/** Screen-reader copy of the month rings: no panel lists the prompt's months. */
function RingTable({ ring }: { ring: MonthRing }) {
  if (ring.months.length === 0) return null
  return (
    <div className="sr-only">
      <table>
        <caption>What went out and came in, each month your prompt covers</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Spent</th>
            <th>In</th>
          </tr>
        </thead>
        <tbody>
          {ring.months.map((m) => (
            <tr key={m.key}>
              <th>
                {monthName(m.calMonth)} {m.year}
              </th>
              <td>{formatCurrency(Math.round(m.spent))}</td>
              <td>{m.income > 0 ? formatCurrency(Math.round(m.income)) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// The ledger only tracks what's owed to you, so only that weight is drawn.
const PEOPLE_LEGEND: LegendItem[] = [
  { swatch: 'bg-[var(--pos)]', label: 'They owe you' },
  { swatch: 'bg-[var(--accent)]', label: 'Selected' },
]

export interface InsightsWorldProps {
  /** The page's eyebrow and lede, shown atop the first panel. */
  intro: ReactNode
  /** A saved run on screen: its blocks become the first panels. */
  run: { payload: InsightsPayload; parts: RunViewParts } | null
  /** No run, or regenerating: the prompt workflow and what it reads. */
  prompt: { panel: ReactNode; ring: MonthRing } | null
  people: { panel: ReactNode; beams: BeamModel }
  /** Finding lit in the slabs, the stake bars and the findings list. */
  hotFinding: string | null
  onHotFinding: (id: string | null) => void
  hotPattern: string | null
  onHotPattern: (id: string | null) => void
  hotPerson: string | null
  onHotPerson: (person: string | null) => void
  isDark: boolean
}

/**
 * Insights as a 3D world. With a saved run: the metrics as tokens, the
 * findings as slabs sized by what each is worth a year, the patterns as a
 * stack, and the people ledger as balance beams. Without one: the months the
 * prompt reads as rings, then the beams. See components/world/WorldPage for
 * how panels and stage fit together.
 */
export function InsightsWorld({
  intro,
  run,
  prompt,
  people,
  hotFinding,
  onHotFinding,
  hotPattern,
  onHotPattern,
  hotPerson,
  onHotPerson,
  isDark,
}: InsightsWorldProps) {
  const [pointerTip, setPointerTip] = useState<WorldTip | null>(null)

  const payload = run?.payload ?? null
  const tokens = useMemo(() => buildMetricTokens(payload?.metrics ?? []), [payload])
  const slabs = useMemo(() => buildSlabs(payload?.findings ?? []), [payload])
  const plates = useMemo(() => buildPlates(payload?.patterns ?? []), [payload])
  const ring = prompt?.ring ?? null
  const hasFurther = !!run?.parts.further

  // Where each station sits; the two shapes of the page have different sets.
  const at = run
    ? { verdict: 0, stake: 1, further: hasFurther ? 2 : -1, people: hasFurther ? 3 : 2, data: -1 }
    : { verdict: -1, stake: -1, further: -1, people: 1, data: 0 }

  const panels = run?.parts
  const stations = useMemo<WorldStation[]>(() => {
    const out: WorldStation[] = []
    if (panels) {
      out.push({
        name: 'Verdict',
        panel: (
          <div className="space-y-6">
            {intro}
            {panels.head}
          </div>
        ),
        frame: tokensFrame(0, tokens.length),
        legend: [
          { swatch: 'bg-[var(--pos)]', label: 'Good news' },
          { swatch: 'bg-[var(--neg)]', label: 'Bad news' },
          { swatch: 'bg-[var(--ink-4)]', label: 'Neutral' },
        ],
        hint: 'One token per metric, pointing the way it moved · hover for its reading',
      })
      out.push({
        name: 'At stake',
        panel: panels.findings,
        frame: slabsFrame(1, slabs.slabs.length),
        legend: [
          { swatch: 'bg-[var(--neg)]', label: 'Needs attention' },
          { swatch: 'bg-[var(--pos)]', label: 'Going well' },
          { swatch: 'bg-[var(--ink)]', label: 'For information' },
          { swatch: 'bg-[var(--accent)]', label: 'Selected' },
        ],
        hint: 'Height is what a finding is worth a year · hover a slab or row, click to read it',
      })
      if (panels.further) {
        out.push({
          name: 'Patterns',
          panel: panels.further,
          frame: platesFrame(2, plates.length),
          legend: [
            { swatch: 'bg-[var(--ink-4)]', label: 'Pattern' },
            { swatch: 'bg-[var(--ink)]', label: 'Open' },
            { swatch: 'bg-[var(--accent)]', label: 'Selected' },
          ],
          hint:
            plates.length > 0
              ? 'One plate per pattern · hover a plate or row, click to open it'
              : 'The rest of what your LLM sent',
        })
      }
    } else if (prompt) {
      out.push({
        name: 'Your data',
        panel: (
          <div className="space-y-6">
            {intro}
            {prompt.panel}
          </div>
        ),
        frame: ringFrame(0),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Spent, last 12 months' },
          { swatch: 'bg-[var(--ink-4)]', label: 'The year before' },
          { swatch: 'bg-[var(--neg)]', label: 'More out than in' },
          { swatch: 'is-line bg-[var(--accent)]', label: 'Came in' },
        ],
        hint: 'The months your prompt reads, a year apart on each spoke · hover a column',
      })
    }
    out.push({
      name: 'People',
      panel: people.panel,
      frame: beamsFrame(out.length, people.beams.beams.length),
      legend: PEOPLE_LEGEND,
      hint: 'Each beam tips towards who owes whom · hover a beam or a row',
    })
    return out
  }, [panels, prompt, intro, people, tokens.length, slabs.slabs.length, plates.length])

  const labels = useMemo(
    () => [
      ...(run ? tokenLabels(at.verdict, tokens) : []),
      ...(run ? slabLabels(at.stake, slabs) : []),
      ...(ring ? ringLabels(at.data, ring) : []),
      ...beamLabels(at.people, people.beams),
    ],
    [run, ring, tokens, slabs, people.beams, at.verdict, at.stake, at.data, at.people]
  )

  const highlightTip = useMemo(() => {
    const s = hotFinding === null ? -1 : slabs.slabs.findIndex((x) => x.id === hotFinding)
    if (s >= 0) return slabTip(at.stake, slabs, s)
    const p = hotPattern === null ? -1 : plates.findIndex((x) => x.id === hotPattern)
    if (p >= 0) return plateTip(at.further, plates, p)
    const b = hotPerson === null ? -1 : people.beams.beams.findIndex((x) => x.person === hotPerson)
    if (b >= 0) return beamTip(at.people, people.beams, b)
    return null
  }, [
    hotFinding,
    hotPattern,
    hotPerson,
    slabs,
    plates,
    people.beams,
    at.stake,
    at.further,
    at.people,
  ])

  const onSlabHover = (i: number | null) => {
    onHotFinding(i === null ? null : (slabs.slabs[i]?.id ?? null))
    setPointerTip(null)
    document.body.style.cursor = i === null ? '' : 'pointer'
  }
  const onPlateHover = (i: number | null) => {
    onHotPattern(i === null ? null : (plates[i]?.id ?? null))
    setPointerTip(null)
    document.body.style.cursor = i === null ? '' : 'pointer'
  }

  return (
    <WorldPage
      stations={stations}
      labels={labels}
      tip={pointerTip ?? highlightTip}
      isDark={isDark}
      railLabel="Insights sections"
      srOnly={ring ? <RingTable ring={ring} /> : undefined}
      renderScene={({ colors, reached, instant }) => (
        <>
          {run && (
            <>
              <TokensStation
                station={at.verdict}
                tokens={tokens}
                colors={colors}
                active={reached.has(at.verdict)}
                instant={instant}
                onHover={(i) => setPointerTip(i === null ? null : tokenTip(at.verdict, tokens, i))}
              />
              <SlabsStation
                station={at.stake}
                model={slabs}
                colors={colors}
                active={reached.has(at.stake)}
                instant={instant}
                highlight={hotFinding}
                onHover={onSlabHover}
                onPick={(i) => {
                  const id = slabs.slabs[i]?.id
                  if (id) run.parts.revealFinding(id)
                }}
              />
              {hasFurther && (
                <PlatesStation
                  station={at.further}
                  plates={plates}
                  colors={colors}
                  active={reached.has(at.further)}
                  instant={instant}
                  highlight={hotPattern}
                  openId={run.parts.openPattern}
                  onHover={onPlateHover}
                  onPick={(i) => {
                    const id = plates[i]?.id
                    if (id) run.parts.setOpenPattern(run.parts.openPattern === id ? null : id)
                  }}
                />
              )}
            </>
          )}
          {ring && (
            <RingStation
              station={at.data}
              model={ring}
              colors={colors}
              active={reached.has(at.data)}
              instant={instant}
              onHover={(i) => setPointerTip(i === null ? null : ringTip(at.data, ring, i))}
            />
          )}
          <BeamsStation
            station={at.people}
            model={people.beams}
            colors={colors}
            active={reached.has(at.people)}
            instant={instant}
            highlight={hotPerson}
            onHover={(i) => {
              onHotPerson(i === null ? null : (people.beams.beams[i]?.person ?? null))
              setPointerTip(null)
            }}
          />
        </>
      )}
    />
  )
}
