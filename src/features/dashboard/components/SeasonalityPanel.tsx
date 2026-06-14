import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCompact } from '@/lib/format'

import type { SeasonalityResult, SeasonMonth } from '../lib/contracts'

interface SeasonalityPanelProps {
  result: SeasonalityResult
  isLoading: boolean
}

/** Most recent up-to-15 months, oldest→newest. */
const MAX_BARS = 15

function sameMonth(a: SeasonMonth | null, b: SeasonMonth | null): boolean {
  return a !== null && b !== null && a.year === b.year && a.month === b.month
}

export function SeasonalityPanel({ result, isLoading }: SeasonalityPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="section-head">
        <div>
          <div className="title">Seasonality & forecast</div>
          <div className="sub">Your spending arc and where this year is headed</div>
        </div>
      </div>

      <section className="card flex-1">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : result.months.length === 0 ? (
          <EmptyState
            icon="bar_chart"
            title="Not enough history yet"
            description="A few months of statements unlock your seasonality pattern and forecast."
          />
        ) : (
          <SeasonalityBody result={result} />
        )}
      </section>
    </div>
  )
}

function SeasonalityBody({ result }: { result: SeasonalityResult }) {
  const months = result.months.slice(-MAX_BARS)
  const maxExpense = Math.max(...months.map((m) => m.expense), 1)
  const lastMonth = months[months.length - 1] ?? null

  const heaviestSet = new Set(result.heaviestDays)
  const maxDow = Math.max(...result.dayOfWeek.map((d) => d.total), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Monthly bars ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          height: 150,
          paddingTop: 10,
        }}
      >
        {months.map((m) => {
          const isPeak = sameMonth(m, result.peak)
          const isNow = sameMonth(m, lastMonth)
          const heightPct = Math.max((m.expense / maxExpense) * 100, 2)
          const background = isPeak ? 'var(--accent)' : isNow ? 'var(--pos)' : 'var(--surface-3)'
          return (
            <div
              key={`${m.year}-${m.month}`}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                height: '100%',
                justifyContent: 'flex-end',
              }}
              title={`${m.label} ${m.year} · ${formatCompact(m.expense)}`}
            >
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  borderRadius: '4px 4px 0 0',
                  background,
                }}
              />
              <span style={{ fontSize: 9.5, color: 'var(--ink-4)' }}>{m.label}</span>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>
        <CaptionLine result={result} />
      </div>

      {/* ── Day-of-week mini bars ──────────────────────────────────── */}
      {result.dayOfWeek.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {result.dayOfWeek.map((d) => {
              const hi = heaviestSet.has(d.label)
              const heightPx = Math.max((d.total / maxDow) * 56, 4)
              return (
                <div key={d.label} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: heightPx,
                      borderRadius: 4,
                      background: hi ? 'var(--pos)' : 'var(--surface-3)',
                    }}
                    title={`${d.label} · ${formatCompact(d.total)}`}
                  />
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>{d.label}</div>
                </div>
              )
            })}
          </div>
          {result.heaviestDays.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>
              Heaviest: <b style={{ color: 'var(--ink-2)' }}>{result.heaviestDays.join(' & ')}</b>
            </div>
          )}
        </>
      )}

      {/* ── Forecast figures ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24, marginTop: 18, flexWrap: 'wrap' }}>
        <Forecast label="This month projected" value={formatCompact(result.projectedThisMonth)} />
        <Forecast label="FY projected spend" value={formatCompact(result.projectedFY)} />
      </div>
    </div>
  )
}

function CaptionLine({ result }: { result: SeasonalityResult }) {
  const parts: string[] = []
  if (result.peak) parts.push(`${result.peak.label} peak`)
  if (result.calmest) parts.push(`calmest ${result.calmest.label}`)

  // currentVsLastMonthPct is a fraction (e.g. -0.28); convert to a percent.
  const pctValue =
    result.currentVsLastMonthPct === null ? null : Math.round(result.currentVsLastMonthPct * 100)
  const trend =
    pctValue === null
      ? null
      : pctValue < 0
        ? `Spend down ${Math.abs(pctValue)}% vs last month`
        : pctValue > 0
          ? `Spend up ${pctValue}% vs last month`
          : 'Flat vs last month'

  return (
    <>
      {trend && <span style={{ color: 'var(--ink-2)' }}>{trend}</span>}
      {trend && parts.length > 0 && ' · '}
      {parts.join(' · ')}
    </>
  )
}

function Forecast({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--ink-4)',
        }}
      >
        {label}
      </div>
      <div className="num" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
        {value}
      </div>
    </div>
  )
}
