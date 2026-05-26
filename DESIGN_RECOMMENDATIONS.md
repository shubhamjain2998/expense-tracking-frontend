# Design Recommendations — Personal Finance

**Goal:** strengthen the existing "refined-minimal financial broadsheet" aesthetic — *not* rebuild it. Every recommendation extends current primitives (`src/styles/tokens.css`, `src/styles/components.css`, `src/components/ui/`). Mobile (Pixel 9) gets a dedicated section because the current desktop-first scaling is the root cause of the bad mobile experience.

---

## 0. Aesthetic POV (one sentence to commit to)

> A **calm, editorial finance journal** — feels like reading a well-set quarterly report on heavy paper, not a SaaS dashboard. Generous whitespace, one hero typographic moment per page, semantic color used surgically (not decoratively), and tabular numerals everywhere a number lives.

This is what your tokens *already* aim for. The current execution is 70% there; the recommendations below close the gap.

---

## P0 — Mobile UX (highest impact for Pixel 9)

Every issue here is mechanical and fixable without redesigning anything. Pixel 9 is a 6.3" screen at 412dp wide — your current sizing assumes desktop hover/cursor precision.

### P0.1 Touch targets are below 44dp everywhere

| Component | Current | Recommended (mobile) |
|---|---|---|
| `.btn` | 30px | 30px desktop / **40px mobile** |
| `.btn.sm` | 26px | keep desktop / **36px mobile** |
| `.input` | 30px | 30px desktop / **40px mobile** |
| `.seg button` | 24px | 24px desktop / **34px mobile** |
| `.chip` | 22px | keep — display only |
| `.tbl td` (row) | ~36px | **52px on mobile** (full-row tap) |
| Sidebar nav link | ~28px | **44px on mobile** |
| FAB (`QuickAddFAB`) | 48×48 | keep — already good |

**Implementation:** add a `@media (max-width: 767px)` block at the bottom of `components.css` that bumps heights and font sizes. No component code changes needed because they all use the class.

```css
@media (max-width: 767px) {
  .btn { height: 40px; padding: 0 14px; font-size: 14px; }
  .btn.sm { height: 36px; padding: 0 12px; font-size: 13px; }
  .btn.icon { width: 40px; }
  .btn.sm.icon { width: 36px; }
  .input, .input-field { height: 40px; font-size: 16px; /* prevents iOS zoom */ }
  .seg button { height: 34px; font-size: 13px; padding: 0 14px; }
  .tbl td { padding: 14px 12px; font-size: 14px; }
  .tbl th { padding: 10px 12px; }
}
```

Setting input `font-size: 16px` on mobile is the single biggest UX win — it stops Chrome from zooming on focus, which is what makes form-filling feel jerky on Pixel.

### P0.2 No bottom tab bar — primary nav is buried in a hamburger

The hamburger pattern is the #1 reason Pixel 9 thumb-reach feels bad. The top-left corner is the hardest place to tap one-handed on a 6.3" phone.

**Proposal:** add a `BottomTabBar` for mobile only, keep the existing sidebar drawer as the "more" menu.

```
┌────────────────────────┐
│  Dashboard content     │
│  …                     │
│                        │
│              [+]  FAB  │
├────────────────────────┤
│ 🏠   📋   ⬆   💰   ⚙  │
│ Home Txns Upld Bdgt Mor│
└────────────────────────┘
```

- 5 items, 56px tall, sticky to bottom with `env(safe-area-inset-bottom)` padding
- Active state = `--ink` icon + `--ink` label; inactive = `--ink-3`
- `Transactions` shows the pending badge (you already compute `pendingCount`)
- Moves the FAB to bottom-right above the tab bar (raise by 64px on mobile)
- Hamburger goes away; "More" tab opens the existing `Sidebar` drawer for Settings/Profile/Sign out

**Where:** new `src/components/layout/BottomTabBar.tsx`, mount in `Layout.tsx` with `md:hidden`. The sidebar drawer keeps its current behavior but is now opened from the "More" tab instead of TopNav.

### P0.3 TopNav is wasted space on mobile

The current 44px top header on mobile shows breadcrumb + search + theme toggle. That's three things competing for a strip you mostly scroll past.

**Proposal — mobile-only TopNav:**
- Show only the **page title** (large, 17px, `font-semibold`) and a single **search icon** that opens a full-screen search overlay
- Move theme toggle into the "More" tab / Settings
- Make the title row 52px tall and let it scroll away (`position: sticky` with `top: -52px` so it disappears when scrolling down, reappears scrolling up — iOS Mail pattern)

### P0.4 Dashboard is a 10-section vertical scroll on mobile

You have 10 stacked cards on `/dashboard`. On Pixel 9 this is a ~6-screen scroll with no way to jump.

**Proposal:** add a sticky "section pill bar" right under the TopNav on mobile:

```
[Overview] [Budget] [Categories] [Trend] [YTD] [Splits]
   ▔▔▔▔▔
```

- Reuses your `.seg` primitive (or a horizontally scrollable variant)
- Each pill scrolls to a `<section id="…">` anchor with `scroll-margin-top: 56px`
- Active section detected via `IntersectionObserver`
- Desktop unchanged (still full vertical scroll, no pill bar)

### P0.5 Transactions table → mobile cards

Hiding 4 columns (drag, check, tags, split) helps but the residual table is still cramped. Below 767px, **stop rendering `.tbl` and render row cards instead**:

```
┌─────────────────────────────────────────┐
│ Mar 14 · Trader Joe's        −₹1,240.00 │
│ Groceries · #household                  │
└─────────────────────────────────────────┘
```

- Single tap = open existing side panel (already a bottom sheet on mobile ✓)
- Long-press = enter selection mode (replaces drag-to-categorize, which doesn't work on touch anyway)
- Swipe-left = delete; swipe-right = quick-categorize to last-used
- 64px tall, full-width, separated by `border-bottom: 1px solid var(--line)`

This is a `TransactionRowMobile.tsx` next to the existing row — same data, different layout. Pick at the list level with a viewport hook or `md:` Tailwind.

### P0.6 Bottom sheet needs a drag handle and dismiss-on-swipe

`.txn-side-panel` becomes a 85vh bottom sheet on mobile but has no visual affordance that it's a sheet, and no way to dismiss except the existing close button.

**Add:**
```css
@media (max-width: 767px) {
  .txn-side-panel::before {
    content: '';
    display: block;
    width: 36px; height: 4px;
    background: var(--line-strong);
    border-radius: 2px;
    margin: 8px auto 4px;
  }
}
```

Plus a `useSwipeDown` hook on the panel that closes when dragged > 80px.

### P0.7 Safe-area insets

Add to `index.html` viewport meta:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

And apply in `base.css`:
```css
body { padding-bottom: env(safe-area-inset-bottom); }
```

Without this, the FAB and future bottom tab bar collide with the Pixel 9 gesture handle.

---

## P1 — Typography (biggest visual lift, low code risk)

You're using **Inter** for everything. Inter is the most-used font in SaaS — it's why the app reads as "generic dashboard." The numbers are your product's hero. They deserve their own voice.

### P1.1 Replace the type stack

**Body:** keep functional, but step away from Inter. Two strong options:

| Option | Character | Why |
|---|---|---|
| **Söhne** / **Söhne Mono** (commercial) | Modern, slightly warmer than Inter, used by Stripe & Linear | If budget allows, this is the gold standard |
| **General Sans** (free) | Geometric but humanist, less ubiquitous | Strong free pick — recommended |
| **Geist** (Vercel, free) | Tight, mechanical, very neutral | Safer but still recognizable |

**Display (the hero number on Dashboard & Transactions totals):** *this* is where the personality lives.

| Option | Character | Why |
|---|---|---|
| **Fraunces** (free, Google) | Variable serif with optical sizing | **Recommended** — gives the "editorial broadsheet" feel; settings can dial back its quirk |
| **GT Sectra** (commercial) | Editorial serif with cuts | Used by The Browser Company; expensive but unmistakable |
| **Tobias** (commercial) | Modern serif, financial-report energy | Pairs with anything |
| **Söhne Breit** | Sans-serif, condensed | If you want to stay sans-only |

**Mono (numbers in tables, KPIs, code-like values):** keep JetBrains Mono — it's already good. Or upgrade to **Berkeley Mono** (commercial, glorious) or **Commit Mono** (free).

### P1.2 New tokens

Add to `tokens.css`:
```css
:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'General Sans', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

Update `base.css` body to use `var(--font-body)`, and add a `.display` utility:

```css
.display {
  font-family: var(--font-display);
  font-variation-settings: 'opsz' 144, 'SOFT' 50, 'WONK' 0;
  letter-spacing: -0.03em;
  font-weight: 500;
}
```

Use `.display` for:
- The currency hero on `DashboardHeader` (`{formatCurrency(totalDebit)}`)
- The transactions period total on `TransactionsHeader`
- The budget month total on `BudgetPage`
- Empty-state titles
- Login/Register heading

That's ~5 places. Everywhere else keeps the body font.

### P1.3 Type scale

Current scale is "everything is 10–14px." For an editorial feel, you want more contrast.

| Token | Current | Recommended |
|---|---|---|
| Eyebrow | 10.5px | 10px, +letterspacing 0.12em |
| Body small | 11.5–12.5px | 12px (mobile 13px) |
| Body | 13–14px | 14px (mobile 15px) |
| Card title | 13px | 14px |
| Card hero | 30px | **40–56px display**, optical sizing |
| Page hero (Dashboard total) | 32–40px | **64–80px display** with `font-variation-settings: 'opsz' 144` |

A bigger hero is the single change that will make the app feel different. Don't be afraid of 72px on desktop. Below 1200px scale down with `clamp(40px, 6vw, 72px)`.

---

## P2 — Color & atmosphere

Your token system is *already excellent* — OKLCH, semantic, dark-mode mapped. Don't replace it. Refine it.

### P2.1 Pick a signature accent

Your `--accent` is `oklch(0.55 0.14 255)` — a generic SaaS blue. For "editorial finance" two directions work:

| Direction | Accent | Vibe |
|---|---|---|
| **Indigo ink** | `oklch(0.45 0.13 270)` | Bookish, calm, expensive |
| **Oxblood** | `oklch(0.42 0.16 22)` | Financial Times / Economist energy |
| **Forest** | `oklch(0.45 0.12 155)` | Pairs with --pos, very "money plant" |
| **Burnt amber** | `oklch(0.62 0.14 55)` | Warm, paper-friendly, distinct |

**My recommendation:** **Oxblood `oklch(0.42 0.16 22)`** for light theme, lift to `oklch(0.68 0.17 22)` in dark. It immediately distinguishes the app, pairs with all your category colors, and reads as "money/serious" without being a cliché green-positive. The `--pos` green stays green.

### P2.2 Warm the neutrals slightly

Pure `#fafaf9` is fine but stark. Push the background half a step toward paper:

```css
--bg: oklch(0.985 0.005 85);   /* was #fafaf9 → faint warm cream */
--surface: oklch(1 0.003 85);   /* was #ffffff → barely-perceptible warm */
--surface-2: oklch(0.965 0.005 85);
--line: oklch(0.93 0.006 85);
```

The change is sub-conscious — users won't say "warmer" but they'll feel it. The app no longer feels like a fluorescent-lit spreadsheet.

### P2.3 Add subtle atmosphere

Three additive treatments, each tunable:

**A. Paper-grain noise overlay** (the strongest single move):

```css
body::before {
  content: '';
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.025;
  background-image: url("data:image/svg+xml;utf8,<svg …turbulence baseFrequency='0.9'…/>");
  mix-blend-mode: multiply;
}
```

Dial opacity between 0.015–0.04. Disable in dark mode (grain in dark looks dirty).

**B. Card shadow refinement.** Current `--shadow-pop` is fine. Make it slightly warmer in light mode:
```css
--shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
--shadow-pop: 0 1px 2px oklch(0 0 0 / 0.04),
              0 12px 32px oklch(0.4 0.08 25 / 0.08);  /* warm umbra */
```

**C. Hero numbers get a subtle ink underline.** Optional but distinctive — gives the page a typographic anchor:
```css
.hero-amount {
  position: relative;
  display: inline-block;
}
.hero-amount::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -6px;
  height: 2px;
  background: var(--ink);
  transform: scaleX(0.3);
  transform-origin: left;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

### P2.4 Replace Material Symbols with Lucide or Phosphor

Material Symbols are recognizable as Google's design language and clash with the editorial direction. **Lucide** (already React-friendly, ~1000 icons, consistent 1.5px stroke) or **Phosphor** (more variants per icon, slightly more decorative).

**Recommendation:** **Lucide.** It's effectively the unofficial icon system for modern design-forward apps (Linear, Cal.com, Vercel). One install, drop-in replacement.

Migration is mechanical — every `<span className="material-symbols-outlined">name</span>` becomes `<NameIcon size={16} strokeWidth={1.5} />`. You can do it incrementally per file.

---

## P3 — Component primitives (extend, don't replace)

For each, the change is small and additive.

### P3.1 `.card` — add hierarchy variants

Currently every card is the same. Add three modifiers so the dashboard has rhythm:

```css
.card.hero       { padding: 28px 24px; }            /* page-top hero card */
.card.flush      { padding: 0; }                     /* table/list wrappers — exists */
.card.subtle     { background: var(--surface-2); border-color: transparent; }
.card.outlined   { background: transparent; }       /* defaults already this */
.card.elevated   { box-shadow: var(--shadow-pop); border-color: transparent; }
```

Use `card.hero` for the top section of each page so it visually leads. Use `card.subtle` for secondary/sidebar info (like the YTD breakdown).

### P3.2 `.btn` — primary should be more confident

Current primary is `--ink` (near-black) with `--bg` text. That's fine but invisible against `--ink` body text.

Two tweaks:
- Add a `.btn.accent` variant using `--accent` (oxblood) — for "create/upload" style CTAs
- Primary keeps near-black but gains a 1px inner highlight in dark mode: `box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08)`

### P3.3 `.chip` — add a sized variant

Current chip is 22px tall — perfect for table cells, too small for mobile filter bars. Add:
```css
.chip.md { height: 28px; padding: 0 12px; font-size: 12.5px; }
.chip.lg { height: 34px; padding: 0 14px; font-size: 13.5px; gap: 8px; }
```

Use `.chip.lg` on the mobile filter bar (`FilterBar.tsx`) so the touch target is correct.

### P3.4 `.seg` — add a vertical and a "tabs" variant

Currently `.seg` is a pill segmented control. The Transactions page has a status filter (All/Pending/Income/Processed/Split) that *should* look like tabs, not a pill. Add:

```css
.seg.tabs {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  padding: 0;
  gap: 0;
}
.seg.tabs button {
  height: 32px;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  padding: 0 14px;
}
.seg.tabs button.on {
  background: transparent;
  border-bottom-color: var(--ink);
  box-shadow: none;
}
```

### P3.5 `.tbl` → also a `.list` for mobile

Add a vertical list primitive (used by the mobile transaction cards above). Reuses tokens.

```css
.list { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; }
.list-row { display: flex; align-items: center; gap: 12px; padding: 14px 14px; border-bottom: 1px solid var(--line); min-height: 56px; }
.list-row:last-child { border-bottom: none; }
.list-row:active { background: var(--surface-2); }
.list-row .l-main { flex: 1; min-width: 0; }
.list-row .l-title { font-size: 14px; color: var(--ink); font-weight: 500; }
.list-row .l-sub { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
.list-row .l-amount { font-family: var(--mono); font-size: 14px; color: var(--ink); font-variant-numeric: tabular-nums; }
```

### P3.6 New: `.kpi` for hero stat blocks

The IncomeSummaryCards / DashboardHeader currently re-implement the same "label + big number + delta" pattern with inline styles. Promote it to a primitive:

```css
.kpi { display: flex; flex-direction: column; gap: 4px; }
.kpi .kpi-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-4); font-weight: 600; }
.kpi .kpi-value { font-family: var(--font-display); font-size: clamp(28px, 4vw, 44px); letter-spacing: -0.025em; color: var(--ink); font-variant-numeric: tabular-nums; font-weight: 500; }
.kpi .kpi-delta { font-size: 12px; color: var(--ink-3); }
.kpi .kpi-delta.pos { color: var(--pos); font-weight: 500; }
.kpi .kpi-delta.neg { color: var(--neg); font-weight: 500; }
```

This kills the inline-style sprawl in `DashboardHeader.tsx` and `IncomeSummaryCards.tsx` and makes the hero number consistent everywhere.

### P3.7 Decommission inline styles

`Sidebar.tsx`, `DashboardHeader.tsx`, `BudgetPaceBars.tsx`, `QuickAddFAB.tsx`, several Dashboard cards — all use heavy `style={{ … }}`. This works but locks design system updates out of those surfaces (any future token rename or media query is dead-on-arrival there).

**Recommend:** as a separate cleanup PR per feature, move inline styles into either Tailwind utilities or new CSS classes in `components.css`. Not part of the visual refresh — but blocks future maintenance.

---

## P4 — Page-level refinements

### P4.1 Dashboard — collapse to a hub, expand on demand

Right now the dashboard renders **10 sections** unconditionally. On mobile this is too much; on desktop it's overwhelming.

**Proposal:**
- Top 1/3 of the viewport: a **hero card** with the month total (`.display`, 64–80px), pace status, and 4 small KPI tiles (income, expenses, net, owed to you)
- Below: 2-column grid on desktop (`grid-cols-2`), 1-column on mobile, of *cards the user has opted into*
- A "Customize dashboard" gear (top-right of hero) toggles which cards render — saved to localStorage
- Default-on cards: Budget Pace, Category Donut, Six-Month Trend, Needs Review (4 essentials)
- Default-off: YTD, Daily Spend Calendar, Split Ledger, Category Deep Dive, Income Flow (power-user; opt-in)

This stays additive — every existing card component keeps its API. You just stop unconditionally rendering them all.

### P4.2 Transactions — quieter table, louder selection

The current table is dense and the selected row gets a 2px accent inset on `td:first-child`. Two refinements:

- Drop the row hover background (`tr.row:hover td { background: var(--surface-2) }`) → it makes the table feel busy
- Replace with a **left-edge dot** that appears on hover (a `::before` on the row, animated in)
- Selected row: keep `accent-soft` background but also raise the row with `box-shadow: 0 1px 0 var(--accent)` on the bottom edge so it feels lifted, not painted
- Add zebra striping at `oklch(0.99 0 0)` — currently rows are uniform white

### P4.3 Budget — heatmap deserves to be the hero

The heatmap card is buried below the budget table. Personal-finance users care about *where they're spending*, not the table. Promote heatmap to top, demote category table below.

### P4.4 Empty states — make them earn their pixels

`EmptyState.tsx` currently shows an icon + title + sub. Use the new `.display` font on the title and add an illustration slot (single-color SVG, can use `--ink-4`).

---

## P5 — Motion

You have a few keyframes (`fade-up`, `pop`, `slide-up-sheet`, `fade-in`). Good. Don't add more decorative animation; add **one purposeful page-load choreography** per page:

- Dashboard hero: number counts up from 0 to total over 600ms with easing `cubic-bezier(0.16, 1, 0.3, 1)`. Use a small `useCountUp` hook. Disabled if `prefers-reduced-motion`.
- Card grid: staggered fade-up, 60ms delay per card, max 8 cards. Already partly in place via `route-fade`.
- Bottom sheet: drag-to-dismiss with rubberband resistance past the open position.
- Theme toggle: animate `--bg` and `--ink` over 250ms (already set via `transition` in `base.css` ✓).

**Do not add:** parallax, page transitions, micro-interactions on every hover, gradient sweeps. Restraint is the aesthetic.

---

## Effort & rollout

Suggested PR order. Each row is one PR.

| # | Scope | Effort | Risk | Impact |
|---|---|---|---|---|
| 1 | **P0.1** mobile tap-target media query | 1h | low | huge |
| 2 | **P0.7** safe-area + viewport-fit | 15min | none | medium |
| 3 | **P1.1+P1.2** new font tokens, `.display` utility, swap body + 5 hero usages | 3h | low | huge |
| 4 | **P0.4** sticky section pill bar on dashboard (mobile) | 2h | low | high |
| 5 | **P0.2** BottomTabBar + hide hamburger on mobile | 3h | medium | huge |
| 6 | **P0.5** Transactions: render `.list` cards on mobile (`TransactionRowMobile`) | 4h | medium | huge |
| 7 | **P0.6** sheet drag handle + swipe-to-dismiss | 2h | low | medium |
| 8 | **P2.1+P2.2** new accent + warm neutrals (light mode) | 1h | low | medium |
| 9 | **P2.3A** paper-grain overlay (light only) | 1h | low | medium |
| 10 | **P3.6** `.kpi` primitive + refactor DashboardHeader, IncomeSummaryCards | 3h | low | medium |
| 11 | **P3.4** `.seg.tabs` variant + use on Transactions status filter | 1h | low | low |
| 12 | **P2.4** Lucide migration (one feature at a time) | 4h spread | low | high |
| 13 | **P4.1** dashboard customize-cards opt-in | 6h | medium | high |
| 14 | **P4.2** Transactions table polish (left-dot hover, lifted selection, zebra) | 2h | low | medium |
| 15 | **P3.7** inline-style decommission (one feature per PR) | 6h spread | low | low (maintenance) |

**Quick wins to try first:** #1, #2, #3, #8. That's ~5 hours of work and the app already feels meaningfully different.

**Biggest mobile wins:** #1, #4, #5, #6. After these, the Pixel 9 experience matches a native app.

---

## What NOT to do

- Don't replace the token system. It's already well-designed.
- Don't add a third-party UI library (Radix is fine for primitives; full-kit libraries will fight your tokens).
- Don't introduce gradients. The aesthetic is paper, not glass.
- Don't add purple. Or teal. Or any "modern SaaS palette" cliché.
- Don't animate everything. One choreographed moment per page > twelve micro-interactions.
- Don't break tabular numerals anywhere a number is shown — this is your most important typographic rule and it's already correct.

---

## Open questions for you

1. **Budget for commercial fonts?** Söhne + GT Sectra would be the top-tier pairing (~$500/year combined). General Sans + Fraunces is free and 85% of the way there.
2. **Do you want the Lucide migration as part of the refresh, or as a separate cleanup later?** It's mechanical but touches ~40 files.
3. **Customize-dashboard (P4.1):** opt-in by default for *existing* users, or do all users see the smaller default and have to enable the rest? The latter is bolder.
4. **Accent direction:** oxblood (my recommendation), indigo ink, forest, or burnt amber? Each is a 5-minute swap in tokens — easy to try them all.
