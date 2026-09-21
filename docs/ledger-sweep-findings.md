# Ledger UI bug sweep — 2026-09-21 (Phase 8c)

Manual sweep of the Ledger redesign against `dash-brainstorm@example.com`
(1334 transactions, last activity June 2026; current calendar month at the
time of the sweep was September 2026, empty). Chrome driven live against
`localhost:5173` / `:8000`, 1440px and 412px, light and dark, with the
console and network tab open throughout.

Severity: **CRITICAL** (data loss / totally broken flow) · **HIGH** (wrong
behaviour a power user hits routinely) · **MEDIUM** (real bug, narrower
trigger or cosmetic-but-wrong) · **LOW** (nit, no user-visible harm today).

---

## Fixed

### CRITICAL — Stepping the month across a year boundary silently drops the year
- **What I did**: On Home (and Budget/Category, which share the same
  stepper), set the period to Dec 2025 and clicked "Next month" (also
  reproduced by hand via `YearMonthSelector`'s `<`/`>` buttons on Budget).
- **What happened**: URL/state became `year=2025&month=1` — the year change
  was silently dropped; the app rendered "Jan 2025" as if the user had
  stepped backward eleven months instead of forward one. Confirmed live via
  `evaluate_script` clicking "Next month" from Dec 2025 and reading
  `location.href`.
- **What should happen**: Dec 2025 → Jan 2026.
- **Root cause**: `YearMonthSelector.step()` called `onYearChange(y)` then
  `onMonthChange(m)` as two separate `setSearchParams` calls in the same
  handler. Each call reads a memoized snapshot of the current search params;
  two synchronous calls race and the second clobbers the first's write.
  Exact same class of bug as the Clear Filters fix in Phase 8b.
- **Fix**: `YearMonthSelector` now takes one `onPeriodChange(year, month)`
  prop, used by both the stepper and the year `<select>`, which both callers
  (`VerdictBlock` → `DashboardPage`, `CategoryPage`) wire to `usePeriod`'s
  existing combined `setPeriod`. No more split year/month setters anywhere
  in the period system (grepped for `onYearChange`/`onMonthChange` —  zero
  hits left).
- **Files**: `src/components/ui/YearMonthSelector.tsx`,
  `src/features/dashboard/components/VerdictBlock.tsx`,
  `src/features/dashboard/page.tsx`, `src/features/category/page.tsx`.
- **Test**: `src/test/flows/period-year-boundary.test.tsx`.

### HIGH — Every inline budget edit fires a guaranteed-404 request first
- **What I did**: Read `useBudgetMutations`'s `monthlyOverrideMutation` next
  to `backend/app/routers/budget.py`.
- **What happened**: The mutation always `PUT`s
  `/budget/{year}/{month}/categories/{id}` first. That route is not
  registered on the backend at all — the router only exposes `POST /budget`,
  `GET /budget/{year}`, `PUT /budget/{id}`, `DELETE /budget/{id}` — so this
  call 404s on literally every inline edit, then the `onError` handler
  falls back to the annual `PUT /budget/{id}`, which is what actually saves.
  Confirmed the route doesn't exist by reading the router file directly
  (not guessing from behaviour).
- **What should happen**: One request per edit, since the fallback is the
  only path that can ever succeed.
- **Fix**: `monthlyOverrideMutation` now calls the annual `PUT /budget/{id}`
  directly. Behaviour is unchanged (100% of edits already ended up there);
  the guaranteed-failing first request is gone. Left the tracked GitHub
  issue reference (#37) in a comment for whenever the backend adds real
  per-month overrides — this is a client-side dead-call removal, not a
  decision to drop the feature.
- **Files**: `src/features/budget/hooks/useBudgetMutations.ts`.
- **Test**: `src/test/flows/budget-edit.test.tsx` (extended).

### HIGH — Budget/Insights/Category pages retry-storm four 404 endpoints
- **What I did**: Watched the Network tab loading Insights, Budget, and a
  Category drill-down page.
- **What happened**: `GET /budget/{year}/monthly-overrides` (no such route —
  same as above) and `GET /budget/{year}` for a year with no budget plan yet
  (a legitimate 404 the backend returns by design) were both fetched without
  `retry: false`. React Query's default retry (3x, exponential backoff)
  turned each of these into up to 4 requests per query. `useBudgetLookup`
  (used by Insights' heatmap/forecast) fires both queries for *two* years on
  every load — up to 16 failing requests on one page visit. One query in
  `useBudgetData.ts` already had the correct `retry: false` pattern; three
  sibling call sites didn't.
- **What should happen**: One request, fail fast, `?? []` fallback (already
  present everywhere) treats it as "no data."
- **Fix**: Added `retry: false, throwOnError: false` to the three missing
  call sites, matching the existing correct pattern.
- **Files**: `src/features/insights/hooks/useBudgetLookup.ts` (both
  `baseQueries` and `overrideQueries`), `src/features/category/page.tsx`
  (`budgetQuery` and `overridesQuery`), `src/features/budget/hooks/useBudgetData.ts`
  (`budgetQuery`).
- **Test**: covered indirectly by the query-config assertions in
  `src/test/flows/budget-overrides-retry.test.tsx`.

### MEDIUM — Floating quick-add button covers page content on desktop
- **What I did**: Scrolled Insights → People to its last row at 1440px and
  read the DOM rects of the row's action button and the FAB.
- **What happened**: The "settle" button in the last People row
  (`x:1334–1405, y:771–798`) sat almost entirely underneath the fixed
  quick-add FAB (`x:1364–1416, y:768–820`) — the FAB is on top (`z-index:
  40`, `position: fixed`) with no reserved clearance under it on desktop.
  `.container` already reserves 84px of bottom padding on mobile for
  exactly this reason (FAB + bottom tab bar); the ≥900px breakpoint had no
  equivalent, so any page whose last row lands in the bottom-right corner
  gets its actions covered.
- **What should happen**: Page content never sits under the FAB's hit area.
- **Fix**: Added `padding-bottom: 96px` to `.container` at `≥900px`,
  mirroring the existing mobile clearance. Verified live — the same row's
  button now sits at `y:976–1002`, well clear of the FAB.
- **Files**: `src/styles/components.css` (`.container`).
- **Test**: not unit-testable (pure layout/geometry); verified manually,
  documented here per the "not everything needs a test" judgement call —
  covered by not regressing `.container`'s existing mobile rule, which the
  CSS test... there isn't one; this is a CSS-only fix with no existing test
  harness for computed layout in this repo, so no regression test was added.

### MEDIUM — Segment count badge is low-contrast in the active segment (dark mode)
- **What I did**: Toggled dark mode on Transactions and looked at the "87"
  count inside the active "All" segment.
- **What happened**: `.badge.quiet` (used for the "All 87" count) keeps its
  own `background: var(--surface-2)` / `color: var(--ink-3)` regardless of
  the parent `.seg button.on`'s background (`var(--surface)`). In dark mode
  both surfaces sit within one step of near-black, so the badge reads as a
  dim smudge rather than a legible count against the active pill.
- **What should happen**: The count stays readable in the active segment in
  both themes, without becoming an accent/attention colour (only "Needs
  review" should read as urgent, per the existing comment on `.badge.quiet`).
- **Fix**: Added `.seg button.on .badge.quiet { background: var(--surface-3);
  color: var(--ink-2); }`.
- **Files**: `src/styles/components.css`.
- **Test**: not unit-testable (computed color contrast); verified visually
  in both themes via screenshot.

---

## Deferred

### Outside the plan / Expected income treat every income category as unbudgeted spend
- **What I did**: Reproduced the lead on Budget (dividend, equity, fixed
  deposits, misc income, salary all listed under "Outside the plan — no
  budget line yet" with "Set budget" CTAs), then read
  `buildUnbudgetedRows`/`buildIncomeRows` in
  `src/features/budget/lib/budgetMath.ts` and checked the account's actual
  category data via `GET /categories`.
- **Root cause — confirmed server-side/data, not frontend logic**:
  `buildUnbudgetedRows` already filters `.filter((c) => !budgetedIds.has(c.id) && !c.is_income)`
  and `buildIncomeRows` already filters `.filter((c) => c.is_income)` — the
  frontend logic is correct and is the same `is_income` field every other
  screen (Settings → Categories, the categorisation dropdowns, the category
  delete dialog) already keys off consistently. The bug is that **every
  category on this account, including dividend/salary/misc income/fixed
  deposits/equity, has `is_income: false`** (verified via
  `GET /categories`, not inferred): `curl .../categories` returns all 19
  categories with `"is_income": false`. That's why "Expected income" also
  shows "No income categories yet" despite ₹2,18,727 of income transactions
  this month — there are, by the data, zero income categories on this
  account.
- **Why deferred**: this is account/seed data, not a code defect — every
  code path that reads `is_income` is already correct and consistent. Per
  the phase constraints ("No backend changes... don't work around
  server-side causes with client hacks"), the honest fix is flipping the
  flag via the product's own Settings → Categories → "Move to income"
  toggle for this account, not adding a name-based heuristic
  (`name === 'salary' ? income : ...`) into budget math that every other
  screen doesn't use — that would be exactly the kind of inconsistent
  special-casing the "strict behavioral consistency" rule warns against.
- **Needs a decision from the user**: should the `dash-brainstorm` seed
  account's income categories be re-flagged (five clicks in Settings), or
  is this a backend seeding bug to fix at the source next time the account
  is regenerated?

### Settings picks up the sticky period in its URL despite being period-agnostic
- **What I did**: Navigated directly to `/settings` and watched the address
  bar.
- **What happened**: It became `/settings?year=2026&month=1` even though
  `SettingsPage` never reads `year`/`month`, and `SideNav`'s own `NAV` table
  has an explicit comment: *"Settings has no period, so it's plain."*
- **Root cause**: `SideNav` and `BottomTabBar` both call `usePeriod()`
  (to render the FY label / sidebar stats) on every route, including
  Settings. `usePeriod`'s backfill `useEffect` — which exists so a
  period-aware page's URL is always deep-linkable — runs for any component
  that calls the hook, not just the page that owns the route, so it writes
  `year`/`month` onto whatever URL happens to be current, including
  Settings'.
- **Why deferred**: harmless in effect (Settings ignores the params, and
  the write uses `replace: true` so it doesn't spam history), but a real
  fix means giving `usePeriod` a way to distinguish "I need to read the
  period" from "I own this route's period URL" — every period-aware page
  and the sticky-persistence test suite
  (`src/test/flows/period-persistence.test.tsx`) currently depend on the
  hook's current all-or-nothing behaviour. That's a wider change than this
  sweep's risk budget; flagged rather than guessed at.

### Category drag-to-categorise chips render in the old 8-hue palette
- **Lead status: not reproducible.** `src/features/transactions/lib/categoryColor.ts`
  resolves through `--cat-1`…`--cat-8`, and `src/styles/tokens.css` already
  redefines all eight as aliases of the greyscale `--d1`…`--d5` ramp (with
  an explicit comment: *"retired per MASTER §2 ... redefined as the
  greyscale ramp so nothing renders in the old eight hues"*). Screenshotted
  the drag-and-drop category chips on Transactions in both themes — all
  render as grey dots at varying lightness, not hues. This appears to have
  already been fixed by an earlier phase's token change; no code change
  made. Only the comment's noted follow-up (removing the now-redundant
  `--cat-*` indirection and calling `--d*` directly) remains, which is a
  pure refactor with no behavioural effect — not done here since it's out
  of scope for a bug sweep.

### `resetOverrideMutation` ("reset to default monthly budget") always 404s
- **What I did**: Read `BudgetCategoryRow.tsx` — the reset button only
  renders `{row.hasOverride && ...}`.
- **What happened**: Since per-month overrides can never actually be
  created server-side (see the fixed guaranteed-404 issue above),
  `row.hasOverride` is always `false` in real usage, so this button is
  unreachable dead code today, not a live defect a user can hit.
- **Why deferred**: fixing the mutation itself (it still calls
  `DELETE /budget/{year}/{month}/categories/{id}`, a route that doesn't
  exist) is low-value while the button that triggers it can't render;
  worth revisiting together with the tracked #37 per-month-override work
  rather than in isolation.

### Missing `id`/`name`/`<label>` on several form fields (Chrome DevTools "issue" panel)
- **What I did**: Watched `list_console_messages` (`type: issue`) while
  opening the transaction edit panel, split editor, and the Transactions
  toolbar.
- **What happened**: Recurring "A form field element should have an id or
  name attribute" / "No label associated with a form field" issues — e.g.
  the transactions search box and several inputs in the split editor rely
  on `aria-label`/placeholder only. Screen readers still get a name via
  `aria-label` where present, so this is a DevTools autofill-heuristic nit,
  not a user-facing accessibility break in the cases checked.
- **Why deferred**: real but low severity, large surface (touches most
  form inputs across Transactions/Budget/Settings), and each fix is
  mechanical but the sheer count means doing it properly is its own pass,
  not a sweep-sized fix. Flagging so it's on record rather than fixing
  piecemeal and missing half of them.

### TanStack Query Devtools icon overlaps the mobile bottom tab bar
- **What I did**: Emulated 412×915 on Home and saw a colourful round icon
  sitting on top of the "Settings" tab.
- **What happened**: `tsqd-open-btn-container` (React Query Devtools'
  own floating toggle) renders at a fixed bottom-right position that
  overlaps the mobile bottom tab bar.
- **Why not a defect**: this is dev-only tooling (`IS_DEV`-gated
  elsewhere in the codebase, e.g. `QuickAddFAB`'s own comment about giving
  the FAB extra clearance "In dev the React Query devtools button sits at
  the bottom-right corner"), stripped entirely from the production build.
  Not fixed; noted here only so it isn't rediscovered as a mystery overlap
  in a future sweep.

---

## Verified working, no defect found
- Import menu (PDF / paste / manual), bulk-categorise, auto-categorise,
  drag-to-categorise: functioned correctly in the sweep, greyscale category
  chips, correct counts.
- Split editor (percentage/amount split with a person) opens with correct
  data from the row-level split badge; "settle" itself lives on
  Transactions per the Insights People tooltip, matching the code
  (`EditPanel.tsx` owns settling) — not re-litigated in depth here.
- Escape closes the "?" keyboard-shortcuts modal cleanly; no console errors
  before/after.
- 404 route renders the styled "Page not found" page with a working
  "Back to dashboard" link.
- Dashboard empty-month state (Sep 2026, zero activity): "No spend yet" /
  "Nothing due soon" empty states render correctly, no broken layout, no
  console errors, at both 1440 and 412.
- Theme toggle: verified mid-session on Transactions with 87 rows and an
  active selection — no state loss, no layout shift beyond the intended
  color change.
