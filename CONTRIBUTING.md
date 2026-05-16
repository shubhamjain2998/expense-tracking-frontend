# Contributing

## Branch naming

| Type | Pattern |
|---|---|
| New feature | `feat/*` |
| Bug fix | `fix/*` |
| Refactoring | `refactor/*` |
| Chores / tooling | `chore/*` |
| Documentation | `docs/*` |

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <lowercase subject>
```

Scopes enforced by commitlint:

`dashboard` · `upload` · `review` · `budget` · `transactions` · `settings` · `api` · `types` · `components` · `hooks` · `layout` · `config` · `deps` · `docs`

Examples:

```
feat(budget): add monthly rollover support
fix(api): handle 401 refresh race condition
chore(deps): upgrade tanstack-query to 5.x
```

## PR checklist

Before opening a pull request:

- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] No inline `any` types introduced
- [ ] All new cross-directory imports use the `@/*` path alias

CI runs the same four checks on every PR via [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Code style

- Code is formatted with Prettier (runs automatically via lint-staged on commit).
- Comments only when the WHY is non-obvious: a hidden constraint, a subtle invariant, or a workaround for a specific external bug.
- Do not add comments that reference the current task, PR, or issue number — those belong in the PR description and rot as the code evolves.

## Testing

Tests run via [Vitest](https://vitest.dev/).

| Command | Purpose |
|---|---|
| `npm test` | Run the full suite once (CI mode). |
| `npm run test:watch` | Re-run on file changes. |
| `npm run test:ui` | Open the Vitest UI in the browser. |
| `npm run test:coverage` | Generate a V8 coverage report. |

Add tests for any new pure helper, hook, or non-trivial component. UI flows still benefit from a manual browser test alongside automated coverage — note both in the PR description.

## Releases

Releases follow [Semantic Versioning](https://semver.org/) and are published from `main` via annotated git tags (`vX.Y.Z`). Each release has corresponding [GitHub Release](https://github.com/shubhamjain2998/expense-tracking-frontend/releases) notes and a [CHANGELOG.md](CHANGELOG.md) entry — please add an `Unreleased` line to the changelog in your PR when shipping user-visible changes.
