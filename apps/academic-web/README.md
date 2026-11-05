# academic-web

## Purpose

Academic: academic years, classes, curriculum, timetable and student records.

Dev port 5173.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/reference-data`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `academic-service`, `student-service`, `hr-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- Reference list pages configure `@mts241alikhlash/reference-data` in `config.ts` files.
- Home route after sign-in is `/academic/info`.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- Seed an academic year before the calendar and timetable pages show data.
