# hr-web

## Purpose

HR: staff, attendance, leave, gate kiosk and payroll.

Dev port 5177.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/reference-data`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`, `@mts241alikhlash/hr-api`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `presence-service`, `academic-service`, `hr-service`, `student-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- `KioskView` and `EmployeeProfileTabFields` specs run in the `happy-dom` project of `vitest.config.ts`.
- Types come from `@mts241alikhlash/hr-api`.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- None recorded.
