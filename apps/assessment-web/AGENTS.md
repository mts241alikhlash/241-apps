# AGENTS.md: assessment-web

Read [README.md](README.md) first, then the root [AGENTS.md](../../AGENTS.md).

## Standards that apply

- [frontend](../../docs/standards/frontend.md): feature structure, shared packages, routing
- [ui](../../docs/standards/ui.md): pages, cards, fields, dialogs, tables
- [api](../../docs/standards/api.md): response envelope and generated clients
- [testing](../../docs/standards/testing.md)

## Working here

- Import shared code only through `@mts241alikhlash/platform/<feature>`, `@mts241alikhlash/reference-data`, `@mts241alikhlash/ui` and `@mts241alikhlash/web-shared`.
- Changing which service owns a prefix: edit `api-routes.config.ts`, then `pnpm --filter assessment-web run routes:emit` and `node infra/gateway/generate.mjs`.
- Gate: `pnpm --filter assessment-web run validate`.
