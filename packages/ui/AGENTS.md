# AGENTS.md: ui

Read [README.md](README.md) first, then the root [AGENTS.md](../../AGENTS.md).

## Standards that apply

- [ui](../../docs/standards/ui.md): the standards these components implement
- [frontend](../../docs/standards/frontend.md)
- [testing](../../docs/standards/testing.md)

## Working here

- Change a standard once here, with a spec in `src/components/ui/standards.spec.ts` or `src/theme.spec.ts`, rather than overriding it in a page.
- Gate: `pnpm --filter @mts241alikhlash/ui run check` and `run test`.
