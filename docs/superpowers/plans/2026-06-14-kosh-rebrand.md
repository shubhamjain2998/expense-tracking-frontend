# Kosh Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the app from "Personal Finance" to "Kosh", update all brand touchpoints, add warm-brown colour tokens, and surface the privacy USPs on auth pages.

**Architecture:** Pure copy/identity changes across 9 files — no new components, no routing changes, no data-model changes. The amber K mark is implemented inline (a `<span>` with inline styles) to avoid creating a new component for a one-element change. Privacy badges are also inline on LoginPage and RegisterPage. The localStorage key migration is a one-time shim that runs before React mounts.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite. All changes are in `src/` or root config files.

---

## Pre-flight: create the feature branch

- [ ] **Create and switch to the rebrand branch**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
git checkout -b feat/kosh-rebrand
```

Expected: `Switched to a new branch 'feat/kosh-rebrand'`

---

## Task 1: Add Kosh colour tokens to `tokens.css`

**Files:**
- Modify: `src/styles/tokens.css` (append after existing tokens)

- [ ] **Step 1: Append the Kosh brand tokens at the end of the `:root` block**

Open `src/styles/tokens.css`. The file ends with `--mono: var(--font-mono); /* legacy alias */` and then the closing brace and dark-mode block. Add the following lines **inside** the `:root {` block, just before its closing `}`:

```css
  /* Kosh brand palette — Warm Treasury */
  --kosh-brown-deep: #2e1608;
  --kosh-brown-mid: #3d1f0a;
  --kosh-brown-warm: #5c3520;
  --kosh-amber: #d4a96a;
  --kosh-amber-light: #e8c99a;
  --kosh-cream: #fef9f2;
  --kosh-cream-dark: #f5ede0;
  --kosh-sand: #ead9c4;
```

- [ ] **Step 2: Verify tokens file still parses (no build error)**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
npm run typecheck 2>&1 | tail -5
```

Expected: no errors (typecheck doesn't parse CSS but confirms Vite config is intact).

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(brand): add kosh warm-treasury colour tokens"
```

---

## Task 2: Migrate localStorage theme key

Three places reference `pf-theme`: the inline script in `index.html`, the `STORAGE_KEY` constant in `useTheme.ts`, and the migration shim we add to `main.tsx`.

**Files:**
- Modify: `index.html` (inline script)
- Modify: `src/hooks/useTheme.ts:6`
- Modify: `src/main.tsx`

- [ ] **Step 1: Update the inline script in `index.html`**

In `index.html`, change the inline `<script>` block from:

```js
(function () {
  var stored = localStorage.getItem('pf-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
})();
```

To:

```js
(function () {
  var legacy = localStorage.getItem('pf-theme');
  if (legacy !== null) {
    localStorage.setItem('kosh-theme', legacy);
    localStorage.removeItem('pf-theme');
  }
  var stored = localStorage.getItem('kosh-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
})();
```

- [ ] **Step 2: Update `STORAGE_KEY` in `useTheme.ts`**

In `src/hooks/useTheme.ts`, line 6, change:

```ts
const STORAGE_KEY = 'pf-theme'
```

To:

```ts
const STORAGE_KEY = 'kosh-theme'
```

- [ ] **Step 3: Commit**

```bash
git add index.html src/hooks/useTheme.ts
git commit -m "feat(brand): migrate localStorage theme key from pf-theme to kosh-theme"
```

---

## Task 3: Update `index.html` title and `package.json` name

**Files:**
- Modify: `index.html` (title tag)
- Modify: `package.json` (name field)

- [ ] **Step 1: Update the `<title>` in `index.html`**

Change:

```html
<title>Personal Finance</title>
```

To:

```html
<title>Kosh</title>
```

- [ ] **Step 2: Update the `name` field in `package.json`**

Change line 2:

```json
"name": "personal-finance",
```

To:

```json
"name": "kosh",
```

- [ ] **Step 3: Commit**

```bash
git add index.html package.json
git commit -m "feat(brand): rename app to Kosh in title and package.json"
```

---

## Task 4: Update `TopNav.tsx` — logo mark and brand name

**Files:**
- Modify: `src/components/layout/TopNav.tsx:79-82`

- [ ] **Step 1: Replace the brand block**

In `src/components/layout/TopNav.tsx`, find the `{/* Brand */}` comment block (lines 77–84). Replace the inner logo and name:

```tsx
{/* Brand */}
<div className="topnav-brand">
  <span
    aria-hidden
    style={{
      width: 22,
      height: 22,
      background: 'var(--kosh-amber)',
      color: 'var(--kosh-brown-deep)',
      borderRadius: 5,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: 12,
      letterSpacing: '-0.5px',
      flexShrink: 0,
    }}
  >
    K
  </span>
  <span className="topnav-brand-name">Kosh</span>
  <div className="topnav-brand-sep" aria-hidden />
</div>
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopNav.tsx
git commit -m "feat(brand): update TopNav logo mark and brand name to Kosh"
```

---

## Task 5: Update `Footer.tsx` — logo, brand name, copyright

**Files:**
- Modify: `src/components/layout/Footer.tsx:19-31,51-57`

- [ ] **Step 1: Replace the footer brand block and copyright**

Replace the entire contents of `src/components/layout/Footer.tsx` with:

```tsx
import { NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budget', label: 'Budget' },
  { to: '/settings', label: 'Settings' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-12 border-t border-[var(--line)] bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-2xl px-7 py-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              style={{
                width: 18,
                height: 18,
                background: 'var(--kosh-amber)',
                color: 'var(--kosh-brown-deep)',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 10,
                letterSpacing: '-0.5px',
                flexShrink: 0,
              }}
            >
              K
            </span>
            <span className="text-[12px] font-semibold text-[var(--ink-2)] tracking-[-0.005em]">
              Kosh
            </span>
            <span className="hidden text-[11.5px] sm:inline text-[var(--ink-4)]">
              · privacy-first · local
            </span>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-1.5">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'text-[11.5px] font-medium text-[var(--ink-2)] no-underline'
                    : 'text-[11.5px] transition-colors text-[var(--ink-3)] no-underline'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-4 flex flex-col items-start justify-between gap-1 pt-4 sm:flex-row sm:items-center border-t border-[var(--line)]">
          <p className="text-[10.5px] text-[var(--ink-4)]">
            © {year} Kosh · Your data, your rules.
          </p>
          <p className="text-[10.5px] text-[var(--ink-4)]">
            Track what you spend. Own what you know.
          </p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat(brand): update Footer brand name, logo mark, and copyright to Kosh"
```

---

## Task 6: Update `LoginPage.tsx` — logo, tagline, privacy badges

**Files:**
- Modify: `src/pages/LoginPage.tsx:65-89,94`

- [ ] **Step 1: Replace the logo/brand block and subtitle, add privacy badges**

In `src/pages/LoginPage.tsx`, replace the outer `<div className="w-full max-w-sm">` and everything inside it. The full return JSX should be:

```tsx
return (
  <div
    className="auth-page flex min-h-screen items-center justify-center px-4"
    style={{ background: 'var(--bg)' }}
  >
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center gap-2.5">
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            background: 'var(--kosh-amber)',
            color: 'var(--kosh-brown-deep)',
            borderRadius: 4,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: '-0.5px',
          }}
        >
          K
        </span>
        <span
          className="text-[14px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
        >
          Kosh
        </span>
      </div>

      <div className="card animate-scale-in">
        <p className="eyebrow">Sign in</p>
        <h1 className="display mt-2 text-[28px] text-[var(--ink)]">Welcome back</h1>
        <p className="mt-2 text-[13px] text-[var(--ink-3)]">
          Track what you spend. Own what you know.
        </p>

        <div className="mt-5">
          <GoogleSignInButton
            text="signin_with"
            onCredential={handleGoogleCredential}
            onError={setError}
            disabled={loading}
          />
        </div>

        <div
          className="my-4 flex items-center gap-3 text-[11px] tracking-wider uppercase"
          style={{ color: 'var(--ink-3)' }}
        >
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
          or
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="eyebrow mb-1 block">Email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              placeholder="you@example.com"
              className={`input ${touched.email && !email ? 'is-invalid' : ''}`}
              autoComplete="email"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Password</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              placeholder="••••••••"
              className={`input ${touched.password && !password ? 'is-invalid' : ''}`}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p
              className="text-[12px]"
              style={{
                background: 'var(--neg-soft)',
                color: 'var(--neg)',
                borderRadius: 'var(--radius)',
                padding: '6px 10px',
              }}
            >
              {error}
            </p>
          )}

          <Button variant="primary" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="mt-5 text-center text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none' }}
          >
            Register
          </Link>
        </p>
      </div>

      {/* Privacy trust marks */}
      <div
        className="mt-5 grid grid-cols-2 gap-2"
      >
        {[
          { icon: '🔒', title: 'No SMS access', sub: 'We never read your messages' },
          { icon: '📭', title: 'No email access', sub: 'We never scan your inbox' },
          { icon: '📄', title: 'PDFs not stored', sub: 'Processed locally, then discarded' },
          { icon: '👤', title: 'You own your data', sub: 'Export or delete anytime' },
        ].map(({ icon, title, sub }) => (
          <div
            key={title}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '8px 10px',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>{icon}</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.3 }}>{title}</p>
              <p style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.3 }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)
```

- [ ] **Step 2: Verify the file compiles**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat(brand): update LoginPage with Kosh branding, tagline, and privacy badges"
```

---

## Task 7: Update `RegisterPage.tsx` — logo, tagline, privacy badges

**Files:**
- Modify: `src/pages/RegisterPage.tsx:71-95,100`

- [ ] **Step 1: Replace the logo/brand block, subtitle, add privacy badges**

In `src/pages/RegisterPage.tsx`, replace the full return JSX with:

```tsx
return (
  <div
    className="auth-page flex min-h-screen items-center justify-center px-4"
    style={{ background: 'var(--bg)' }}
  >
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center gap-2.5">
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            background: 'var(--kosh-amber)',
            color: 'var(--kosh-brown-deep)',
            borderRadius: 4,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: '-0.5px',
          }}
        >
          K
        </span>
        <span
          className="text-[14px] font-semibold"
          style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
        >
          Kosh
        </span>
      </div>

      <div className="card animate-scale-in">
        <p className="eyebrow">Get started</p>
        <h1 className="display mt-2 text-[28px] text-[var(--ink)]">Create account</h1>
        <p className="mt-2 text-[13px] text-[var(--ink-3)]">
          Track what you spend. Own what you know.
        </p>

        <div className="mt-5">
          <GoogleSignInButton
            text="signup_with"
            onCredential={handleGoogleCredential}
            onError={setError}
            disabled={loading}
          />
        </div>

        <div
          className="my-4 flex items-center gap-3 text-[11px] tracking-wider uppercase"
          style={{ color: 'var(--ink-3)' }}
        >
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
          or
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="eyebrow mb-1 block">Email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              placeholder="you@example.com"
              className={`input ${touched.email && !email ? 'is-invalid' : ''}`}
              autoComplete="email"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Password</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              placeholder="••••••••"
              className={`input ${touched.password && !password ? 'is-invalid' : ''}`}
              autoComplete="new-password"
              minLength={8}
              required
            />
            {password.length > 0 && password.length < 8 && (
              <p className="mt-1 text-[11.5px]" style={{ color: 'var(--neg)' }}>
                Password must be at least 8 characters ({password.length}/8)
              </p>
            )}
          </div>
          <div>
            <label className="eyebrow mb-1 block">Confirm password</label>
            <input
              type="password"
              name="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
              placeholder="••••••••"
              className={`input ${touched.confirm && !confirm ? 'is-invalid' : ''}`}
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <p
              className="text-[12px]"
              style={{
                background: 'var(--neg-soft)',
                color: 'var(--neg)',
                borderRadius: 'var(--radius)',
                padding: '6px 10px',
              }}
            >
              {error}
            </p>
          )}

          <Button variant="primary" className="w-full" loading={loading}>
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Privacy trust marks */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          { icon: '🔒', title: 'No SMS access', sub: 'We never read your messages' },
          { icon: '📭', title: 'No email access', sub: 'We never scan your inbox' },
          { icon: '📄', title: 'PDFs not stored', sub: 'Processed locally, then discarded' },
          { icon: '👤', title: 'You own your data', sub: 'Export or delete anytime' },
        ].map(({ icon, title, sub }) => (
          <div
            key={title}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '8px 10px',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>{icon}</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.3 }}>{title}</p>
              <p style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.3 }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RegisterPage.tsx
git commit -m "feat(brand): update RegisterPage with Kosh branding, tagline, and privacy badges"
```

---

## Task 8: Update `WelcomeModal.tsx` — intro copy and Ingest step

**Files:**
- Modify: `src/components/onboarding/WelcomeModal.tsx:19-44,118-121`

- [ ] **Step 1: Update the STEPS array and intro copy**

In `src/components/onboarding/WelcomeModal.tsx`, replace the `STEPS` constant (lines 19–44) with:

```ts
const STEPS: PlaybookStep[] = [
  {
    icon: 'category',
    title: 'Categorise',
    why: "Categories are the buckets every chart, budget and report aggregates against. Without them there's nothing to analyse — just a list of rows.",
    todo: 'In Settings → Categories, add names like Rent, Groceries, Travel. Start with 6–10; you can split or rename them later.',
  },
  {
    icon: 'account_balance_wallet',
    title: 'Budget',
    why: "An annual budget smooths the lumpy months — travel, insurance, gifts — that a monthly budget can't represent. The dashboard converts it back into monthly pace automatically.",
    todo: "On the Budget page, set a yearly ₹ amount per category. Think of it as what you'd spend across all 12 months combined.",
  },
  {
    icon: 'upload',
    title: 'Upload',
    why: 'Drop your bank PDF. Kosh reads it locally — the file is never stored on any server. Only the parsed transaction rows are saved to your account.',
    todo: 'Drop a statement PDF on the Upload page. Parsed transactions land in a review queue, not your live data.',
  },
  {
    icon: 'fact_check',
    title: 'Review & analyse',
    why: 'Auto-categorisation handles merchants we've seen before, but new ones need a human call. Every confirmation trains the next import, so the queue shrinks over time.',
    todo: 'On the Transactions page, confirm or fix the category for each pending row. The dashboard updates as soon as they\'re approved.',
  },
]
```

Then replace the intro paragraph (lines 117–122) from:

```tsx
{isFirst && (
  <p className="text-[13px] leading-[1.55] text-[var(--ink-2)]">
    Personal Finance is a four-step loop you repeat each month. Here&apos;s why each step
    is there and what you&apos;ll fill in.
  </p>
)}
```

To:

```tsx
{isFirst && (
  <p className="text-[13px] leading-[1.55] text-[var(--ink-2)]">
    Kosh works as a four-step loop you repeat each month. Simple by design.
  </p>
)}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/WelcomeModal.tsx
git commit -m "feat(brand): update WelcomeModal intro copy and Upload step privacy language"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full typecheck and tests**

```bash
cd "/Users/shubhamjain/workspace/Expense Tracking/code/frontend"
npm run typecheck && npm run test
```

Expected: no type errors, all tests pass.

- [ ] **Step 2: Start dev server and spot-check in browser**

```bash
npm run dev
```

Open `http://localhost:5173` and verify:
- Browser tab shows "Kosh"
- Login page: amber K mark, "Kosh" wordmark, tagline "Track what you spend. Own what you know.", 4 privacy badges below card
- Register page: same treatment as login
- Top nav: amber K mark, "Kosh" text
- Footer: amber K mark, "Kosh", updated copyright
- Theme toggle still works (dark/light) — preference is preserved across reload

- [ ] **Step 3: Check git log**

```bash
git log --oneline feat/kosh-rebrand ^main
```

Expected: 8 commits on the branch (tokens, localStorage, title/package, topnav, footer, login, register, welcome).
