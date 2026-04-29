# personal-finance

A personal finance and expense tracking single-page application built with React and TypeScript. The app connects to a FastAPI backend, supports multiple users via JWT authentication, and is INR-aware throughout (currency formatting, budget thresholds, and reporting). Users can upload bank statements, review and categorise transactions, track budgets by category, and visualise spending trends on a dashboard.

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

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).
