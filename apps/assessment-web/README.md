# assessment-web

## Purpose

Assessment: scores, report cards and lesson attendance for teachers, and the student's own views.

Dev port 5179.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `assessment-service`, `exam-service`, `academic-service`, `student-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- None beyond the [frontend](../../docs/standards/frontend.md) and [ui](../../docs/standards/ui.md) standards.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- None recorded.
