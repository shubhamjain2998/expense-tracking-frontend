# Navigation Restructure — Design Spec

**Date:** 2026-06-13  
**Approach:** Option A — Contextual Distribution + Sidebar removal

---

## Goal

Redistribute Settings items to the pages where they are actually used, making features discoverable without changing the core data model. Remove the sidebar entirely and replace it with a full-width frosted-glass top navigation bar. Transactions gains auto-mapping and ignore-rule management as sub-tabs. Upload gains a Backup tab for export/import. Settings becomes a lean account-and-preferences page accessible from the topnav profile menu.

---

## Decisions

| Decision | Choice |
|---|---|
| Approach | Contextual Distribution (Option A) |
| Sidebar | Removed entirely |
| Navigation | Full-width frosted topnav |
| Topnav style | Frosted light (light mode) / frosted dark (dark mode) + underline active indicator |
| Mappings/Ignore rules placement | Transactions page sub-tabs |
| Export/Import placement | Upload page — new Backup tab |
| Footer | None |
| Settings access | Topnav avatar button → profile menu → "Settings →" |
| Table sort | Mappings table (others already have sort) |

---

## 1. Sidebar — removed

**Remove** `<Sidebar>` from `Layout.tsx` entirely. Also remove:
- The `mobileNavOpen` state and its two `useEffect` hooks (scroll lock + reset on nav)
- The `app-sidebar-backdrop` overlay div
- The `onOpenNav` prop from `TopNav`
- The `has-bottom-tabs` class on the outer wrapper (re-evaluate if still needed for BottomTabBar clearance)

The mobile `BottomTabBar` already handles mobile navigation independently — it is **not** removed.

`Sidebar.tsx` is deleted (or kept unused — deleting is cleaner).

---

## 2. TopNav — redesigned

Replace the current minimal `TopNav` (breadcrumb + theme toggle) with a full navigation bar.

### 2a. Visual design

**Frosted glass, theme-adaptive:**

```css
/* Light mode */
background: rgba(255, 255, 255, 0.85);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border-bottom: 1px solid var(--line);
box-shadow: 0 1px 0 var(--line), 0 4px 16px rgba(0,0,0,0.04);

/* Dark mode (via .dark class or prefers-color-scheme) */
background: rgba(12, 12, 18, 0.88);
border-bottom: 1px solid rgba(255,255,255,0.07);
box-shadow: 0 1px 0 rgba(255,255,255,0.07), 0 4px 16px rgba(0,0,0,0.4);
```

Height: 52px. Full width. `position: sticky; top: 0; z-index: 50`.

### 2b. Layout (left → right)

```
[Logo icon] [Brand name]  |  [Dashboard] [Transactions 4] [Upload] [Budget]  →  [₹24k / ₹40k Jun]  [☀/☾]  [SJ avatar]
```

**Logo** — 26×26px rounded square, accent colour, "PF" initials (white, 11px bold). Matches current design language.

**Brand name** — "Personal Finance", 13.5px, font-weight 700, `var(--ink)`, `letter-spacing: -0.02em`. Separated from nav links by a 1px vertical divider.

**Nav links** — `Dashboard | Transactions | Upload | Budget`. Settings is **not** a nav link.
- Font: 13px, font-weight 500
- Default colour: `var(--ink-3)`
- Hover: `var(--ink-2)`
- Active: `var(--ink)` + 2px underline in `var(--accent)` at the bottom edge of the bar (using `border-bottom` on the link element, clipped by the bar's `overflow: hidden`, same height as the bar for a flush effect)
- Pending badge on Transactions: small pill, accent bg, count of pending transactions (uses existing `pendingCount` from `useSidebarStats`)

**Month stat chip** (right area, before theme toggle):
- Shows `₹{spent} / ₹{budget} · {monthLabel}` when budget > 0
- Shows `₹{spent} · {monthLabel}` when no budget set
- Styled as a subtle rounded pill: `background: var(--surface-2)`, `border: 1px solid var(--line)`, `border-radius: 20px`, `padding: 3px 10px`, `font-size: 11px`
- Stat values in `var(--ink)` font-weight 600, labels in `var(--ink-4)`
- Only visible on `md:` and up (hidden on mobile — BottomTabBar handles mobile)
- Uses same data source as current sidebar: `useSidebarStats()`

**Theme toggle** — existing button, unchanged.

**Avatar button** — 28×28px rounded square, accent background, user initials (from `getInitials(email)`), opens the profile menu (see §2c).

### 2c. Profile menu (was sidebar profile popover)

Same popover content as current `Sidebar.tsx`, now triggered by the avatar button in the topnav:

```
┌─────────────────────────┐
│ [avatar]  Shubham       │
│           jains1801@... │
├─────────────────────────┤
│ Display name  [edit]    │
├─────────────────────────┤
│ ⚙ Settings          →  │   (navigates to /settings, closes popover)
├─────────────────────────┤
│ → Sign out              │
└─────────────────────────┘
```

Popover anchors to the avatar button, opens downward-left. Same outside-click dismiss logic as current.

### 2d. Mobile behaviour

On mobile (`< md`), the topnav shows:
- Logo + brand name (left)
- Avatar button (right)
- Theme toggle (right)
- **Nav links are hidden** — BottomTabBar handles mobile navigation

The month stat chip is hidden on mobile. The pending badge on the Transactions link in BottomTabBar already exists.

---

## 3. Layout.tsx — simplified

After removing the sidebar, `Layout.tsx` becomes:

```tsx
export function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)]">
      <TopNav />
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto max-w-[1380px] px-4 pt-5 pb-14 md:px-7 md:pt-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} variants={fadeOnly} initial="hidden" animate="visible" exit="exit">
              <FrozenOutlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <QuickAddFAB />
      <BottomTabBar />
    </div>
  )
}
```

Remove: `mobileOpen` state, two `useEffect` hooks, backdrop div, `onOpenNav` prop thread.

---

## 4. Transactions page — sub-tabs

Add a tab strip immediately below the page header (above the existing filter row). Three tabs:

| Tab | Content |
|---|---|
| **Transactions** (default) | Existing transaction list + filter row + right panel |
| **Mappings** | `MappingsSection` component, with search + sort (see §4a, §4b) |
| **Ignore rules** | `IgnoreRulesSection` component |

### Tab routing

React state (not URL params). Tab strip persists when the right-side detail panel is open. Switching tabs closes any open detail panel.

### 4a. Mappings tab — search

Add a search/filter input above the table in `MappingsSection`. Filters client-side:
- Matches `description_pattern` (case-insensitive substring)
- Matches `category` name (case-insensitive substring)
- "No results for '…'" empty state when nothing matches
- Input cleared on unmount

### 4b. Mappings tab — sort

Add column sort to the Mappings table. Sort state: `{ col: 'pattern' | 'category' | 'matches' | 'last_used', dir: 'asc' | 'desc' }`. Default: `matches` descending.

Sortable columns and their data fields:

| Column header | Sort key | Type | Default |
|---|---|---|---|
| Pattern | `description_pattern` | string (case-insensitive) | — |
| Category | `category` | string (case-insensitive) | — |
| Matches | `match_count` | number | ✓ desc |
| Last used | `last_used` | ISO date string (nulls last) | — |

Sort indicator: small up/down arrow icon after the header label when active (same pattern as `TransactionsTableHead`). Clicking the active header reverses direction.

Sort is applied after search filtering. Both operate on the client-side data array.

### 4c. Mappings tab — edit icon visibility

Remove `opacity-0 group-hover:opacity-100` from the action buttons column — make edit and delete icons always visible in the dedicated tab context.

---

## 5. Upload page — Backup tab

Add a fourth tab to the existing `UploadTabs` tab strip:

```
PDF statement | Bulk paste | Manual entry | Backup
```

The **Backup** tab renders `BackupImportSection`. `UploadMode` union type gains `'backup'`.

---

## 6. Settings page (trimmed)

Remove from the settings nav and rendered content:
- `MappingsSection` (→ Transactions)
- `IgnoreRulesSection` (→ Transactions)
- `BackupImportSection` from the `privacy` panel (→ Upload)
- `'ignore-rules'` and `'mappings'` entries from `navItems`

After removal, the `privacy` panel contains only `OnboardingResetSection`. Rename the nav item from `'Privacy & Data'` to `'Privacy & onboarding'`.

Remaining nav items: `Persons | Tags | Financial year | Privacy & onboarding | Danger zone`

---

## 7. Component ownership after the change

No file moves required — components are rendered in new parent contexts:

| Component | New render location |
|---|---|
| `MappingsSection` | Transactions page — Mappings tab |
| `IgnoreRulesSection` | Transactions page — Ignore rules tab |
| `BackupImportSection` | Upload page — Backup tab |
| Profile menu (currently in `Sidebar`) | `TopNav` — avatar button popover |
| Month stats (currently in `Sidebar`) | `TopNav` — right chip area |

---

## 8. CSS changes

- Remove all `.app-sidebar*` CSS rules from `components.css` and `app.css`
- Add `.topnav` update: height 52px, frosted glass styles via CSS custom properties so light/dark mode is handled via the existing theme vars
- The `has-bottom-tabs` body class (if it controls bottom padding for FAB clearance) may need to stay or be moved to a `<body>` attribute set by `Layout` — verify during implementation

---

## 9. Files affected

| File | Change |
|---|---|
| `src/components/layout/Layout.tsx` | Remove Sidebar; remove mobile drawer state/effects/backdrop; simplify |
| `src/components/layout/Sidebar.tsx` | Delete |
| `src/components/layout/TopNav.tsx` | Full redesign: frosted bar + nav links + stat chip + avatar/profile menu |
| `src/styles/components.css` (or app.css) | Remove `.app-sidebar*` rules; update `.topnav` styles |
| `src/features/settings/page.tsx` | Remove mappings, ignore-rules, backup sections; rename privacy nav item |
| `src/features/upload/types.ts` | Add `'backup'` to `UploadMode` union |
| `src/features/upload/components/UploadTabs.tsx` | Add Backup tab |
| `src/features/upload/page.tsx` | Render `BackupImportSection` when `mode === 'backup'` |
| `src/features/transactions/page.tsx` | Add tab state; conditionally render tabs |
| `src/features/transactions/components/TransactionsTabs.tsx` | New: tab strip (Transactions \| Mappings \| Ignore rules) |
| `src/features/settings/components/MappingsSection.tsx` | Add search input; add column sort; make action icons always visible |

---

## 10. Out of scope

- URL-based tab routing for Transactions sub-tabs
- Keyboard shortcut hints or command palette
- Any changes to Mappings/Ignore Rules backend APIs
- Animations beyond existing design system motion tokens
- CategoriesSection — not mentioned, not touched
