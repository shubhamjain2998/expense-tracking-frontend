# personal-finance

[![CI](https://github.com/shubhamjain2998/expense-tracking-frontend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/shubhamjain2998/expense-tracking-frontend/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/shubhamjain2998/expense-tracking-frontend?sort=semver)](https://github.com/shubhamjain2998/expense-tracking-frontend/releases)
[![License: MIT](https://img.shields.io/github/license/shubhamjain2998/expense-tracking-frontend)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933?logo=node.js&logoColor=white)](.nvmrc)

<div align="center">
  <img src=".github/assets/chart-line.gif" width="400" alt="spending trends" />
  <p><em>Upload statements &rarr; categorise &rarr; visualise. Know where every rupee goes.</em></p>
</div>

A personal finance and expense tracking single-page application built with React and TypeScript. The app connects to a FastAPI backend, supports multiple users via JWT authentication, and is INR-aware throughout (currency formatting, budget thresholds, and reporting). Users can upload bank statements, review and categorise transactions, track budgets by category, and visualise spending trends on a dashboard.

## Features

<table>
<tr>
<td valign="top" width="55%">

- **Dashboard** — category breakdown pie chart, spending trends, tag-spend charts, and a category-tag matrix at a glance
- **Budget tracking** — set monthly and annual thresholds per category, see unbudgeted categories with quick-add amounts
- **Bank statement upload** — PDF, paste-as-text, or manual entry; preview before import with auto-applied ignore rules
- **Transaction review** — paginated prev/next flow, category + tag assignment, person-share splitting and settlement
- **INR-aware** — Indian financial year period mode (Apr–Mar), ₹ formatting throughout
- **Multi-user** — JWT auth, per-user data isolation, shared expense settlement

</td>
<td valign="top" align="center" width="45%">
  <img src=".github/assets/chart-pie.gif" width="175" alt="category breakdown" />
  &nbsp;
  <img src=".github/assets/chart-bar.gif" width="175" alt="monthly trends" />
</td>
</tr>
</table>

## Stack

| Layer | Technology |
|---|---|
| UI | React 19, TypeScript |
| Build | Vite 8 |
| Routing | React Router 7 |
| Data fetching | TanStack Query 5 |
| Charts | Recharts |
| Styling | Tailwind CSS 4 |
| HTTP | Axios |

## Getting started

**Prerequisites:** Node 22+ (`.nvmrc` is provided — use `nvm use` to switch automatically).

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview the production build locally
npm run preview

# Lint
npm run lint

# Type-check without emitting
npm run typecheck

# Tests
npm test                # run once
npm run test:watch      # watch mode
npm run test:ui         # Vitest UI
npm run test:coverage   # coverage report

# Bundle analyzer (writes stats.html after build)
npm run analyze
```

## Environment

Copy `.env.example` to `.env.local` and adjust as needed:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |

The variable is read once in `src/lib/config.ts` and re-exported as typed constants (`API_URL`, `IS_DEV`, `IS_PROD`). Import from there — do not read `import.meta.env` directly in feature code.

## Architecture

```
src/
├── features/          # Feature modules (dashboard, upload, review, budget, settings, transactions)
├── lib/
│   ├── api/           # Axios client + per-resource API functions
│   ├── config.ts      # Runtime env config (single source of truth)
│   ├── format.ts      # INR/date/number formatters
│   ├── strings.ts     # String utilities
│   └── queryKeys.ts   # TanStack Query key factories
├── hooks/             # Shared React hooks
├── components/        # Shared UI components
├── types/             # Shared TypeScript types
├── contexts/          # React contexts
└── pages/             # Route-level page components
```

Path alias `@/*` maps to `src/*` — use it for all cross-directory imports.

## Conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Scopes are enforced by commitlint:

`dashboard` · `upload` · `review` · `budget` · `transactions` · `settings` · `api` · `types` · `components` · `hooks` · `layout` · `config` · `deps` · `docs`

Pre-commit hook runs lint-staged (ESLint + Prettier) over staged `src/` files.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions, and the PR checklist. All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md) for the private vulnerability reporting process.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release-by-release notes, or the [Releases page](https://github.com/shubhamjain2998/expense-tracking-frontend/releases) for the rendered version.

## License

<div align="center">
  <img src=".github/assets/budget.gif" width="260" alt="track your budget" />
</div>

[MIT](LICENSE) © Shubham Jain
