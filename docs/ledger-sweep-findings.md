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

---

# Second pass — 2026-09-21

Deeper sweep against `dash-brainstorm@example.com` (June 2026, the account's
last-active month). Cleared both items the first pass deferred, then tested
import/split/keyboard/concurrency/adversarial-data with real interaction
rather than page loads, per the standing "get rid of all those daily-usage
gaps" request. Chrome driven live against `localhost:5173` / `:8000`, plus
direct API calls (`curl`) to set up test fixtures and verify server state
independent of what the UI claimed. All test data created during this pass
(extra persons, test transactions, a test category) was cleaned up
afterwards except the 3-way split on "swiggy Ban", left in place as a real
demonstration of the split/settle flow.

Severity scale matches the first pass: **CRITICAL** / **HIGH** / **MEDIUM** /
**LOW**.

---

## Fixed

### HIGH — Settings accumulated `?year=&month=` in its URL (first-pass deferred item, cleared)
- **What I did**: Read `usePeriod.ts`, `SideNav.tsx`, `BottomTabBar.tsx`, and
  the five pages that actually own a period route.
- **What happened**: `SideNav`/`BottomTabBar` called the *owning* `usePeriod()`
  — which backfills the URL with `?year=&month=` whenever a param is
  missing — just to read the period for building nav links. Since they
  render on every route including Settings, Settings' URL picked up period
  params it never reads.
- **Fix**: Split `usePeriod` into `usePeriodValue()` (pure read, no URL
  side-effect — used by `SideNav`/`BottomTabBar`) and the existing
  `usePeriod()` (owning: URL backfill + localStorage mirror — used only by
  the 5 pages that own a period route). Dropped the already-unused
  `setYear`/`setMonth` from the owning hook's return value.
- **Files**: `src/hooks/usePeriod.ts`, `src/components/layout/SideNav.tsx`,
  `src/components/layout/BottomTabBar.tsx`.
- **Test**: `src/test/flows/period-persistence.test.tsx` — new case
  "keeps a clean URL on Settings…", plus all 5 pre-existing cases in that
  file re-verified green (period still survives navigation/reload/new tab).
- **Commit**: `f0632a6`.

### HIGH — 24 form inputs had no programmatic label (first-pass deferred item, cleared)
- **What I did**: Enabled `jsx-a11y/label-has-associated-control` (error) in
  `eslint.config.js` instead of fixing ad hoc, then fixed every violation it
  reported.
- **What happened**: 24 inputs across `AddTransactionDialog`,
  `CategoryDeleteDialog`, `EditPanel`, `ProcessPanel`, `ManualEntryPanel`,
  `LoginPage`, `RegisterPage`, and three Settings sections
  (Ignore rules/Mappings/People/Tags) relied on a visible `<label>` with no
  `htmlFor`, or an `aria-label` on the input with nothing tying the two
  together — a screen reader announces these as unlabelled.
- **Fix**: Real `<label htmlFor>`/`id` pairs (removing the now-redundant
  standalone `aria-label` where one existed), or a labelled
  `role="group"` for the Type toggle-button groups that were never a
  single-control label to begin with. `MappingsSection`'s orphaned
  "Category" label now passes `label="Category"` to `SearchableSelect`
  (which already builds its own `<label htmlFor>`), matching every other
  call site instead of duplicating the label markup.
- **Files**: 15 component files — see commit for the full list.
- **Test**: `src/test/flows/a11y-labels.test.tsx` (new), plus label-text
  assertions added to `login.test.tsx`, `register.test.tsx` and
  `mappings-crud.test.tsx`.
- **Commit**: `8fff2d0` (+ `5e39d44` for an unrelated pre-existing
  `tailwind.config.ts` import-order lint error the 0-errors gate required
  fixing anyway).

### HIGH — Import duplicate detection only checked unprocessed transactions
- **What I did**: Pasted a row (`2026-06-12 · Gyftr Via Smartbuy New ·
  679.15`) matching an existing, already-*categorised* June transaction
  through Transactions → Import → Paste rows.
- **What happened**: No duplicate warning — the row imported clean, "1 of 1
  ready", zero possible-duplicates. Read `buildPreviewResult.ts` (shared by
  both the PDF and bulk-paste preview): it only called `getRawTransactions`
  to build the existing-signature set, and a transaction leaves the `raw`
  table the instant it's categorised. Since almost every transaction gets
  categorised shortly after import, this made the dedupe safety net nearly
  useless for the realistic case of re-importing a statement that's already
  been processed — confirmed by checking `/transactions/raw` for June
  returned `[]` while `/transactions/processed` had the matching row.
- **What should happen**: A row matching an already-processed transaction on
  date+description+amount is flagged and auto-excluded, same as a raw
  duplicate.
- **Fix**: `buildPreviewResult` now also fetches `/transactions/processed`
  for the affected months and folds those signatures into the
  existing-transaction set. Re-tested live: the same paste now shows
  "1 of 2 ready · 1 possible duplicate", correctly excluded.
- **Files**: `src/features/upload/lib/buildPreviewResult.ts`.
- **Test**: `src/features/upload/lib/buildPreviewResult.test.ts` (new).
- **Commit**: `da9c048`.

### HIGH — No date-entry surface rejected a transaction dated decades in the future
- **What I did**: Added a manual transaction dated `2099-06-15` via
  Transactions → Add one manually.
- **What happened**: Accepted silently, no warning. Confirmed via
  `GET /transactions/raw?year=2099&month=6` — the row was there. Since it
  only surfaces if a user happens to browse to year 2099, a fat-fingered
  year (`2029` typed as `2099`) would silently misfile a transaction with
  zero feedback, invisible on every normal monthly view. None of the app's
  three date-entry surfaces (`AddTransactionDialog`, `ManualEntryPanel`,
  `EditPanel`) had any upper bound on the date field.
- **What should happen**: A future date is rejected with a clear message.
  A past date (e.g. 1970 — a legitimate backdated entry) still works.
- **Fix**: `max={todayIsoDate()}` on all three date inputs plus an explicit
  "Date cannot be in the future" check in each submit handler
  (belt-and-suspenders — `max` alone doesn't stop a value set
  programmatically or an unclamped browser). Test-transaction cleaned up
  via the API afterwards.
- **Files**: `src/components/ui/AddTransactionDialog.tsx`,
  `src/features/upload/components/ManualEntryPanel.tsx`,
  `src/features/transactions/components/EditPanel.tsx`.
- **Test**: `src/test/flows/future-date-validation.test.tsx` (new, 5 cases
  — future-date rejection on all 3 surfaces + a 1970 date still passing
  validation on 2 of them).
- **Commit**: `da2978c`.

### HIGH — EditPanel's settlement toggle showed stale status after its own successful mutation
- **What I did**: Split a transaction 3 ways (anshul 50% / priya 30% /
  rahul 20% — created via Settings → People, then a live split through
  EditPanel) and settled priya's share from the Settlement rows.
- **What happened**: The `PATCH /transactions/processed/{id}/shares/{personId}`
  succeeded (200) and the transactions list refetched (confirmed via the
  network panel), but the *open* panel kept showing "pending" for priya.
  Confirmed against `/transactions/processed` that the server had it
  correctly settled the whole time — only the open panel's own view was
  wrong. Root cause: `txn` is a snapshot `TransactionsPage` passes down
  once when the panel opens and never refreshes from the list's own
  refetch (a separate `editingTxn` state, not derived from the query) — see
  `transactions_page_architecture.md`. The Settlement rows read
  `share.settled` straight off that stale prop, so a *second* click, still
  computed as `!share.settled` off the same stale value, always sent the
  same direction again — a user could never actually unsettle a share from
  the panel without closing and reopening it first.
- **Fix**: EditPanel now tracks its own `settledOverrides` map, updated
  from each `settledMutation`'s `onSuccess` (which already knows the
  direction that just succeeded), and prefers it over the stale prop for
  both rendering and computing the next toggle direction. Re-verified live:
  settle → immediately shows "settled" → unsettle → immediately shows
  "pending", each confirmed against the server; Home and Insights → People
  agreed with the panel at every step (₹29.8k → ₹29.7k owed after
  settling priya's ₹87, back to ₹29.8k after unsettling).
- **Files**: `src/features/transactions/components/EditPanel.tsx`.
- **Test**: `src/test/flows/settle-toggle-staleness.test.tsx` (new, 2
  cases — confirmed to fail without the fix).
- **Commit**: `e4f6401`.

### HIGH — Dialogs didn't return focus to whatever triggered them
- **What I did**: Keyboard-only pass — focused the "Show keyboard
  shortcuts" button, pressed `?` to open the overlay (confirmed via CDP
  key injection, not just a click — see the deferred item below on why a
  synthetic-event test of the same key looked like a false negative
  first), then Escape to close it.
- **What happened**: Focus landed on `<body>`, not back on the button —
  confirmed via `document.activeElement`. Checked all five
  `role="dialog"` components in the app (`AddTransactionDialog`,
  `KeyboardShortcutsModal`, `ImportDialog`, `PasswordPromptDialog`,
  `WelcomeModal`): none restored focus on close. A keyboard or
  screen-reader user has to re-navigate from the top of the page after
  every single dialog.
- **Fix**: New `useFocusReturn()` hook, wired into all five. It captures
  `document.activeElement` during *render*, not inside a `useEffect` —
  several of these dialogs `autoFocus` their own first field, and React
  applies `autoFocus` synchronously during the mount commit, before any
  effect runs; a `useEffect`-based capture reliably grabbed the dialog's
  own field instead of the real trigger (this is what the first
  implementation attempt did, and it silently captured the wrong element).
  The render-phase read uses the one ref-during-render pattern
  `eslint-plugin-react-hooks`'s newer `react-hooks/refs` rule allows
  (lazy-init guarded by `ref.current == null`). Re-verified live for both
  the conditionally-rendered pattern (`AddTransactionDialog`,
  `KeyboardShortcutsModal`) and the always-mounted `isOpen`-prop pattern
  the hook also supports (`PasswordPromptDialog`).
- **Files**: `src/hooks/useFocusReturn.ts` (new),
  `src/features/transactions/components/KeyboardShortcutsModal.tsx`,
  `src/features/transactions/components/ImportDialog.tsx`,
  `src/components/ui/AddTransactionDialog.tsx`,
  `src/components/ui/PasswordPromptDialog.tsx`,
  `src/components/onboarding/WelcomeModal.tsx`.
- **Test**: `src/hooks/useFocusReturn.test.tsx` (new, 2 cases — one per
  call shape, both include an `autoFocus` field to guard the exact trap
  above).
- **Commit**: `d722a27`.

### HIGH — EditPanel's Save silently clobbered a concurrent edit from another surface
- **What I did**: Opened EditPanel on a "Hungerbox ₹20" row, then —
  without closing it — pressed the `8` keyboard shortcut to categorise
  that *same* row (still selected underneath the open panel) to a
  different category. Confirmed via the network panel and
  `/transactions/processed` that the category changed correctly
  server-side. Then clicked "Save changes" in the still-open panel,
  which had never been touched.
- **What happened**: The category instantly reverted to whatever it was
  when the panel opened — confirmed against the server both before and
  after clicking Save. `handleSave` always PATCHed the panel's *entire*
  local snapshot (amount, description, date, category, shares, notes,
  tags, type) regardless of what the user actually edited, so an untouched
  field always overwrote a change made through any other surface — the
  keyboard 1–9 shortcut, drag-to-categorise, and bulk actions can all
  reach the same row while its panel sits open. Same root cause as the
  settle-toggle bug above (the stale `txn` snapshot prop), but a much
  larger blast radius: the whole form, not one toggle.
- **What should happen**: Only fields the user actually changed in this
  panel are sent; an untouched field leaves the server's current value
  alone.
- **Fix**: `handleSave` now builds the PATCH payload from a per-field diff
  against `txn`'s original values. The backend's
  `PATCH /transactions/processed/{id}` already applies each field
  independently (`if body.field is not None: ...`) — confirmed by reading
  `app/routers/transactions.py` and `app/schemas.py` directly, every field
  on `PatchProcessedTransactionRequest` is `Optional` with a `None`
  default — so omitting an untouched field is enough; **no backend
  change**. `isDirty` picked up the `txn_type` comparison it was missing
  (needed for the same diff) and a real shares-*value* comparison (it
  previously only checked which people were included, so editing a share
  amount with no membership change wasn't flagged dirty either).
  Re-verified live: category correctly stayed on the keyboard shortcut's
  value after clicking Save in the untouched panel.
- **Files**: `src/features/transactions/components/EditPanel.tsx`.
- **Test**: `src/test/flows/edit-panel-partial-save.test.tsx` (new, 3
  cases — confirmed 2 of 3 fail without the fix).
- **Commit**: `c2f4e16`.

### Build-breaking — IntersectionObserver test mock failed `tsc -b`
- **What happened**: The Settings-clean-URL test (added for the first HIGH
  fix above) stubbed `window.IntersectionObserver` with a class declared
  `implements IntersectionObserver`. A DOM-lib update added a required
  `scrollMargin` member the mock didn't have, so `npm run build` failed —
  `npm test` stayed green throughout (vitest doesn't typecheck), which let
  it slip past the gate once already.
- **Fix**: Dropped the `implements IntersectionObserver` clause (kept the
  existing `as unknown as` cast) — the mock only needs to satisfy what
  `SettingsPage`'s usage actually calls, not the full DOM interface, and
  shouldn't break again on a future DOM-lib bump for a property nothing
  here touches.
- **Files**: `src/test/flows/period-persistence.test.tsx`.
- **Commit**: `c595113`.

---

## Deferred

### MEDIUM — ConfirmDialog, CategoryDeleteDialog and AddBudgetModal have no `role="dialog"` or Escape handling
- **What I did**: While auditing every `role="dialog"` component for the
  focus-return fix above, grepped for the same pattern across
  `src/components/ui` and `src/features/*/components` and found these
  three render a modal-styled overlay with **no** `role="dialog"`,
  `aria-modal`, or `Escape`-to-close listener at all — unlike every other
  modal in the app.
- **Why deferred**: A real, separate gap (screen readers won't announce
  these as dialogs; keyboard users can't Escape out of them), but fixing
  it properly means adding full dialog semantics *and* keyboard handling
  to three more components — a distinct piece of work from the five
  dialogs this pass's keyboard sweep was already touching, not a
  one-line addition to fold in without rushing it.
- **Needs a decision from the user**: whether this is worth its own
  follow-up pass, given it's the same shape as the fix already applied to
  the other five dialogs.

### LOW — "% of income" isn't clamped for pathological values
- **What I did**: Created a ₹99,99,99,999 (≈₹100 crore) test expense to
  check the adversarial-amount case, then checked Home.
- **What happened**: Totals computed correctly with no crash/NaN, proper
  Indian-locale comma grouping even at 9 figures (`₹1,01,00,95,796`) — but
  the "% of income" stat rendered `-460422%` verbatim, six digits, no
  abbreviation or cap.
- **Why deferred**: Only reachable with a single-transaction amount three
  orders of magnitude past anything in real usage; the number is at least
  *correct*, just unabbreviated. Test data removed afterwards, so this
  isn't reproducible in the account's normal state — noting it in case
  the actual figure is worth a `formatCompact`-style cap regardless.

### Backend data/logic, not a frontend defect — negative-amount imports classify as `txn_type: "refund"` even into an income category
- **What I did**: Imported a row with `amount: -500` (credit convention)
  through bulk-paste, which correctly displayed as `+₹500.00` while
  pending. Categorised it into "misc income" and re-checked
  `/transactions/processed`.
- **What happened**: `amount`/`effective_amount` stayed negative
  (`-500.00`) and the backend's `classify_txn_type` heuristic assigned
  `txn_type: "refund"`, not `"income"` — an internally inconsistent pair
  (an income-labelled category on a "refund"-typed row) that the frontend
  then faithfully renders as `-₹500.00` in the processed list, sign
  flipped from how it displayed while pending.
- **Why not fixed here**: The frontend renders exactly what the backend
  returns and correctly folds the negative amount into the dashboard
  totals — no frontend defect found. The classification itself is a
  backend heuristic (`classify_txn_type`), out of scope per this pass's
  "no backend changes" rule; documented here with evidence rather than
  adding a client-side special case for backend-inconsistent data, per
  the same reasoning the first pass used for the "outside the plan"
  income-category finding.
- **Also confirmed working as designed**: `POST /transactions/raw` (the
  manual-entry endpoint) rejects a negative `amount` outright (422,
  "amount must be greater than 0") — client and server agree amounts are
  always positive for manual entry; only the signed-amount import
  convention (PDF/bulk-paste) differs, by design.

---

## Verified working, no defect found

- **Import — PDF**: uploaded a real generated PDF (bordered table, 3 rows,
  mixed debit/credit) through Transactions → Import → Bank statement PDF —
  parsed correctly, correct signs, correct amounts, imported cleanly into
  the pending queue (`50` → `53` transactions). Uploaded the same file
  password-protected: `PasswordPromptDialog` appeared, wrong password
  showed a clear inline retry error (network 422, handled), correct
  password unlocked and correctly flagged all 3 rows as duplicates of the
  already-imported unlocked copy ("0 to import").
- **Import — paste rows**: a malformed row (`"amount": "$50"`) rejected
  the whole batch with one specific, row-numbered error and no partial
  import. A row duplicated within the same paste, and a row matching an
  existing transaction, were both auto-excluded and clearly labelled
  ("possible duplicate(s)"); cancelling mid-import (closing the dialog
  without clicking Import) left the transaction count unchanged.
- **Import — manual entry**: submitting with every field empty showed all
  three "required"/"valid amount" errors together; a zero amount is
  correctly rejected ("Enter a valid positive amount" — zero is not a
  valid transaction amount, this is correct behaviour, not a bug).
- **Split arithmetic**: a 3-way uneven percentage split (anshul 50% / priya
  30% / rahul 20% on a ₹290.00 transaction) computed exactly against
  `src/lib/shareMath.ts` — ₹145.00 / ₹87.00 / ₹58.00, your share ₹0.00 —
  confirmed via the UI, the split badge's own tooltip, and the raw API
  response. Settling and unsettling a share (after the staleness fix
  above) correctly moved the total between Home's "owed" figure and
  Insights → People, which agreed with each other at every step.
- **Keyboard — arrow-key row navigation**: `↓`/`↑` on Transactions
  correctly move the `.row.sel` selection one row at a time; `Escape`
  correctly deselects.
- **Keyboard — Escape**: confirmed closing the `?` shortcuts modal, the
  EditPanel/ProcessPanel side panel (`TxnSidePanel`, shared by desktop
  side-panel and mobile bottom-sheet), and the Import dialog — all via a
  real dispatched `Escape` keydown, not just a close-button click.
- **Keyboard — category shortcut keys (1–9)**: confirmed via a real
  keypress against a selected row, both for a pending row
  (`quickCategorize`) and a processed row (`changeCategory`).
- **Keyboard — visible focus rings**: a single global `:focus-visible`
  rule in `base.css` (2px accent-halo outline, 2px offset) applies
  app-wide; spot-checked, not regressed.
- **Concurrency — mutation survives mid-flight navigation**: fired a
  category-change keydown and navigated to `/dashboard` in the same tick,
  before the request could resolve. React Query mutations aren't tied to
  component lifecycle, so the PATCH completed in the background regardless
  — confirmed the category change landed server-side. No data loss from
  interrupted navigation.
- **Adversarial data**: a 200-character merchant name (renders via the
  existing `text-overflow: ellipsis` truncation, same as the longest real
  descriptions already in the account — no layout break); ₹99,99,99,999 —
  no crash, no NaN, correct Indian-locale grouping even at 9 figures; a
  category named `🎉 مرحبا party` (emoji + RTL) rendered correctly
  everywhere it appeared, including Home's insight cards; a transaction
  dated 1970 passed validation cleanly (only a *future* date is now
  rejected, per the fix above). All test data cleaned up afterwards via
  direct API calls.

---

# Phase 9 — 2026-09-21 (visual glitch sweep + motion polish)

Combined live-driven sweep (Chrome, 1440px and 412px, light and dark,
`dash-brainstorm@example.com`, June 2026) of the four defects the user
reported directly, plus a measured DOM audit (computed-style contrast
ratios, bounding-box overlap detection, overflow/clip detection, target-size
checks) across `/dashboard`, `/transactions`, `/insights` and `/budget`, plus
a follow-up income-figure defect reported separately. Severity scale matches
prior phases: **CRITICAL** / **HIGH** / **MEDIUM** / **LOW**.

---

## Fixed

### HIGH — Two competing scroll contexts: the side rail detached from the page and left dead space below the content
- **What I did**: Reproduced the user's screenshot live — scrolled Home
  with the console open, and separately measured `document.documentElement
  .scrollHeight` vs `.clientHeight` and `main.scrollHeight` vs
  `.clientHeight` at every stage of the fix.
- **What happened**: `.sidenav` was `position: sticky` inside `.app {
  display: grid; grid-template-columns: 208px 1fr; min-height: 100vh }`,
  while `main` (Layout.tsx) already had its own `overflow-y: auto`. As a
  CSS grid item with `overflow: visible`, `.sidenav`'s *automatic minimum
  size* (per the CSS Sizing spec, min-height:auto resolves to the content's
  min-content height for any item whose own `overflow` is `visible` — the
  "auto minimum size is 0" carve-out only applies when the item itself sets
  a non-visible `overflow`) could exceed its own `height: 100vh` whenever
  the rail's content (nav + Explore + footer) was taller than the viewport.
  That stretched the grid row — and therefore `.app` and the *window* —
  past 100vh, on top of `main`'s own independent scroll. Two scroll owners
  for one page: the sticky rail rode with the window scroll until its
  now-taller-than-100vh box ran out, then detached, leaving `.nav-foot`
  stranded mid-page with a blank band below the content — reproduced
  exactly via `window.scrollTo(0, 1000)` even after the primary fix below,
  and confirmed a mouse-wheel event dispatched *over the sidenav*
  (`WheelEvent` with `bubbles: true`) moved `window.scrollY`.
- **What should happen**: one scroll owner (`main`); the rail is fixed,
  full height, with its own internal scroll if its content is ever taller
  than the viewport.
- **Root cause, two layers**:
  1. `.sidenav`'s grid-item auto-min-size stretching `.app` past 100vh.
  2. Even after fixing (1), `document.documentElement.scrollHeight`
     measured up to ~1617px against a 900px `clientHeight` with `main`
     mounted (dropping to exactly 900 with `main.style.display = 'none'`)
     — a residual Chrome flex/overflow measurement quirk we could not
     isolate to a specific misconfigured rule in this tree, but the
     *symptom* (the window itself being technically scrollable) was real
     and reproducible via a wheel gesture over the fixed sidenav, which
     has nothing of its own to scroll and so bubbled the event to the
     document.
- **Fix**:
  - `.sidenav` is now `position: fixed; top: 0; left: 0; width: 208px;
    height: 100vh; overflow-y: auto` — genuinely out of flow, with its own
    internal scroll for tall content. `.app` no longer lays it out via
    grid; `padding-left: 208px` (desktop only) reserves its width instead.
  - Belt-and-suspenders for the residual scroll-height quirk: `Layout.tsx`
    adds an `app-shell-active` class to `<html>` on mount (removed on
    unmount) and `html.app-shell-active, html.app-shell-active body {
    height: 100%; overflow: hidden }` in `base.css` hard-disables
    window-level scroll while the shell is mounted. Scoped so
    `/login`, `/register` and the 404 page (rendered outside `Layout`)
    keep normal window scroll on a short/zoomed viewport.
  - Verified: `window.scrollTo` no longer moves anything, a dispatched
    wheel event over the sidenav no longer moves `window.scrollY`, and
    `main` scrolls through its full content (confirmed by scrolling to the
    bottom and screenshotting — Trend/"Needs you" sections render with no
    dead space, sidenav stays pinned with its footer visible throughout).
- **Files**: `src/styles/components.css` (`.app`, `.sidenav`),
  `src/styles/base.css` (`html.app-shell-active`),
  `src/components/layout/Layout.tsx` (`useLockWindowScroll`).
- **Test**: `src/components/layout/Layout.test.tsx`.

### HIGH — Sticky table header rendered through the empty-state message and the first data row
- **What I did**: Filtered Transactions to zero results, and separately
  confirmed with real data (per the coordinator's note that it reproduces
  there too, not only on the empty state) — measured `<th>`'s and the
  empty-row/first-row `<td>`'s bounding rects.
- **What happened**: `.tbl.sticky th { top: var(--topbar-h) }` (52px) —
  double-counted. `.topnav` is a fixed-height *sibling* of `main`
  (Layout.tsx), not inside `main`'s own scroll container, so `main`'s
  scrollport already starts below the top bar; adding another 52px offset
  pushed the header down into the row beneath it. Traced the sticky
  containing block further: `.card:has(>.tbl) { overflow-x: auto }` forces
  `overflow-y` to also compute to `auto` per the CSS overflow computed-
  value adjustment (one non-visible axis makes both non-visible), so
  `.card` — not `main` — is `.tbl.sticky th`'s actual sticky containing
  block; its `top` offset was therefore a permanent 52px push, not a
  scroll-triggered one, which is why it reproduced even with the table
  nowhere near needing to scroll. `.panel` and `.setnav` had the identical
  `calc(var(--topbar-h, 52px) + 24px)` double-count.
- **Fix**: `.tbl.sticky th { top: 0 }`; `.panel`/`.setnav { top: 24px }`
  (the container's own padding, with the erroneous topbar term removed).
- **Files**: `src/styles/components.css`.
- **Test**: `src/styles/phase9-css.test.ts`.

### MEDIUM — KPI row numbers didn't share a baseline, and the ₹ glyph collided with the first digit
- **What I did**: Compared Home's In/Out/Saved row pixel-by-pixel at
  1440px and 412px, both themes.
- **What happened**: `.money-row { display: flex; align-items: flex-end }`
  bottom-aligned each `.money` column's own (label, value[, sub-line])
  stack independently. "Saved" (and "Left to spend") carry an extra
  sub-line ("56% of income") that "In"/"Out" don't, so flex's shared
  cross-axis alignment lifted the *values* of the single-line columns
  relative to the two-line ones. Separately, `.money .v` and `.hero-num`
  used `letter-spacing: -0.02em`/`-0.03em` at 26px/40-64px — tight enough
  that the ₹ glyph (more side-bearing than a digit) visibly touched the
  first digit.
- **Fix**: `.money-row` is now a 3-row grid (`grid-auto-flow: column;
  grid-template-rows: repeat(3, auto)`), each `.money` a subgrid item
  (`grid-template-rows: subgrid; grid-row: span 3`) — label, value and
  sub-line each get one shared row across every column, so same-row
  content aligns regardless of which columns actually use the third row.
  Not wrapped (unlike the old flex-wrap) since subgrid needs one shared
  row group; `overflow-x: auto` is a safety net, not the primary mobile
  layout — verified all 4 columns still fit at 412px with no scroll
  needed. Letter-spacing halved (`-0.01em` / `-0.015em`) on both.
- **Files**: `src/styles/components.css`.
- **Test**: `src/styles/phase9-css.test.ts`.

### MEDIUM — Split avatars unreadable, and the split tooltip clipped at the viewport edge
- **What I did**: Inspected `.people .avatar` (the "Y A" split chips) and
  the split button's native `title` at 1440px near the right edge of the
  Transactions table.
- **What happened**: `.people .avatar` had no `border-radius` at all
  (rendered as squares, not chips) at 20px/9px text with an inherited text
  color — measured under both the 4.5:1 text and 3:1 non-text thresholds
  depending on theme/ancestor color. The "Split N ways — Total ₹X · you
  ₹Y…" hint was a native `title` attribute, which can't be clamped or
  flipped and got cut off at the right viewport edge, and can't escape an
  ancestor's `overflow` clip.
- **Fix**: `.people .avatar` is now 22px, `border-radius: 50%`, with an
  explicit background/text pair per theme (light: `--ink-2`/`--bg` =
  10.4:1; dark: `--ink-3`/`--bg` = 7.7:1 — both computed and verified
  against the actual token hex values). Replaced the native `title` with a
  new `Tooltip` component (`src/components/ui/Tooltip.tsx`): positions via
  `getBoundingClientRect` into a `document.body` portal (escapes any
  ancestor clip by construction), flips above the trigger when there's no
  room below, and clamps horizontally so it never runs off either edge.
  `role="tooltip"`, wired via `aria-describedby`. Applied to both the
  split-avatars button and the "of ₹X" sub-line in `TransactionRow`.
- **Files**: `src/styles/components.css`, `src/components/ui/Tooltip.tsx`,
  `src/features/transactions/components/TransactionRow.tsx`,
  `src/lib/motion.ts` (`tooltipIn` variant).
- **Test**: `src/test/flows/transactions-row-a11y.test.tsx`.

### HIGH — Budget → "Expected income" always showed ₹0 in "Received in \<month\>"
- **What I did**: Read `buildIncomeRows` (`budgetMath.ts`) next to
  `GET /dashboard/summary`'s backend filter.
- **What happened**: `receivedThisMonth` was derived from
  `GET /dashboard/summary`, which the backend filters to `txn_type in
  (expense, refund)` — income categories are never present in it, so the
  lookup always fell through to 0. `ytdReceived` was correct because it
  comes from the YTD endpoint, which does include income. Invisible until
  now because every category on the seed account was `is_income: false`.
- **Fix (frontend only, no backend change)**: `useBudgetData` now fetches
  the selected month's processed transactions
  (`qk.transactions.processed(year, month, ..., mode)`, shared cache key
  with Home/Transactions) and derives `incomeByCategory` the same way
  `useDashboardData` does (`txn_type === 'income'`, `abs(effective_amount)`
  summed per category). `buildIncomeRows` now takes that instead of the
  expense summary; `ytdReceived`'s abs()-of-negative convention is
  unchanged.
- **Files**: `src/features/budget/lib/budgetMath.ts`,
  `src/features/budget/hooks/useBudgetData.ts`.
- **Test**: `src/features/budget/lib/budgetMath.test.ts` — income category
  with activity, one without (reads 0, not NaN), and the negative-amount
  abs() convention.

### HIGH — `.sr-only` didn't actually hide the chart fallback tables
- **What I did**: Live DOM audit flagged both chart data tables
  (TrendBlock, CategoryTrendChart — MASTER.md §6's screen-reader fallback)
  as visible, ~172x174px, overlapping real content ("Needs you", People
  rows). Measured directly: `getBoundingClientRect()` on
  `table.sr-only` returned `{width: 171.6, height: 173.6}` with
  `position: absolute` correctly applied but `width`/`height` not.
- **What happened**: CSS 2.1's auto table-layout algorithm treats a
  `<table>`'s specified `width` as a *minimum*, not a cap — the table can
  still grow to fit its cells' required minimum content width. `.sr-only`'s
  `width: 1px; height: 1px` recipe (correct for any ordinary block element)
  was therefore a no-op on a `<table>` specifically. `table-layout: fixed`
  did not reliably resolve it either.
- **Fix**: defined `.sr-only` explicitly and authoritatively in
  `utilities.css` (this stylesheet is `@import`ed after `tailwindcss` with
  no `@layer` wrapper, so it's emitted unlayered — unlayered CSS always
  wins the cascade over any `@layer`-nested rule regardless of source
  order or specificity, so this definition can't be shadowed by anything).
  For the two chart tables specifically, moved the `sr-only` class off the
  `<table>` onto a wrapping `<div>` instead — a plain block box has none
  of a table's sizing quirks. Verified live: `div.sr-only`'s
  `getBoundingClientRect()` is now exactly `{width: 1, height: 1}`.
- **Files**: `src/styles/utilities.css`,
  `src/features/dashboard/components/TrendBlock.tsx`,
  `src/features/category/components/CategoryTrendChart.tsx`.
- **Test**: `src/features/dashboard/components/TrendBlock.test.tsx`.

### HIGH — `--ink-4` (non-text-only per MASTER.md §2) used on real text in several places
- **What I did**: Measured contrast for `.eyebrow`, `.tbl th`, and the
  Transactions keyboard-shortcuts hint against both themes.
- **What happened**: `.eyebrow` (period labels, KPI labels, section
  eyebrows, side-nav "Explore") measured 2.46:1 light / 4.07:1 dark.
  `.tbl th` (every table header app-wide) measured 2.56:1 / 3.81:1. The
  "1–9 categorize · ↑↓ navigate" hint measured 2.46:1. All below the
  4.5:1 text threshold; `--ink-4` is reserved non-text (borders,
  dividers, disabled icons) by design.
- **Fix**: all three moved to `--ink-3` (light: 4.8:1+, dark: 7.2:1+ —
  passes comfortably in both themes). While in `components.css`, swept
  every other `--ink-4`-on-text declaration in that file and fixed the
  same way: `.card-eyebrow`, `.donut-center .lbl`, `.pace-row .pace-amount
  .of`, and the `.input`/`.textarea`/`.input-field`/`.field input`
  placeholder colors (7 more sites).
- **Files**: `src/styles/components.css`,
  `src/features/transactions/components/FilterBar.tsx`.
- **Test**: `src/styles/phase9-css.test.ts`.

### MEDIUM — Segmented-control buttons marginally failed contrast
- **What I did**: Measured `.seg button` (unselected state — "Needs
  review" / "Split" / "By tag" on Transactions, period toggles elsewhere)
  at 11.5px/500.
- **What happened**: 4.40:1 — just under the 4.5:1 threshold.
- **Fix**: `--ink-3` → `--ink-2` for the resting state (comfortably passes
  at any size); hover bumped `--ink-2` → `--ink` to keep a visible step.
- **Files**: `src/styles/components.css`.
- **Test**: `src/styles/phase9-css.test.ts`.

### MEDIUM — Avatar initials near-invisible against the default/gradient colors
- **What I did**: Live DOM audit reported the side-nav/profile avatar as
  white text on `rgba(0, 0, 0, 0)` (1.00:1). Measured directly: `prefs.color`
  is a `linear-gradient(...)` string assigned via the `background`
  shorthand, which only ever sets `background-image` — `background-color`
  stays at its initial `transparent`. A contrast tool reading only
  `background-color` (not `background-image`) reports exactly this false
  1.00:1. Screenshotted the live avatar to confirm it's visually legible,
  not literally invisible — so the finding was a real-but-smaller issue,
  not the dramatic one first reported. Computed actual contrast for all 12
  `AVATAR_COLORS` gradients at their midpoint (roughly where the initials
  sit) against white text: 9 of 12 fall under 4.5:1 (worst: Teal 2.89:1,
  Kosh amber — the default — 2.69:1).
- **Fix (mitigation, not a full repaint)**: `Avatar.tsx` now sets an
  explicit solid `backgroundColor` fallback underneath the gradient (so
  `background-color` is never literally transparent, closing the tool's
  false positive) and a `text-shadow` on the initials for real legibility
  across the whole gradient range without changing the palette.
- **Deferred**: rewriting the 12-gradient palette so every stop clears
  4.5:1 against white is a genuine design change (this is a user-facing
  personalization feature, not incidental chrome) — see Deferred below.
- **Files**: `src/components/ui/Avatar.tsx`.

### LOW — Truncated merchant/notes text had no way to read the full value
- **What I did**: Live audit measured 5+ truncated merchant names per page
  (e.g. `scrollWidth: 720` vs `clientWidth: 191` for one UPI description)
  with `text-overflow: ellipsis` and no `title`/`aria-label`.
- **Fix**: added `title={txn.description}` / `title={txn.notes}` to
  `TransactionRow`'s merchant/notes cells.
- **Files**: `src/features/transactions/components/TransactionRow.tsx`.

### LOW — Transactions row's "more actions" button had no accessible name
- **What I did**: Live audit found 50 instances (one per row) of
  `button.btn.ghost.icon.sm` with no text, `aria-label` or `title` — the
  `⋯` context-menu trigger; its icon is `aria-hidden`.
- **Fix**: `aria-label="More actions"`, `aria-haspopup="menu"`,
  `aria-expanded={hasMenu}`.
- **Files**: `src/features/transactions/components/TransactionRow.tsx`.
- **Test**: `src/test/flows/transactions-row-a11y.test.tsx`.

### MEDIUM — `ConfirmDialog`, `CategoryDeleteDialog`, `AddBudgetModal` had no dialog semantics
- **What I did**: Follow-up on the item the Phase 8c keyboard sweep
  explicitly deferred (see that phase's Deferred section) — the other five
  dialogs in the app (`AddTransactionDialog`, `ImportDialog`,
  `KeyboardShortcutsModal`, `PasswordPromptDialog`, `WelcomeModal`) already
  had `role="dialog"`, `aria-modal`, Escape handling and `useFocusReturn`;
  these three didn't.
- **Fix**: all three now have `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby` pointing at their heading, a window-level Escape
  listener gated on open state (matching `ImportDialog`'s exact pattern),
  and `useFocusReturn`. `CategoryDeleteDialog` and `AddBudgetModal` also
  had no enter animation at all (or an incomplete one) — both backdrops
  now fade in with the same shared `fade-up`/`pop` keyframes every other
  dialog uses, rather than a new one-off.
- **Files**: `src/components/ui/ConfirmDialog.tsx`,
  `src/features/budget/components/CategoryDeleteDialog.tsx`,
  `src/features/budget/components/AddBudgetModal.tsx`.
- **Test**: `src/test/flows/dialog-a11y-parity.test.tsx`.

---

## Investigated, not a defect

### Budget page: chart `<g>`/`<ellipse>` extends 9px past the right viewport edge
- **What I did**: The live audit flagged an SVG element at `x=1449` in a
  1440px viewport on `/budget`. Traced every `<ellipse>` on the page to its
  ancestor chain.
- **What I found**: every one belongs to `tsqd-open-btn-container` —
  TanStack Query Devtools' own floating toggle widget
  (`{IS_DEV && <ReactQueryDevtools .../>}` in `App.tsx`), not app code.
  Confirmed the same class of finding already logged in the Phase 8c
  second pass ("TanStack Query Devtools icon overlaps the mobile bottom
  tab bar") — dev-only tooling, stripped entirely from the production
  build (verified by building and serving `dist/` directly: no devtools
  widget, no stray SVG). Not fixed; noted so it isn't rediscovered as a
  mystery overflow in a future sweep.

---

## Deferred

### Avatar-color palette: 9 of 12 gradients fail 4.5:1 against white initials
- Computed contrast at each gradient's midpoint (roughly where the
  initials sit) for all of `useAvatarPrefs.AVATAR_COLORS`: Kosh amber
  (the default) 2.69:1, Sapphire 3.54:1, Emerald 3.26:1, Terracotta 3.46:1,
  Lavender 3.59:1, Teal 2.89:1, Caramel 3.61:1, Coral 4.17:1, Ruby/Violet/
  Midnight/Slate pass. This is a user-facing personalization feature — the
  colors are a deliberate design choice a user picks for themselves, not
  incidental UI chrome — so rewriting the palette to guarantee 4.5:1 on
  every stop is a design decision, not a pure bug fix, and is out of scope
  for a "no redesign" bug-fix pass. Mitigated in the meantime with a
  text-shadow (see Fixed, above). Needs the user to decide whether to
  darken the palette, add a fixed dark scrim behind initials regardless of
  color, or accept the current mitigation.

### Interactive targets under 24-44px
- Live audit measured: `?` shortcuts button 18×18, Transactions row
  checkboxes 13×13, "Show 5 deleted" 84×18, side-nav "Insights" link
  46×15, Budget's inline edit buttons 60-69×20. MASTER.md's ledger
  aesthetic is deliberately dense (hairline borders, compact tables,
  small controls throughout); WCAG's 44×44 (AAA) or even 24×24 (AA,
  2.5.8) minimum genuinely conflicts with that density at several of these
  sites — a checkbox or inline edit button inside a dense table row can't
  grow to 44px without changing row height and therefore the whole table's
  proportions. This needs a design decision (expand hit areas via
  invisible padding without growing the visible control, vs. accepting the
  density trade-off for a power-user table), not a blind size bump, so
  it's deferred rather than half-fixed.

### Broader `--ink-4`-on-text sweep across TSX inline styles
- The `components.css` sweep above fixed every `--ink-4`-on-text
  declaration in that stylesheet. A grep across `src/**/*.tsx` for
  `color: 'var(--ink-4)'` / `text-[var(--ink-4)]` turns up ~50 more sites
  (placeholders, dividers like "·", numbered-list markers, disabled-state
  icons, secondary metadata lines) spread across Settings, Upload, Budget,
  the shared `MultiSelect`/`SearchableSelect`/`Toast`/`EmptyState`
  components, and both auth pages. Several of these are genuinely
  non-text (icon `color` props, which fall under the 3:1 non-text
  threshold, not 4.5:1) and some are decorative punctuation rather than
  meaningful text — a correct fix requires per-instance judgment this pass
  didn't have budget for. Flagged here rather than either leaving it
  fully unaudited or making ~50 speculative changes with no live
  verification.

---
