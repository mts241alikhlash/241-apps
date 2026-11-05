# exam-web

## Purpose

Exam: question bank, packages, schedules, rooms and the student exam session.

Dev port 5181.

## Depends on

- Packages: `@mts241alikhlash/platform`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `exam-service`, `academic-service`, `student-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- `scripts/check-no-comments.mjs` runs in `validate`; HTML `eslint-disable` directives with a reason are allowed.
- Specs that need a DOM declare `// @vitest-environment happy-dom`.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.

## Open work

- Camera proctoring UI and AI import are not finished.
