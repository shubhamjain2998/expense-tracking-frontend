# Profile Revamp — Design Spec

**Date:** 2026-06-14  
**Branch:** feat/kosh-rebrand (or new branch)  
**Status:** Approved

---

## Overview

Upgrade the profile experience from a basic name-edit popover to a proper Profile section in Settings. The popover slims down to just navigation; all customisation moves to **Settings → Profile**.

---

## What We're Building

### 1. Avatar Customiser (localStorage)

A 2-tab widget (Color / Emoji) stored in localStorage under `pf_avatar`:

```ts
type AvatarPrefs = {
  mode: 'color' | 'emoji'
  color: string       // CSS gradient string, e.g. "linear-gradient(135deg,#b8860b,#daa520)"
  emoji: string       // e.g. "🧠" — empty string means no emoji chosen
}
```

**Color tab** — 12 curated gradient presets (see list below). User taps a swatch; the live preview avatar updates immediately. Initials always render on top.

**Emoji tab** — A 4×4 grid of exactly 16 emoji options. Selecting one sets `mode: 'emoji'` and `emoji` to that character; the avatar still uses the chosen color as background. Tapping the selected emoji again deselects it (sets `mode: 'color'`, `emoji: ''`).

The 16 emoji options (fixed set, in order): 😎 🧠 🦊 🌿 ⚡ 🎯 🚀 🌊 🔥 💎 🎵 🌸 🦋 🏔️ 🎨 ⭐

**Persistence:** `localStorage.setItem('pf_avatar', JSON.stringify(prefs))`. No backend needed; this is purely cosmetic and device-local.

**Default:** First swatch (amber gradient `linear-gradient(135deg,#b8860b,#daa520)`) with initials mode, matching the Kosh brand colour.

The 12 colour presets:
1. `linear-gradient(135deg,#b8860b,#daa520)` — Kosh amber (default)
2. `linear-gradient(135deg,#c0392b,#e74c3c)` — Ruby
3. `linear-gradient(135deg,#8e44ad,#a569bd)` — Violet
4. `linear-gradient(135deg,#2471a3,#5dade2)` — Sapphire
5. `linear-gradient(135deg,#1e8449,#52be80)` — Emerald
6. `linear-gradient(135deg,#ba4a00,#e59866)` — Terracotta
7. `linear-gradient(135deg,#1a252f,#2c3e50)` — Midnight
8. `linear-gradient(135deg,#6c3483,#d7bde2)` — Lavender
9. `linear-gradient(135deg,#117a65,#76d7c4)` — Teal
10. `linear-gradient(135deg,#784212,#f0b27a)` — Caramel
11. `linear-gradient(135deg,#1c2833,#7f8c8d)` — Slate
12. `linear-gradient(135deg,#922b21,#f1948a)` — Coral

---

### 2. `Avatar` Component

New shared component `src/components/ui/Avatar.tsx`:

```ts
interface AvatarProps {
  initials: string    // e.g. "JA"
  prefs: AvatarPrefs
  size?: number       // px, default 32
  className?: string
}
```

Renders a circle with `background: prefs.color`. If `prefs.mode === 'emoji'` and `prefs.emoji` is set, shows the emoji centred. Otherwise shows `initials` in white bold text. Used in both `TopNav` and the Profile section preview.

---

### 3. `useAvatarPrefs` Hook

`src/hooks/useAvatarPrefs.ts` — reads/writes `pf_avatar` from localStorage, exposes the prefs and a setter. Initialises to default if key is absent or unparseable.

---

### 4. Profile Section in Settings

New component `src/features/settings/components/ProfileSection.tsx` with 4 cards:

**Card 1 — Avatar**
- Live preview: 64px `Avatar` component + display name + email
- 2-tab switcher (Color / Emoji)
- Color tab: 12 swatch circles, selected one gets a double-ring highlight
- Emoji tab: 4×4 grid of 16 emoji options, tapping one sets `mode: 'emoji'`; tapping the selected one deselects back to `mode: 'color'`
- Changes save instantly to localStorage (no Save button needed)

**Card 2 — Account**
- Display name: shown as a clickable field; clicking activates an inline text input with Save (Enter / ✓ button) and Cancel (Escape / ✕). Saves to `localStorage('pf_display_name')`.
- Email: read-only field with a "read-only" badge. No edit affordance.

**Card 3 — Account stats**
- 3-cell grid: **Member since** (formatted as "Jun 2024"), **Transactions** (count), **Total tracked** (compact ₹ amount)
- Data from two sources:
  - `created_at` added to the existing `/auth/me` response (backend change #1)
  - Transaction count + total spend from a new `GET /auth/me/stats` endpoint (backend change #2)
- Shows skeleton loaders while fetching

**Card 4 — Change password**
- 3 fields: Current password, New password, Confirm new password
- "Update password" button — disabled until all three fields are non-empty and new === confirm
- On success: fields clear, toast "Password updated"
- On error (wrong current password): inline error under current password field
- For Google-only accounts: show a notice "Your account uses Google Sign-In — password change is not available" and hide the form. The frontend uses `has_password: bool` from `/auth/me` to determine this (see backend change #1).
- Requires new `PATCH /auth/me/password` backend endpoint (change #3)

---

### 5. Settings Page Update

Add "Profile" as the **first** item in `navItems` in `src/features/settings/page.tsx`. Render `<ProfileSection />` when `activeNav === 'profile'`.

---

### 6. TopNav Popover — Slimmed Down

Remove the display name edit block from `TopNav.tsx`. Popover becomes:

- **Header** (dark gradient): `Avatar` (40px) + display name + email
- **Settings link** → `/settings`
- **Divider**
- **Sign out** (destructive colour)

`displayName` and `initials` still read from localStorage in `TopNav` so the header reflects the latest values without a page reload. Avatar colour/emoji also reads from `useAvatarPrefs`.

---

## Backend Changes

### Change 1 — Extend `/auth/me` response

Add two fields to `MeResponse` in `app/routers/auth.py`:
- `created_at: datetime` — populated from `user.created_at`
- `has_password: bool` — `True` if `user.password_hash is not None` (never expose the hash itself)

Update the frontend `MeResponse` type in `src/lib/api/auth.ts` accordingly.

### Change 2 — `GET /auth/me/stats`

New endpoint returning:
```json
{ "transaction_count": 1842, "total_spend": 1840000.0 }
```
`total_spend` is the sum of `abs(amount)` for all transactions where `amount < 0` (expenses) belonging to the user. New frontend API function `getMyStats()`.

### Change 3 — `PATCH /auth/me/password`

Request body:
```json
{ "current_password": "...", "new_password": "..." }
```
- 401 if `current_password` doesn't match the stored hash
- 422 if `new_password` is shorter than 8 characters
- 409 if `password_hash` is null (Google-only account — though the frontend hides the form, the backend guards it too)
- On success: updates `password_hash`, returns 204

---

## Data Flow

```
localStorage('pf_avatar')
  ↕ useAvatarPrefs
    → Avatar (TopNav popover header)
    → Avatar (ProfileSection preview)
    → avatar swatches / emoji grid

localStorage('pf_display_name')
  ↕ read directly
    → TopNav popover header
    → ProfileSection Account card

/auth/me  →  created_at
/auth/me/stats  →  transaction_count, total_spend
  → ProfileSection Stats card (React Query, staleTime: 5min)

PATCH /auth/me/password
  → ProfileSection Password card mutation
```

---

## What Is Not In Scope

- Profile photo upload (deferred — would need file storage on the backend)
- Avatar shape picker (always circle)
- Custom colour picker (only the 12 presets)
- Cross-device avatar sync (localStorage is device-local by design)
- Changing email address

---

## Files Touched

**New:**
- `src/components/ui/Avatar.tsx`
- `src/hooks/useAvatarPrefs.ts`
- `src/features/settings/components/ProfileSection.tsx`
- `src/lib/api/profile.ts` — `getMyStats`, `changePassword`
- Backend: `app/routers/auth.py` (changes 1–3)
- Backend: new Alembic migration not needed (no schema change for stats/password)

**Modified:**
- `src/components/layout/TopNav.tsx` — use `Avatar`, slim popover
- `src/features/settings/page.tsx` — add Profile nav item
- `src/lib/api/auth.ts` — add `created_at` to `MeResponse` type
- `src/hooks/useMe.ts` — type update flows through automatically
