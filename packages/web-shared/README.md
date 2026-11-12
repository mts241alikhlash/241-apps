# @mts241alikhlash/web-shared

## Purpose

Code shared by every web app that is not a component: the API instance and its envelope types, router and menu types, breadcrumbs, the menu visibility composable, outage notification and error-handling helpers and the shared `env.d.ts`.

## Depends on

- `axios`, `openapi-fetch`, `vue-sonner` and the libraries in its `package.json`.
- Consumed by every app and by the other Vue packages.

## Rules specific to this package

- Exports are source files (`./*` maps to `src/*.ts`); import them by subpath (`@mts241alikhlash/web-shared/types/menu.types`).
- Types that augment `vue-router` (`RouteMeta`) live in `types/router.ts`; an app imports it once.

- `utils/service-client.ts`: `createServiceClient` wraps a generated `*-api` client with the shared session (bearer token, one refresh for parallel 401s, never on `/auth/`, one retry from a cloned request). `unwrap`, `unwrapPage` and `unwrapBlob` turn results into data or a `ServiceRequestError` shaped like an axios error, so `getIndonesianErrorMessage` works unchanged; network failures get `code` `ERR_NETWORK`.
- Single refresh path: `refreshSession` in `utils/auth-session.ts` (shared queue) serves both the axios instance in `utils/api.ts` and `createServiceClient`; do not add another refresh.

## Gotchas

- The API base URL comes from `VITE_API_BASE_URL`; the type is declared in `env.d.ts`.

## Open work

- None recorded.
