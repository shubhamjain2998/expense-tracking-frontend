# Ledger redesign — implementation plan

Branch: `redesign/ledger-2026`. Mocks: `design-mock/ledger/` (open `index.html`).
Spec: `MASTER.md` + `pages/dashboard.md`.

Each phase is one PR, type-checked, linted and tested before the next starts.

## Phase 1 — Foundation

- `index.html`: swap Fontshare Cabinet Grotesk / General Sans for Google Fonts
  Space Grotesk + Inter; keep JetBrains Mono.
- `src/styles/tokens.css`: replace the neutral + accent palettes with the Ledger tokens in
  `MASTER.md` §2, both themes. Add `--d1..--d5`. Keep every `--app-*` alias so Tailwind utilities
  keep working. Delete the `--kosh-*` "Warm Treasury" block and the warm shadow tokens.
- `src/styles/base.css`: drop the paper-grain overlay; body font Inter.
- `src/styles/components.css`: card loses its shadow and gains a 1px border; `.display` →
  Space Grotesk; add `.sec-head`, `.bars`/`.bar-row`/`.track`/`.fill`/`.tick`, `.meter`,
  `.chart`, `.heat`, `.dow`, `.stats`, `.alerts`/`.alert`, `.tagset`, `.worksplit`, `.setsplit`.
  Port them from `design-mock/ledger/ledger.css` — it is written in the same idiom.
- Gate: every page still renders; no visual assertion yet.

## Phase 2 — Shell and navigation

- Nav drops to four destinations; `BottomTabBar` to four tabs; Insights becomes a secondary link.
- New routes `/insights` and `/c/:categoryId`; `/upload` redirects to `/transactions?import=pdf`.
- `TopNav` keeps the page title, theme toggle and the primary Add action only.

## Phase 3 — Home

Rebuild `src/features/dashboard/page.tsx` to the five blocks in `pages/dashboard.md`.

- New: `VerdictBlock`, `WhereItWent`, `CommittedVsChosen`, `TrendBlock`, `NeedsYou`.
- Deleted from this route: `IncomeSummaryCards`, `CategoryDonutChart`, `CategoryDeepDive`,
  `CategoryTransactionStats`, `BudgetPaceBars`, `SixMonthTrend`, `IncomeFlowAndTrend`,
  `DailySpendCalendar`, `SeasonalityPanel`, `YtdSection`, `SectionPillBar`.
- The pure engines in `src/features/dashboard/lib/` are **not** touched. Their tests must stay
  green, including the recurring-median regression test.

## Phase 4 — Insights and Category

- `/insights`: habits table, the month × category heatmap, weekday panel, next-month forecast,
  full commitments table, people ledger. Reuses `computeHabits`, `computeSeasonality`,
  `detectRecurring` and the split ledger query.
- `/c/:categoryId`: hero, the category's own 15-month line, stat strip, merchants and tags bars,
  its transactions.

## Phase 5 — Transactions and import

- Toolbar per the mock; Import becomes a menu mounting the existing PDF / paste / manual panels in
  a dialog. `src/features/upload/` components are reused as-is, `src/features/upload/page.tsx` and
  `src/pages/UploadPage.tsx` are deleted.
- Desktop: docked editor panel replaces the slide-over. Mobile: keep the sheet, hide the category,
  tags and people columns.

## Phase 6 — Budget and Settings

- Budget: year meter, plan table, outside-the-plan, expected income. The heatmap moves to Insights.
- Settings: two-column section nav; content sections unchanged apart from styling.

## Phase 7 — Sweep

- Delete dead components and the `--kosh-*` tokens.
- Re-run the `MASTER.md` §9 checklist at 375 / 768 / 1024 / 1440 in both themes.
- Update `src/lib/motion.ts` durations to `120 / 200 / 320`.

## Things that must not regress

- Recurring monthly figure stays the MEDIAN of per-month totals; tag-keyed groups still bypass the
  ±15% stability gate.
- `dashboardMath.ytdIncomeTotal` keeps using `yearlyTrendData`.
- `font-variant-numeric: tabular-nums` on every number.
- The Icon wrapper's static Lucide map stays static — no dynamic lookups.
