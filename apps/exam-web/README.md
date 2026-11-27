# exam-web

## Purpose

Exam: question bank, packages, schedules, rooms and the student exam session.

Dev port 5181.

## Depends on

- Packages: `@mts241alikhlash/exam-api`, `@mts241alikhlash/platform`, `@mts241alikhlash/ui`, `@mts241alikhlash/web-shared`.
- Services (API prefixes in `api-routes.config.ts`): `identity-service`, `exam-service`, `academic-service`, `student-service`.
- Sign-on through account-web; the app is registered in identity's `SSO_APPS`.

## Rules specific to this package

- Navigation splits Exam (`/exam/...`, `meta.category = 'EXAM'`) and Classwork (`/classwork/...`, `meta.category = 'NON_EXAM'`), reusing the same activity, schedule, and grading views filtered by `route.meta.category`.
- `scripts/check-no-comments.mjs` runs in `validate`; HTML `eslint-disable` directives with a reason are allowed.
- `/settings/seb` (admin, `exam-schedules.manage-all`) manages SEB configurations and the "Uji konfigurasi" check. Outside SEB, `/my-exams*` renders `SebRequiredView` and calls no exam API. `shared/seb.ts` exposes `readSebKeys()` (returns `null` outside SEB) and `sebVersion()`; `startSession` and resume send `seb` from it.
- The quit page after submit reads `VITE_SEB_QUIT_URL` and links to it when set.
- Time up (the timer reaches zero, or a save answers `TIME_UP`): the sheet locks the answers, stops the answer sync and opens the blocking "Waktu habis" dialog, which submits with the pending answers and retries on its own (10 s, doubling up to 60 s, and at once on `online`) until the server answers; `WINDOW_CLOSED` or `SESSION_LOST` (also from loading the paper after a reload) end it in the finished state with the not-stored note, and `SESSION_LOCKED_BY_VIOLATION` or `TOKEN_REENTRY_REQUIRED` stop the automatic retry but keep "Kirim ulang". The heartbeat carries the session `deadline`; a changed deadline (a staff extension) restarts the clock and is written to the stored session.
- `exam-offline` feature: routes `/exam/offline-scores` (`OfflineScoreListView`) and `/exam/offline-scores/:scheduleId` (`OfflineScoreEntryView`) with `ScoreImportDialog`, `PublishScoresDialog` and `useOfflineScoreEntry` (autosave per row, column paste). The printable Score Sheet is `/exam/print/score-sheet` in `exam-print`. `exam-activity` gains `DeliveryBadge`, `AssignClassroomsDialog`, `AttachPackageDialog` and `ActivityReadinessPanel`.
- Specs that need a DOM declare `// @vitest-environment happy-dom`.

- API calls go through `src/shared/api/clients.ts` (`examClient`, `academicClient`, `identityClient`, `studentClient`, built with `createServiceClient`); feature `api/` files use contract paths and `unwrap*`, with no URL helpers or `encodeURIComponent`. Nothing in the app imports the axios instance (`@mts241alikhlash/web-shared/utils/api`) directly; the auth and address features of `@mts241alikhlash/platform` still use it.

## Gotchas

- A class used only inside a shared package needs the `@source` lines in `src/style.css`; without them the page renders unstyled with no build error.
- `api-routes.config.ts` drives both the dev proxy and the generated gateway; `routes:check` verifies the manifest.
- `VITE_SEB_QUIT_URL` must equal the Quit URL in the `.seb` file; an empty value disables the quit link. Run `routes:check` after adding the public SEB path, or `sebs://` downloads fail at the gateway.

- A feature prefix added to `api-routes.config.ts` (here `/exam-offline`) is not reachable in production until the Release PR and `Update the lock` are merged; before that the gateway answers 404.
- `DataTable` renders its cells twice, as a table and as phone cards, so the offline score inputs exist twice in the DOM; scope queries and focus handling to one of them.

## Open work

- AI import is not finished.
