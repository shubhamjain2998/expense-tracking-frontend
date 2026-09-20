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
4. **Hairlines, not shadows.** Structure comes from 1px rules and whitespace. No drop shadows
   except on genuinely floating layers (menus, sheets, toasts).
5. **Depth by navigation, not by stacking.** The landing screen answers; detail lives one click
   away at a real URL.

## 2. Colour tokens

Data greys `--d1..--d5` are the **only** palette charts may use, plus `--accent` for a
highlighted/selected series. There is no 8-hue category palette any more.

### Light

| Token            | Value                                     | Use                                                  |
| ---------------- | ----------------------------------------- | ---------------------------------------------------- |
| `--paper`        | `#FAFAFA`                                 | app background                                       |
| `--card`         | `#FFFFFF`                                 | card / table surface                                 |
| `--card-2`       | `#F4F4F5`                                 | nested surface, zebra row, input                     |
| `--ink`          | `#18181B`                                 | primary text, strongest bar                          |
| `--ink-2`        | `#3F3F46`                                 | secondary text                                       |
| `--ink-3`        | `#71717A`                                 | labels, captions (4.6:1 — the lightest text allowed) |
| `--ink-4`        | `#A1A1AA`                                 | **non-text only**: hairline emphasis, disabled glyph |
| `--line`         | `#E4E4E7`                                 | default 1px rule                                     |
| `--line-2`       | `#D4D4D8`                                 | emphasised rule, input border                        |
| `--accent`       | `#2563EB`                                 | links, active state, focus ring, selected series     |
| `--accent-hover` | `#1D4ED8`                                 | hover/pressed accent                                 |
| `--accent-soft`  | `#EFF6FF`                                 | selected row, active chip fill                       |
| `--pos`          | `#15803D`                                 | money in / under budget                              |
| `--neg`          | `#B91C1C`                                 | money out / over budget                              |
| `--warn`         | `#A16207`                                 | pace warning                                         |
| `--warn-soft`    | `#FEF9EC`                                 | warning row fill                                     |
| `--d1..--d5`     | `#18181B #3F3F46 #71717A #A1A1AA #D4D4D8` | chart ramp, largest→smallest                         |

### Dark

| Token            | Value                                     |
| ---------------- | ----------------------------------------- |
| `--paper`        | `#0B0B0C`                                 |
| `--card`         | `#141416`                                 |
| `--card-2`       | `#1C1C1F`                                 |
| `--ink`          | `#FAFAFA`                                 |
| `--ink-2`        | `#D4D4D8`                                 |
| `--ink-3`        | `#A1A1AA`                                 |
| `--ink-4`        | `#71717A`                                 |
| `--line`         | `#27272A`                                 |
| `--line-2`       | `#3F3F46`                                 |
| `--accent`       | `#60A5FA`                                 |
| `--accent-hover` | `#93C5FD`                                 |
| `--accent-soft`  | `#12203A`                                 |
| `--pos`          | `#4ADE80`                                 |
| `--neg`          | `#F87171`                                 |
| `--warn`         | `#FBBF24`                                 |
| `--warn-soft`    | `#231B06`                                 |
| `--d1..--d5`     | `#FAFAFA #D4D4D8 #A1A1AA #71717A #3F3F46` |

Verified contrast on card: accent 5.2:1 (light) / 7.4:1 (dark); pos 4.9 / 10.1;
neg 6.4 / 6.5; warn 4.6 / 9.8; ink-3 4.6 / 7.0. `--ink-4` fails text contrast **by design** —
lint rule: never use it on text.

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
- Card = `background: var(--card); border: 1px solid var(--line); border-radius: 4px`. **No shadow.**
- Floating layers only (`--shadow-pop: 0 8px 24px rgb(0 0 0 / .10), 0 1px 2px rgb(0 0 0 / .06)`).
- Section separation is a 1px `--line` rule + 32px space, not a gap between floating boxes.

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
Insights (/insights) habits · seasonality · day-of-week · forecast · YTD detail
Category (/c/:id)   one category: trend, stats, its transactions
Settings            profile · categories · tags · people · rules · backup
```

Nav = 4 destinations (Home, Transactions, Budget, Settings). Insights and Category are
drill-downs reached from Home, not tabs. `/upload` redirects to `/transactions?import=pdf`.

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
