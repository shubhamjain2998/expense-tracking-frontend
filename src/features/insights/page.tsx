/**
 * Insights (/insights) — habits, seasonality, day-of-week, forecast, YTD
 * detail. A secondary "Explore" destination reached from SideNav, not a
 * primary tab — see design-system/kosh-ledger/MASTER.md §7.
 *
 * Phase 2 placeholder only; Phase 4 fills this in with the real panels from
 * design-mock/ledger/insights.html.
 */
export function InsightsPage() {
  return (
    <div className="sec">
      <div className="sec-head">
        <h1 className="sec-title">Insights</h1>
        <span className="sub">
          Habits, seasonality and forecast — the slow-moving picture behind this month. Coming in a
          later phase.
        </span>
      </div>
    </div>
  )
}
