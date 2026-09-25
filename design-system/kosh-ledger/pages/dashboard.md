# Page override — Home (`/`)

Overrides `../MASTER.md` for the landing screen. Mock: `design-mock/ledger/dashboard.html`.

## The four blocks, in order

| #   | Block         | Question it answers                                | Numbers it owns                                                |
| --- | ------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Verdict       | _Am I OK this month?_                              | income, spend, saved, savings rate, daily allowance, days left |
| 2   | Where it went | _What did it go on, and is any of it running hot?_ | per-category spend, % of that category's budget, pace tick     |
| 3   | The year      | _Where does this year land?_                       | year-to-date in/out/saved, year-end projection, plan gap       |
| 4   | Trend         | _Is this month normal?_                            | monthly in/out for 6 / 12 / 15 months                          |

Nothing else goes on this page. Habits, seasonality, weekday patterns, the full commitment list
and the people ledger live at `/insights`. Committed vs chosen and Needs you were removed from
Home in 2026-09 in favour of the year block. Per-category detail lives at `/c/:id`.

## Rules specific to this page

- The month's income / spend / saved appear **only** in block 1. `IncomeSummaryCards` is deleted,
  not moved.
- Block 2 is the only category view. The donut, the separate budget-pace card, the category deep
  dive and the category transaction-stats card all collapse into it; the budget pace is the tick
  mark on each bar, and the deep dive is the row's link target.
- Block 3 is cumulative (running total through the year, then a dashed projection at the pace
  of the completed months); its totals are the chart's own end points.
- Block 4 is the only month-by-month series. The window toggle replaces `SixMonthTrend` +
  `IncomeFlowAndTrend`; the 15-month seasonality arc is dropped because 15m is one of the windows.
- The daily-spend calendar is removed from this page; weekday behaviour is answered once, in
  Insights.
- Insight copy stays sentence-shaped and names the driver, e.g.
  _"₹14,200 ahead of where February usually is by now — but eating out has already used 120% of
  its month."_

## Data mapping (existing code)

| Block | Source that already exists                                                                 |
| ----- | ------------------------------------------------------------------------------------------ |
| 1     | `useDashboardData` → `totalIncome`, `totalDebit`; `computeInsights().verdict`              |
| 2     | `data.summaryRows` + `data.budgetRows` + `paceAt` (drop `categoryChartData` donut shaping) |
| 3     | `computeYearOutlook(data.yearlyTrendData, …)` + `data.annualBudget`                        |
| 4     | `data.incomeTrendData` + `data.stackedTrendData` behind one window selector                |

`computeHabits`, `computeTagSpend` and `computeSeasonality` move to the Insights
route — the engines are unchanged, only their mount point moves.

## The 3D world (wide screens)

At 1200px and wider, with WebGL, Home renders as a 3D world (`features/dashboard/world/`).
The four blocks stay as real DOM panels in a 500px left column. A sticky stage beside them holds
one orthographic scene with four stations. Scrolling the panels flies the camera to the station
of the panel nearest the scroller's centre. Under reduced motion, the camera cuts between
stations instead.

| Station         | Draws                                                                                                                       | Replaces in the panel           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1 The month     | Vessel: rim is income, fill is spend, green band is saved, red is spend past income, rings are budget and expected-by-today | nothing (the verdict stays)     |
| 2 Where it went | One tower per category, in the bar list's order. Budget cap, pace tick on the front face, red over budget                   | nothing (the list is the index) |
| 3 The year      | Month × category terrain, top 7 plus "Everything else", projected months ghosted                                            | the cumulative line chart       |
| 4 Trend         | In and out as extruded ribbons over the 6/12/15-month window, with the average-out rule                                     | the line chart                  |

Rules:

- Every figure the stage draws is in a panel as text. The canvas is `aria-hidden`, and the
  terrain has an sr-only table.
- Hovering a Where it went row lights its tower, and hovering a tower lights its row.
- Clicking a tower or a terrain box opens `/c/:id`, the same link as the row.
- Only `--ink`, `--accent`, `--pos` and `--neg` colour the scene, read from the tokens and
  re-read when the theme flips.
- Narrower than 1200px, or without WebGL, Home is the flat four-block stack described above.

## Loading and empty states

- Block 1 renders skeleton bars for the four figures; the verdict line waits rather than showing
  a wrong headline.
- Block 2 with no budgets set still renders, sorted by amount, with "no budget" in the last column
  and no tick.
- A fresh account shows the year block's empty state, which points at import.
