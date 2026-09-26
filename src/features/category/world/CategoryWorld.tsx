import { useMemo, useState, type ReactNode } from 'react'

import type { WorldStation, WorldTip } from '@/components/world/types'
import { WorldPage } from '@/components/world/WorldPage'
import { formatCurrency } from '@/lib/format'

import {
  breakdownFrame,
  breakdownLabels,
  breakdownTip,
  daysFrame,
  daysLabels,
  dayTip,
  monthsFrame,
  monthsLabels,
  monthTip,
} from './layout'
import type { BreakdownModel, DaysModel, MonthColumn, MonthsModel } from './stationData'
import { BreakdownStation, DaysStation, MonthsStation } from './stations'

/** Screen-reader copy of the columns' budgets: the trend panel states only
 *  the selected month's. */
function MonthsTable({ model, category }: { model: MonthsModel; category: string }) {
  if (model.columns.length === 0) return null
  return (
    <div className="sr-only">
      <table>
        <caption>{category} spend and budget by month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Spent</th>
            <th>Budget</th>
          </tr>
        </thead>
        <tbody>
          {model.columns.map((c) => (
            <tr key={`${c.year}-${c.month}`}>
              <td>
                {c.label} {c.year}
              </td>
              <td>{formatCurrency(c.amount)}</td>
              <td>{c.budget > 0 ? formatCurrency(Math.round(c.budget)) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface CategoryWorldProps {
  category: string
  /** The trend, breakdown and transactions panels, in station order. */
  panels: [ReactNode, ReactNode, ReactNode]
  months: MonthsModel
  breakdown: BreakdownModel
  days: DaysModel
  /** Merchant or tag lit in both the towers and the breakdown lists. */
  breakdownHighlight: string | null
  onBreakdownHighlight: (key: string | null) => void
  /** Transaction lit in both the day field and the table. */
  txnHighlight: string | null
  onTxnHighlight: (id: string | null) => void
  /** Moves the page to a month, as the period picker does. */
  onPickMonth: (column: MonthColumn) => void
  isDark: boolean
}

/**
 * The category page as a 3D world: the trend as monthly columns, where in
 * the category as ranked towers and the month's transactions as a field of
 * days. See components/world/WorldPage for how panels and stage fit together.
 */
export function CategoryWorld({
  category,
  panels,
  months,
  breakdown,
  days,
  breakdownHighlight,
  onBreakdownHighlight,
  txnHighlight,
  onTxnHighlight,
  onPickMonth,
  isDark,
}: CategoryWorldProps) {
  const [monthTipAt, setMonthTipAt] = useState<WorldTip | null>(null)

  const stations = useMemo<WorldStation[]>(
    () => [
      {
        name: 'The trend',
        panel: panels[0],
        frame: monthsFrame(months.columns.length),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Spent' },
          { swatch: 'bg-[var(--accent)]', label: 'This month' },
          { swatch: 'bg-[var(--neg)]', label: 'Over budget' },
          { swatch: 'is-line bg-[var(--line-strong)]', label: 'Budget' },
          { swatch: 'is-line bg-[var(--ink-4)]', label: 'Median month' },
        ],
        hint: 'Hover a month · click one to open it',
      },
      {
        name: 'Where in it',
        panel: panels[1],
        frame: breakdownFrame(breakdown),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'Merchant' },
          { swatch: 'bg-[var(--ink-4)]', label: 'Tag' },
        ],
        hint: 'Hover a tower or a row',
      },
      {
        name: 'Day by day',
        panel: panels[2],
        frame: daysFrame(days),
        legend: [
          { swatch: 'bg-[var(--ink)]', label: 'One transaction' },
          { swatch: 'bg-[var(--accent)]', label: 'Hovered' },
        ],
        hint: 'Hover a block or a row · click a block to find its row',
      },
    ],
    [panels, months.columns.length, breakdown, days]
  )

  const labels = useMemo(
    () => [...monthsLabels(months), ...breakdownLabels(breakdown), ...daysLabels(days)],
    [months, breakdown, days]
  )
  const linkedTip = useMemo(
    // Each is null unless the pointer is on its station or panel.
    () => dayTip(days, txnHighlight) ?? breakdownTip(breakdown, breakdownHighlight),
    [breakdown, breakdownHighlight, days, txnHighlight]
  )

  const onMonthHover = (i: number | null) => {
    setMonthTipAt(i === null ? null : monthTip(months, i))
    document.body.style.cursor = i !== null && !months.columns[i]?.selected ? 'pointer' : ''
  }

  return (
    <WorldPage
      stations={stations}
      labels={labels}
      tip={monthTipAt ?? linkedTip}
      isDark={isDark}
      railLabel={`${category} sections`}
      srOnly={<MonthsTable model={months} category={category} />}
      renderScene={({ colors, reached, instant }) => (
        <>
          <MonthsStation
            model={months}
            colors={colors}
            active={reached.has(0)}
            instant={instant}
            onHover={onMonthHover}
            onPick={(c) => {
              if (c.selected) return
              setMonthTipAt(null)
              document.body.style.cursor = ''
              onPickMonth(c)
            }}
          />
          <BreakdownStation
            model={breakdown}
            colors={colors}
            active={reached.has(1)}
            instant={instant}
            highlight={breakdownHighlight}
            onHover={onBreakdownHighlight}
          />
          <DaysStation
            model={days}
            colors={colors}
            active={reached.has(2)}
            instant={instant}
            highlight={txnHighlight}
            onHover={onTxnHighlight}
            onPick={(id) =>
              document
                .querySelector(`[data-txn-id="${CSS.escape(id)}"]`)
                ?.scrollIntoView({ block: 'nearest', behavior: instant ? 'auto' : 'smooth' })
            }
          />
        </>
      )}
    />
  )
}
