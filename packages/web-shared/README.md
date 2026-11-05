# @mts241alikhlash/web-shared

## Purpose

Code shared by every web app that is not a component: the API instance and its envelope types, router and menu types, breadcrumbs, the menu visibility composable, outage notification and error-handling helpers and the shared `env.d.ts`.

## Depends on

- `axios`, `vue-sonner` and the libraries in its `package.json`.
- Consumed by every app and by the other Vue packages.

## Rules specific to this package

- Exports are source files (`./*` maps to `src/*.ts`); import them by subpath (`@mts241alikhlash/web-shared/types/menu.types`).
- Types that augment `vue-router` (`RouteMeta`) live in `types/router.ts`; an app imports it once.

## Gotchas

- The API base URL comes from `VITE_API_BASE_URL`; the type is declared in `env.d.ts`.

## Open work

- None recorded.
