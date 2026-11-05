# @mts241alikhlash/platform

## Purpose

The web features used by several apps: auth (login, SSO, session), profile and change password, address, blood type, religion, school unit type, dashboard, the reference-data client (`useReferenceList`) and the shared app layout (sidebar, top bar, breadcrumbs, search).

## Depends on

- `@mts241alikhlash/ui` and `web-shared`; third-party libraries are `peerDependencies` and stay dependencies of each app.
- Consumed by all nine apps.

## Rules specific to this package

- Only the exports in `package.json` are importable: `./auth`, `./profile`, `./address`, `./blood-type`, `./religion`, `./school-unit-type`, `./dashboard`, `./reference-data`, `./layout`. Inside the package files import each other by relative path; `@/` never appears.
- A feature used by one app does not belong here; admin-only features live in `apps/admin-web`.
- Each app passes its path after login as `homeRoute` to `configureAuth`; `useLoginForm` pushes it.
- The layout takes `menuSections`, an optional `permissionsFor` and an `app-switcher` slot; the sidebar is `variant: 'sidebar'`, `collapsible: 'icon'`.

## Gotchas

- Apps need `@source` lines for this package in `src/style.css`.
- Two copies of `vue` or `pinia` break stores and `inject()`: keep these libraries as peers and check `pnpm why vue`.
- Specs for `admission-web` variants are kept as `*.admission.spec.ts` beside the main spec.

## Open work

- Fold the `*.admission.spec.ts` variants into their main specs.
