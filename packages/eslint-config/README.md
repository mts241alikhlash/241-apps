# @mts241alikhlash/eslint-config

## Purpose

Flat ESLint presets for the workspace: `vue()` for apps and Vue packages, `nest()` for services and `nest-core`, both ending with `eslint-config-prettier`.

## Depends on

- `eslint` as a peer; typescript-eslint, `eslint-plugin-vue`, `@eslint-community/eslint-plugin-eslint-comments` and `@eslint/js`.
- Consumed by every package with an `eslint.config.mjs`.

## Rules specific to this package

- Every active rule is an `error` and `--max-warnings=0` stays; unused disable directives and unused inline configs are errors, and a disable needs `-- <reason>`.
- Options: `tsconfigRootDir` (required), `typecheck`, `ignores`, `overrides`. `eslint.typecheck.config.mjs` passes `typecheck: true` and is what `lint:strict` runs.
- The module-boundary `no-restricted-imports` (no `services/*/src` from another service, no Prisma client under `domain/`) lives here; generated files are ignored by config, not by comments.

## Gotchas

- A rule changed here changes every package: compare finding counts per package before and after.

## Open work

- None recorded.
