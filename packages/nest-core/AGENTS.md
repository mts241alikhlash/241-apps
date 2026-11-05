# AGENTS.md: nest-core

Read [README.md](README.md) first, then the root [AGENTS.md](../../AGENTS.md).

## Standards that apply

- [backend](../../docs/standards/backend.md): what belongs here and what stays in a service
- [security](../../docs/standards/security.md): the one role bypass lives in `PermissionGuard` here
- [testing](../../docs/standards/testing.md)

## Working here

- Run `pnpm --filter @mts241alikhlash/nest-core run build` and the tests of every service after a change.
- Gate: `pnpm --filter @mts241alikhlash/nest-core run check` and `run test`.
