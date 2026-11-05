# Contributing

## Branches and commits

- Branch from `main`: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`, `docs/<topic>`.
- Conventional Commits (`feat(admission): ...`), no AI attribution, one logical change per commit.
- A pre-commit hook formats staged files with Prettier and fixes ESLint findings in the owning package.

## Changesets and versions

- Every change to a released package (an app, a service, an `*-api` client) needs a changeset: `pnpm changeset`. CI rejects release work without one.
- Versions stay below 1.0.0 while the platform is pre-release: a breaking change bumps the minor, anything else the patch. Contract versions follow the service version (`pnpm run version:check`).

## Validate before a PR

1. Narrow first: the touched spec, or `vue-tsc` / `tsc` for type-only edits.
2. Then the package: `pnpm --filter <app> run validate`, or `pnpm --filter <service> run check` and `run test`.
3. Contract or DTO changes: `pnpm run openapi:check && pnpm run api:check && pnpm run version:check`.
4. Root: `pnpm run lint` (Prettier, the doc checker, ESLint) and `pnpm run runtime:check`.

Test counts never drop. Commands and presets are described in [testing](docs/standards/testing.md).

## Definition of done

- The suite above passes; new behavior has a test that failed before the change.
- Documents that describe the change are updated; each rule lives in one document.
- Held dependencies stay held: see [dependency holds](docs/dependency-holds.md).
- No secrets, server addresses or personal data in the diff.

## Deploying

Deploy and rollback are described in [deploy](docs/guides/deploy.md) and [rollback](docs/guides/rollback.md).
