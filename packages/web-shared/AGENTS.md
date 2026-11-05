# AGENTS.md: web-shared

Read [README.md](README.md) first, then the root [AGENTS.md](../../AGENTS.md).

## Standards that apply

- [frontend](../../docs/standards/frontend.md)
- [api](../../docs/standards/api.md): envelope types
- [testing](../../docs/standards/testing.md)

## Working here

- A change reaches every app: run `validate` in at least two apps after it.
- Gate: `pnpm --filter @mts241alikhlash/web-shared run check` and `run test`.
