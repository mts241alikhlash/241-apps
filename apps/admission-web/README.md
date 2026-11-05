# admission-web

## Purpose

Admission: the public landing and applicant sign-up and form, plus the staff queues (documents, payments, decisions, enrollment).

Dev port 5175.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`, `@mts241alikhlash/academic-api`, `@mts241alikhlash/admission-api`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `academic-service`, `admission-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- Staff menu visibility passes `effectivePermissions` to the shared layout as `permissionsFor`.
- Applicant views (`AdmissionLoginView`, registration, form) live here and use the shared `LoginView`.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- None recorded.
