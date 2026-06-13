# Navigation Restructure — Design Spec

**Date:** 2026-06-13  
**Approach:** Option A — Contextual Distribution

---

## Goal

Redistribute Settings items to the pages where they are actually used, making features discoverable without changing the core data model. Transactions gains auto-mapping and ignore-rule management as sub-tabs. Upload gains a Backup tab for export/import. Settings becomes a lean account-and-preferences page, no longer in the sidebar nav.

---

## Decisions

| Decision | Choice |
|---|---|
| Approach | Contextual Distribution (Option A) |
| Mappings/Ignore rules placement | Transactions page sub-tabs |
| Export/Import placement | Upload page — new Backup tab |
| Footer | None |
| Settings access | Profile popover → "Settings →" link |

---

## 1. Sidebar

**Remove** the Settings entry from the `NAV` array in `Sidebar.tsx`.

**Add** a "Settings" link inside the existing profile popover (the dropdown that appears when the user clicks the avatar/name at the top of the sidebar). It should sit between the display-name section and the Sign out button, styled like a navigation link (icon + label).

```
Profile popover layout (after change):
  ┌─────────────────────────┐
  │ [avatar]  Shubham       │
  │           jains1801@... │
  ├─────────────────────────┤
  │ Display name  [edit]    │
  ├─────────────────────────┤
  │ ⚙ Settings          →  │   ← NEW (navigates to /settings)
  ├─────────────────────────┤
  │ → Sign out              │
  └─────────────────────────┘
```

No other sidebar changes. Dashboard, Transactions, Upload, Budget nav items are untouched.

---

## 2. Transactions page — sub-tabs

Add a tab strip immediately below the page header (above the existing filter row). Three tabs:

| Tab | Content |
|---|---|
| **Transactions** (default) | Existing transaction list + filter row + right panel |
| **Mappings** | `MappingsSection` component, with search added (see §2a) |
| **Ignore rules** | `IgnoreRulesSection` component |

### Tab routing

Use React state (not URL params) to track the active tab. The tab strip persists when the right-side detail panel is open. Switching tabs closes any open detail panel.

### 2a. Mappings tab — search

Add a search/filter input at the top of the `MappingsSection`, above the table. It filters the displayed rows client-side:

- Matches against `description_pattern` (case-insensitive substring)
- Matches against `category` name (case-insensitive substring)
- Shows a "No results for '…'" empty state when nothing matches
- Does not affect the underlying data or server state
- The search input is cleared when the tab is unmounted

The existing inline edit (pencil icon on hover → inline row form) and delete (trash icon on hover) remain unchanged. In the dedicated tab context, make the action icons **always visible** (remove the `opacity-0 group-hover:opacity-100` hide) since the tab has space and discoverability is the goal.

---

## 3. Upload page — Backup tab

Add a fourth tab to the existing `UploadTabs` tab strip:

```
PDF statement | Bulk paste | Manual entry | Backup
```

The **Backup** tab renders `BackupImportSection` (the same component currently in Settings → Privacy & Data). No changes to the component itself — just relocated.

`UploadMode` type gains a new value: `'backup'`.

---

## 4. Settings page (trimmed)

Remove from the settings nav and from the rendered content:

- `MappingsSection` (moved to Transactions)
- `IgnoreRulesSection` (moved to Transactions)
- The `'ignore-rules'` and `'mappings'` entries from `navItems`
- `BackupImportSection` from the `privacy` panel

After removal, the `privacy` panel contains only `OnboardingResetSection` — keep it, rename the nav item to **"Privacy & onboarding"** for clarity.

Remaining nav items (in order):

```
Persons | Tags | Financial year | Privacy & onboarding | Danger zone
```

Default active nav changes from `'persons'` to `'persons'` (no change needed).

The Settings page itself (`/settings` route) is unchanged architecturally — just fewer sections.

---

## 5. Component ownership after the change

| Component | Old location | New home |
|---|---|---|
| `MappingsSection` | `src/features/settings/components/` | stays in place, rendered from Transactions tab |
| `IgnoreRulesSection` | `src/features/settings/components/` | stays in place, rendered from Transactions tab |
| `BackupImportSection` | `src/features/settings/components/` | stays in place, rendered from Upload Backup tab |

No file moves required — components are just rendered in new parent contexts. Import paths stay the same.

---

## 6. Out of scope

- URL-based tab routing (e.g. `/transactions?tab=mappings`) — state-only is sufficient
- Animations or transitions between tabs beyond what the existing design system provides
- Any changes to the Mappings or Ignore Rules backend APIs
- Mobile-specific layout changes (the tab strip wraps on small screens naturally)
- CategoriesSection — not mentioned, not touched

---

## 7. Files affected

| File | Change |
|---|---|
| `src/components/layout/Sidebar.tsx` | Remove Settings from NAV; add Settings link in profile popover |
| `src/features/settings/page.tsx` | Remove mappings, ignore-rules, backup sections; rename privacy nav item |
| `src/features/upload/components/UploadTabs.tsx` | Add `'backup'` tab |
| `src/features/upload/types.ts` (or wherever `UploadMode` is defined) | Add `'backup'` to union type |
| `src/features/upload/page.tsx` | Render `BackupImportSection` when tab is `'backup'` |
| `src/features/transactions/page.tsx` | Add tab state; render tab strip + conditionally render `MappingsSection` / `IgnoreRulesSection` |
| `src/features/transactions/components/TransactionsTabs.tsx` | New tab strip component (Transactions \| Mappings \| Ignore rules) |
| `src/features/settings/components/MappingsSection.tsx` | Add search input; make action icons always visible |
