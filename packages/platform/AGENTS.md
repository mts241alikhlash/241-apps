# AGENTS.md: platform

Read [README.md](README.md) first, then the root [AGENTS.md](../../AGENTS.md).

## Standards that apply

- [frontend](../../docs/standards/frontend.md): shared package rules
- [ui](../../docs/standards/ui.md)
- [security](../../docs/standards/security.md): menu and permissions
- [testing](../../docs/standards/testing.md)

## Working here

- Add an export only when two or more apps need the feature; update the `exports` map and the [frontend standard](../../docs/standards/frontend.md) list.
- Gate: `pnpm --filter @mts241alikhlash/platform run check` and `run test`.
