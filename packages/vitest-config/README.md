# @mts241alikhlash/vitest-config

## Purpose

Vitest presets: `nest({ root })` for services and `nest-core` (`unplugin-swc` with legacy decorators and decorator metadata, Node environment, globals, `src/**/*.spec.ts`) and `vue({ root })` for apps and Vue packages (`@vitejs/plugin-vue`, the `@` alias, Node environment, globals, at most 2 workers per package, `smoke/` excluded).

## Depends on

- `vitest`, `unplugin-swc`, `@vitejs/plugin-vue`.
- Consumed by every package with tests; specifics are merged with `mergeConfig`.

## Rules specific to this package

- No package hand-rolls decorator or alias setup; it extends a preset.

## Gotchas

- `nest()` resolves `nestjs-pino` and `@prisma/client/runtime/client` to their CommonJS builds so `nest-core` and the service under test share one instance; otherwise logger tokens and Prisma error classes differ between copies.

## Open work

- None recorded.
