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
- [ ] `npm run build` succeeds
- [ ] No inline `any` types introduced
- [ ] All new cross-directory imports use the `@/*` path alias

## Code style

- Code is formatted with Prettier (runs automatically via lint-staged on commit).
- Comments only when the WHY is non-obvious: a hidden constraint, a subtle invariant, or a workaround for a specific external bug.
- Do not add comments that reference the current task, PR, or issue number — those belong in the PR description and rot as the code evolves.

## Testing

Test infrastructure is not yet in place. This section will be updated when it lands. Until then, manual browser testing of the affected flows is expected and should be noted in the PR description.
