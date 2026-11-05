# @mts241alikhlash/typescript-config

## Purpose

Shared `tsconfig` presets: `vue.json` (shared Vue strictness), `vue-app.json`, `vue-node.json`, `nest.json` and `library.json`.

## Depends on

- `@vue/tsconfig` for the Vue presets.
- Consumed by every package; a consumer `extends` one preset and keeps only `include`, `paths`, `outDir` and `tsBuildInfoFile`.

## Rules specific to this package

- Compiler options live here, not in the consumers.

## Gotchas

- `tsc --showConfig` of a consumer shows the merged result; compare it before and after a change.

## Open work

- None recorded.
