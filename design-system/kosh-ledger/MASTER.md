# Kosh — "Ledger" Design System (2026 reset)

Global source of truth. Page overrides live in `pages/<page>.md`.
Generated from the ui-ux-pro-max design-system search (style: _Minimalism & Swiss Style_,
variance 3 / motion 3 / density 8), then hand-locked to the decisions below.

This file **replaces** the 2026 "warm cream + oxblood + Cabinet Grotesk" system. That system is
retired; nothing in it carries over except the token _architecture_ (CSS custom properties +
Tailwind v4 `@theme inline` mapping) and the tabular-numerals rule.

---

## 1. Principles

1. **One number, one home.** A figure appears in exactly one place per screen. If a second
   surface needs it, that surface links to the first instead of restating it.
2. **One chart, one question.** Every chart must answer a question no other chart on the screen
   answers. Two charts drawn from the same series are a bug.
3. **Colour is meaning, not decoration.** Greyscale carries magnitude; the single accent carries
   interactivity; green/red carry the sign of money. Nothing else is coloured.
4. **Hairlines draw the boundary; depth says how far off the page it is.** Every edge is still
   a 1px rule — a shadow never replaces one. Since 2026-09-22 a rule may sit on an elevation as
   well (see §4a, the Dimension layer). Amended from the original "hairlines, not shadows": the
   flat rendering was correct but inert, and the fix was to add a light model, not to redraw the
   structure.
5. **Depth by navigation, not by stacking.** The landing screen answers; detail lives one click
   away at a real URL.

## 2. Colour tokens

Data greys `--d1..--d5` are the **only** palette charts may use, plus `--accent` for a
highlighted/selected series. There is no 8-hue category palette any more.

**2026-09-21: softened to a "cool slate" ramp** at the user's request — flat black-on-white /
white-on-black read as too harsh. Every neutral now carries a faint, consistent blue-grey cast
(never a desaturated grey), and primary text targets ~11:1 instead of the previous ~17:1.
Secondary text targets >=6:1, muted text/labels >=4.5:1 (the WCAG AA floor, no exceptions), and
non-text tokens (`--ink-4`) >=3:1. Ratios below are measured against both `--card` and `--paper`
from the actual hex values (see `src/styles/palette-contrast.test.ts`, which locks these floors
in as a regression guard).

### Light

| Token            | Value                                     | Use                                                              |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `--paper`        | `#F7F8FA`                                 | app background                                                   |
| `--card`         | `#FFFFFF`                                 | card / table surface                                             |
| `--card-2`       | `#EEF1F4`                                 | nested surface, zebra row, input                                 |
| `--ink`          | `#323641`                                 | primary text, strongest bar (12.1:1 card / 11.4:1 paper)         |
| `--ink-2`        | `#4A505C`                                 | secondary text (8.1:1 / 7.6:1)                                   |
| `--ink-3`        | `#5F6672`                                 | labels, captions (5.8:1 / 5.4:1 — the lightest text allowed)     |
| `--ink-4`        | `#838B98`                                 | **non-text only**: hairline emphasis, disabled glyph             |
| `--line`         | `#D9DEE5`                                 | default 1px rule                                                 |
| `--line-2`       | `#C6CCD6`                                 | emphasised rule, input border                                    |
| `--accent`       | `#2563EB`                                 | links, active state, focus ring, selected series (5.2:1 / 4.9:1) |
| `--accent-hover` | `#1D4ED8`                                 | hover/pressed accent                                             |
| `--accent-soft`  | `#EFF6FF`                                 | selected row, active chip fill                                   |
| `--pos`          | `#136429`                                 | money in / under budget (7.3:1 / 6.9:1)                          |
| `--neg`          | `#B91C1C`                                 | money out / over budget (6.5:1 / 6.1:1)                          |
| `--warn`         | `#A16207`                                 | pace warning (4.9:1 / 4.6:1)                                     |
| `--warn-soft`    | `#FEF9EC`                                 | warning row fill                                                 |
| `--d1..--d5`     | `#323641 #4A505C #5F6672 #838B98 #C6CCD6` | chart ramp, largest→smallest (mirrors the ink ramp)              |

### Dark

| Token            | Value                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `--paper`        | `#14161A`                                                                                    |
| `--card`         | `#1C1F25`                                                                                    |
| `--card-2`       | `#22262D`                                                                                    |
| `--ink`          | `#C7CBD3`                                                                                    |
| `--ink-2`        | `#9CA3AF`                                                                                    |
| `--ink-3`        | `#8E96A4`                                                                                    |
| `--ink-4`        | `#666E7A`                                                                                    |
| `--line`         | `#333944`                                                                                    |
| `--line-2`       | `#454C59`                                                                                    |
| `--accent`       | `#60A5FA`                                                                                    |
| `--accent-hover` | `#93C5FD`                                                                                    |
| `--accent-soft`  | `#182B4A`                                                                                    |
| `--pos`          | `#4ADE80`                                                                                    |
| `--neg`          | `#F87171`                                                                                    |
| `--warn`         | `#FBBF24`                                                                                    |
| `--warn-soft`    | `#2E2308`                                                                                    |
| `--d1..--d5`     | `#B9BFC9 #8B93A0 #747C8A #5A6270 #454C59` — dimmed one notch below `--ink*`; d5 = `--line-2` |

Verified contrast on card / paper: ink 12.1 / 11.4 (light), 10.2 / 11.1 (dark); ink-2 8.1 / 7.6
(light), 6.5 / 7.1 (dark); ink-3 5.8 / 5.4 (light), 5.5 / 6.1 (dark); accent 5.2 / 4.9 (light),
6.5 / 7.1 (dark); pos 7.3 / 6.9 (light), 9.5 / 10.4 (dark); neg 6.5 / 6.1 (light), 6.0 / 6.6
(dark); warn 4.9 / 4.6 (light), 9.9 / 10.9 (dark). `--ink-4` fails text contrast **by design** —
lint rule: never use it on text (`src/test/ink4-text-guard.test.ts`).

`--d1..--d5` are chart fills only, never text — in dark mode they're deliberately dimmed a notch
below the `--ink*` ramp so bars don't visually compete with text, which means `--d4`/`--d5` (and
`--d3` in dark) fall under 4.5:1 and must never be reused as a text/label colour (the `--cat-*`
category-tag aliases learned this the hard way in the 2026-09-21 pass — they now point at
`--ink`/`--ink-2`/`--ink-3` instead of the d-ramp).

## 3. Typography

| Role                       | Font           | Size                     | Weight | Tracking          |
| -------------------------- | -------------- | ------------------------ | ------ | ----------------- |
| Hero number                | Space Grotesk  | `clamp(40px, 6vw, 64px)` | 700    | −0.03em           |
| KPI number                 | Space Grotesk  | 26px                     | 700    | −0.02em           |
| Page title                 | Space Grotesk  | 22px                     | 600    | −0.02em           |
| Section title              | Space Grotesk  | 17px                     | 600    | −0.015em          |
| Eyebrow                    | Inter          | 11px                     | 600    | 0.09em, uppercase |
| Body                       | Inter          | 14px                     | 400    | 0                 |
| Body strong                | Inter          | 14px                     | 550    | 0                 |
| Small / caption            | Inter          | 12.5px                   | 400    | 0                 |
| Micro (chips, badges)      | Inter          | 11px                     | 600    | 0.02em            |
| Table number, axis, amount | JetBrains Mono | 13px                     | 500    | −0.01em           |

**Numeral rule:** hero and KPI numbers are Space Grotesk 700; _every other_ numeral —
table cells, chart axes, amounts in rows, dates — is JetBrains Mono.
`font-variant-numeric: tabular-nums` everywhere a number can change.

Mobile bumps: body 15px, small 13px, input 16px (kills iOS zoom).

## 4. Space, radius, structure

- Spacing scale (density 8): `4 8 12 16 24 32 48`. `--space-1..--space-7`.
- Radius: `--radius: 4px` (cards, inputs, buttons), `--radius-sm: 2px` (chips, swatches),
  `--radius-full` for avatars only. No 12px+ pills except the FAB.
- Container: `max-width: 1280px`, gutter 24px desktop / 16px mobile.
- Card = `background: var(--glass); border: 1px solid var(--line); border-radius: 4px`, plus the
  §4a elevation. Before 2026-09-22 this was an opaque fill with no shadow at all.
- Floating layers (`--shadow-pop: 0 8px 24px rgb(0 0 0 / .10), 0 1px 2px rgb(0 0 0 / .06)`).
- Section separation is a 1px `--line` rule + 32px space, not a gap between floating boxes.

## 4a. Dimension layer (2026-09-22)

Lives entirely in `src/styles/depth.css`, imported after `components.css`. It adds a light model
on top of the structure above and changes no palette value, type size, spacing step or radius.

**The field.** `body::before` is a fixed, viewport-sized plate carrying four radial gradients
drawn only from `--accent` / `--warn` / `--pos` at 11–26% alpha, blurred 30px and drifting over
54s. `body::after` is a tiled `feTurbulence` grain at 3.5% (5% dark). `#root::before` is a
vignette. All three sit at negative `z-index`, behind every piece of content, so nothing they do
can move a text contrast ratio. Dark mode overrides the mix to blue + one green: three hues at
low alpha over a near-black canvas average to brown.

**Surfaces.** `--glass` (82% surface over the field) + a top-down `--sheen` wash + `inset 0 1px 0
--edge-hi` (lit top edge) + `inset 0 -1px 0 --edge-lo` (occluded bottom) + an elevation. Cards
deliberately carry **no `backdrop-filter`** — a filtered element becomes the containing block for
its fixed descendants, and cards host dialogs, popovers and sticky headers. Only the nav chrome
(`.topnav`, `.sidenav`, `.bottom-tab-bar`), which hosts none, is genuinely frosted.

**Elevation ramp.** `--elev-1` (cards) / `--elev-2` (hover, hero) / `--elev-3` (slab, FAB,
floating). Three layers each — contact, penumbra, ambient — tinted with the slate cast of the ink
ramp, never pure black.

**`.slab`.** One per page, for a hero block that has no container of its own (the Home verdict).
8px radius, `--elev-3`, and an accent bloom out of the top-left corner so it picks up the field's
key light.

**Pointer tracking.** `useTilt()` (`src/lib/useTilt.ts`) writes `--tilt-rx/ry/mx/my/lit` inside
rAF; `.tilt` is the perspective host, `.tilt-body` rotates, `.sheen::after` is the highlight. All
five properties have flat defaults in CSS, so the markup renders correctly with no JS. Skipped
outright on coarse pointers and under `prefers-reduced-motion`.

**Controls.** Buttons are convex (gloss + lit edge + contact shadow, inverting to an inset on
`:active`); inputs are concave (inset shadow) and stay **opaque** — a translucent field takes its
colour from whatever sits behind it, which on `/login` tinted the password box red.

**Reduced motion.** The static depth cues stay; the drift, the tilt, the sheen and every hover
transform stop. Locked by `src/styles/depth-css.test.ts`.

## 5. Motion (subtle, tier 3/10)

- Durations: `--dur-1: 120ms` (state), `--dur-2: 200ms` (transition), `--dur-3: 320ms` (enter).
- Easing: `--ease: cubic-bezier(.22,1,.36,1)`.
- Enter = fade + 8–12px rise, staggered 40ms. Nothing scales, bounces or springs.
- Bars/lines grow from their axis once, on first paint only.
- All of it inside `@media (prefers-reduced-motion: no-preference)`.

## 6. Charts

Library stays Recharts. Rules:

| Question                                 | Chart                                                  | Notes                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Where did the money go this month?       | horizontal bar list, `--d1..--d5`                      | doubles as the budget-pace view — the pace marker is a tick on the same bar. **Replaces the donut.**      |
| How is this month tracking vs. previous? | one line chart, window toggle 6/12/15mo                | single series + optional income series; replaces SixMonthTrend + IncomeFlowAndTrend + the seasonality arc |
| Is this category unusual?                | sparkline in the category row, full line on drill-down |                                                                                                           |
| How much of the year is used?            | one horizontal meter                                   | replaces the YTD cumulative chart on the landing screen                                                   |

Banned on any one screen: two charts over the same series; a donut and a bar of the same
breakdown; a value restated in both a KPI and a chart label.

Every chart ships: direct labels (no colour-only legend), a hover tooltip, a keyboard-focusable
data path, and a `<table class="sr-only">` fallback.

## 7. Information architecture

```
Home (/)            verdict · where it went · commitments · one trend · needs you
Transactions        list + filters; Import (PDF · Paste · Manual) is a menu here, not a page
Budget              plan + pace table
Insights (/insights) one LLM run: verdict · derived metrics · findings · patterns · projection ·
                    charts · open questions; plus the people ledger
Category (/c/:id)   one category: trend, stats, its transactions
Settings            profile · categories · tags · people · rules · backup
```

Nav = 4 destinations (Home, Transactions, Budget, Settings). Insights and Category are
drill-downs reached from Home, not tabs. `/upload` redirects to `/transactions?import=pdf`.

Insights is the one page the app does not compute. The user copies a prompt built from their own
numbers into an LLM of their choice and pastes the JSON reply back (schema v2, validated both
sides). Its sections must each answer a different question — a derived ratio, something to decide
about, a behavioural regularity, a forward look, a chart, an open question — because the rule that
one number lives in one place holds for prose as much as for charts. Nothing on this page may
restate a total Home or Budget already draws.

## 8. Anti-patterns (from the search + this product)

- Ornate anything; gradients; glass; emoji as icons (Lucide only, stroke 1.75).
- Filterless lists.
- Pure-white page background (use `--paper`, cards are the white).
- Colour as the sole carrier of meaning.
- Restating the month's income/expense/saved in a second card.

## 9. Pre-delivery checklist

- [ ] No number appears twice on one screen
- [ ] No two charts answer the same question
- [ ] Lucide icons only, `cursor: pointer` on every control
- [ ] Text contrast ≥ 4.5:1 in both themes; `--ink-4` never on text
- [ ] Visible focus ring (`2px var(--accent)`, `outline-offset: 2px`)
- [ ] `prefers-reduced-motion` respected
- [ ] 44×44px minimum touch target, 8px apart
- [ ] Verified at 375 / 768 / 1024 / 1440px
