# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] — 2026-05-16

### Added
- Vitest test infrastructure with first tests for pure helpers.
- GitHub Actions CI workflow (lint, typecheck, test, build) gated on PR and `main` push.
- Bundle analyzer (`npm run analyze`) and production sourcemaps for build observability.

### Changed
- Consolidated cross-page React Query usage into domain hooks.
- Split monolithic `index.css` into `tokens`, `base`, `components`, `utilities` layers.

### Fixed
- Pinned `eslint` and `@eslint/js` to `^9.39.4` (eslint v10 not yet supported by `eslint-plugin-import`, `eslint-plugin-react`, `eslint-plugin-jsx-a11y`).
- Regenerated `package-lock.json` to include Linux-only optional dependencies (`@emnapi/core`, `@emnapi/runtime`) so `npm ci` succeeds in CI.

## [0.4.0] — 2026-04-29

### Changed
- Decomposed every page (Settings, Upload, Budget, Transactions, Dashboard) into a feature module.

### Added
- README, CONTRIBUTING, SECURITY, dependabot config, and pull-request template.

## [0.3.0] — 2026-04-26

### Added
- Indian financial year period mode wired across pages.
- `ErrorBoundary`, route-level lazy loading, `AuthContext` via Axios interceptor.
- Path alias `@/*` and centralised env config in `lib/config`.

### Changed
- New Personal Finance design tokens, sidebar + slim topnav layout, primitive and form components remapped to the design system.
- Split monolithic `api.ts` into per-domain modules.

## [0.2.0] — 2026-04-22

### Added
- JWT authentication with login/register pages and protected routes.
- Categories and tags addressed by ID; share/settlement endpoints.
- `PersonShareBuilder` and `QuickAddFAB` layout components.
- Paste-text and manual-entry modes on the Upload page.
- Ignore-rules library with auto-exclusion on upload preview.
- Tag filtering, tag-spend chart, and category-tag matrix on the Dashboard.

## [0.1.0] — 2026-04-06

### Added
- Initial Aura Finance frontend scaffold (React 19 + TypeScript + Vite + Tailwind).
- Dashboard, Transactions, Upload, Settings, and Budget pages with single-user data flow.
- Dark mode, INR currency formatting, and a warm earthy palette.
- Admin data management section in Settings.

[Unreleased]: https://github.com/shubhamjain2998/expense-tracking-frontend/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/shubhamjain2998/expense-tracking-frontend/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/shubhamjain2998/expense-tracking-frontend/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/shubhamjain2998/expense-tracking-frontend/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/shubhamjain2998/expense-tracking-frontend/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/shubhamjain2998/expense-tracking-frontend/releases/tag/v0.1.0
