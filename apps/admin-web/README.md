# admin-web

## Purpose

Admin: users, roles, permissions, school unit, files, audit log and the admin-only reference lists.

Dev port 5178.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/reference-data`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `portal-service`, `inventory-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- Admin-only features live in `src/features/`; shared ones come from `@mts241alikhlash/platform`.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- A role edited by hand needs new permission codes granted here after a release adds them.
