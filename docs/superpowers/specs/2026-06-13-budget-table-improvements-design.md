# Budget Table Improvements — Design Spec
**Date:** 2026-06-13  
**Status:** Approved

## Overview

Six targeted improvements to the Budget page table to improve scannability, visual hierarchy, and usability. All changes are purely frontend — no backend API changes required.

---

## 1. Sortable Columns

**What:** Every data column header becomes a clickable sort control.

**Columns:** Category (alpha), Monthly Budget, This Month, YTD Spent, Annual Budget.  
"This Month Progress" is not independently sortable (it's derived from Monthly Budget).

**Behaviour:**
- Default sort: Monthly Budget descending (largest budget first)
- First click on a non-active column: descending
- Second click on the same column: ascending
- Active column header gets a distinct highlight colour
- Sort chevrons: both arrows shown on inactive columns (dim); active column shows the relevant direction arrow at full opacity
- Sort state is local React state only (no persistence — resets on navigation)

**Rank index:** When sorted by a numeric column, a small `#N` prefix appears in the category name cell showing the row's rank. Hidden when sorted alphabetically.

---

## 2. Income Section — Collapsed by Default

**What:** Income categories (currently always visible at the table bottom) are hidden behind a slim toggle strip.

**Toggle strip:** A full-width clickable row at the very bottom of the table card (above the Add-category form), styled in green to match income. Shows: `▶ Income (N) — click to expand`.

**Expanded state:** Clicking reveals the income rows inline (same table columns, but with green dot, `N txns` in the Monthly Budget cell, `—` elsewhere). Arrow rotates 90°. Label changes to `▼ Income (N) — click to collapse`.

**Persistence:** Open/collapsed state saved to `localStorage` under the key `budget_income_expanded`. Defaults to collapsed (`false`).

---

## 3. Colour-Coded Progress Bars

**What:** Progress bars change colour based on spend percentage.

| Range | Colour |
|-------|--------|
| 0–79% | Green (`var(--pos)`) |
| 80–99% | Amber (`#fb923c`) |
| ≥ 100% | Red (`var(--neg)`) |

The percentage label to the right of the bar matches the bar colour.

**Currently:** All bars use the same accent colour regardless of spend level.

---

## 4. Over-Budget Row Tint

**What:** Table rows where `thisMonthSpent >= monthlyBudget` (and budget > 0) receive a very subtle red background tint (`rgba(var(--neg-rgb), 0.04)`).

This makes over-budget rows scannable without relying only on the red text in the "This Month" column.

---

## 5. Total Footer Progress Bar

**What:** The `tfoot` "Total" row currently shows blank in the "This Month Progress" column. Add an aggregate progress bar: `(totalThisMonth / totalMonthlyBudget) * 100`.

Colour follows the same green/amber/red threshold as individual bars.

---

## 6. Rank Index on Numeric Sort

**What:** When the active sort column is any numeric column (not Category), a small `#1`, `#2`, … label appears left of the colour dot in each category name cell.

Implemented as a zero-width column inside the category `<td>` — no layout shift.

---

## Files to Change

| File | Change |
|------|--------|
| `src/features/budget/components/BudgetCategoryTable.tsx` | Sort state, header click handlers, filtered/sorted data, income toggle strip, footer bar |
| `src/features/budget/components/BudgetCategoryRow.tsx` | Accept `rank` prop, colour-coded progress bar, over-budget tint |
| `src/features/budget/components/UnbudgetedCategoryRow.tsx` | Accept `rank` prop (shown as empty when unbudgeted) |
| `src/features/budget/components/IncomeCategoryRow.tsx` | No change — rendered inside the collapsible section |
| `src/features/budget/components/ProgressBar.tsx` | Accept `pct` and emit appropriate colour class/style |

---

## Out of Scope

- No backend changes
- No changes to the heatmap, header, or Add Budget modal
- No changes to the Settings page or transaction forms
- BulkActionsBar category filter — intentionally left unfiltered (mixed types)
