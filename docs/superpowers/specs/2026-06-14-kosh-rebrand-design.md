# Kosh — Rebrand Design Spec

**Date:** 2026-06-14  
**Branch:** fix/topnav-spent-stat (implement on a new branch: `feat/kosh-rebrand`)  
**Scope:** Name, identity, copy, and colour token changes. No new features. No layout changes.

---

## 1. Brand Decision

| | Before | After |
|---|---|---|
| **Name** | Personal Finance | **Kosh** |
| **Script** | — | कोश (Devanagari, decorative) |
| **Origin** | — | Sanskrit · treasury, repository, protective sheath |
| **Tagline** | — | **"Track what you spend. Own what you know."** |
| **Direction** | — | Warm Treasury — premium, warm, understated |

### Why Kosh

Kosh (कोश) is an ancient Sanskrit word with three layers of meaning that map directly to the app's USPs:

- **Treasury / repository** → a place where things are stored carefully (the app's function)
- **Protective sheath** → a cover that keeps contents safe (the privacy promise)
- **Kosha in Vedanta** → layers that enclose and protect the self (depth/heritage)

It is short, pronounceable in any language, completely unowned in the finance-app space, and sounds premium in English without being pretentious.

### Why this tagline

"Track what you spend. Own what you know." — two verbs, two promises:
- **Track** = the core function (expense tracking, not wealth management or net worth)
- **Own** = the differentiator (your data is yours; no SMS, no email, no PDF storage)

Deliberately scoped to transactions/expenses. Does not claim wealth management, investment tracking, or net worth calculation.

---

## 2. Colour Palette

New warm brown tokens are added alongside the existing design system. The oxblood accent (`#8b2635`) is **retained** for data highlights, over-budget states, and alerts — it pairs naturally with the warm browns.

| Token name | Hex | Usage |
|---|---|---|
| `--kosh-brown-deep` | `#2e1608` | Header backgrounds, dark surfaces |
| `--kosh-brown-mid` | `#3d1f0a` | Primary brand colour, headings |
| `--kosh-brown-warm` | `#5c3520` | Secondary text on light bg |
| `--kosh-amber` | `#d4a96a` | Logo mark background, accent |
| `--kosh-amber-light` | `#e8c99a` | Text on dark brown bg |
| `--kosh-cream` | `#fef9f2` | Page background (replaces pure white) |
| `--kosh-cream-dark` | `#f5ede0` | Card/surface background |
| `--kosh-sand` | `#ead9c4` | Borders, dividers |

These are additive — no existing tokens are renamed or removed in this pass.

---

## 3. Typography

No new fonts. The existing stack already fits the Warm Treasury personality:

| Font | Role |
|---|---|
| Cabinet Grotesk 700/800 | Brand name display, large headings |
| General Sans 400/500/600/700 | UI body, nav items, descriptions |
| JetBrains Mono 400/500 | Monetary amounts, dates, code |

---

## 4. Logo Mark

A simple amber square with the letter "K" serves as the icon mark. It appears in:
- Top nav (22×22px, border-radius 5px)
- Login/register page header (22×22px)
- Standalone app icon (64×64px)

The Devanagari script "कोश" appears as a decorative subscript below the wordmark where space allows (login header, about/privacy pages). It is display-only and does not affect accessibility.

**Logo variants:**
- Dark: cream text + amber mark on `#2e1608` background
- Light: brown text + amber mark on cream background
- Compact (nav): mark + wordmark only, no Devanagari
- Icon only: amber square with K

---

## 5. Privacy Trust Marks

Four compact badges appear on the login page and register page, and in the onboarding modal. They are factual statements, not marketing copy.

| Icon | Title | Subtitle |
|---|---|---|
| 🔒 | No SMS access | We never read your messages |
| 📭 | No email access | We never scan your inbox |
| 📄 | PDFs not stored | Processed locally, then discarded |
| 👤 | You own your data | Export anytime, delete anytime |

These replace the current absence of any privacy communication at auth surfaces.

---

## 6. Voice & Tone

Kosh's voice is: **calm, precise, direct**. No jargon. No pep talk. No "Amazing!" or "You're all set!".

Statements are short. Privacy is stated as fact, not marketed as a feature.

### Copy rewrites

| Location | Before | After |
|---|---|---|
| Login subtitle | "Sign in to your account." | "Track what you spend. Own what you know." |
| Register subtitle | "Create your account." | "Track what you spend. Own what you know." |
| WelcomeModal intro | "Personal Finance is a four-step loop you repeat each month. Here's why each step is there and what you'll fill in." | "Kosh works as a four-step loop you repeat each month. Simple by design." |
| WelcomeModal step 1 | existing upload copy | "Upload — Drop your bank PDF. Kosh reads it locally. The file is never stored." |
| Footer copyright | "© 2026 Personal Finance. All rights reserved." | "© 2026 Kosh · Your data, your rules." |
| Footer brand name | "Personal Finance" | "Kosh" |

---

## 7. Files That Change

| File | Change |
|---|---|
| `index.html` | `<title>` → `"Kosh"`, inline script `pf-theme` → `kosh-theme` |
| `package.json` | `"name"` → `"kosh"` |
| `src/components/layout/TopNav.tsx` | Brand name text + amber K mark |
| `src/components/layout/Footer.tsx` | Brand name + copyright line |
| `src/pages/LoginPage.tsx` | Brand name + tagline + 4-badge privacy strip |
| `src/pages/RegisterPage.tsx` | Brand name + tagline + 4-badge privacy strip |
| `src/components/onboarding/WelcomeModal.tsx` | Intro copy + step 1 copy |
| `src/styles/` (global CSS / tokens) | Add `--kosh-*` colour tokens |
| `src/main.tsx` | localStorage migration shim (`pf-theme` → `kosh-theme`) |

---

## 8. localStorage Migration

The theme preference is stored under `pf-theme`. This key must be migrated to `kosh-theme` with a one-time shim on app boot:

```ts
// Run once at app startup (main.tsx or App.tsx)
const legacy = localStorage.getItem('pf-theme');
if (legacy !== null) {
  localStorage.setItem('kosh-theme', legacy);
  localStorage.removeItem('pf-theme');
}
```

Existing users retain their dark/light preference. The key in `index.html`'s inline script must also be updated.

---

## 9. Out of Scope

- Favicon / SVG icon redesign (separate task; current favicon.svg stays)
- Backend changes (name, package, API)
- New features or layout changes
- Route/URL changes
- Database or API field renames
- Any change to data models, hooks, or query logic
