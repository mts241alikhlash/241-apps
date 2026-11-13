# exam-service

## Purpose

Owns computer-based exams: the question bank with versions, packages and their approval, schedules, rooms and seats, sessions, answers and score publication.

Port 4100 locally; database `exam` (24 models: `ExamActivity`, `ExamActivityAuditLog`, `ExamPolicyPreset`, `ExamPackage`, `ExamPackageReview`, `ExamPackageItem`, `ExamSchedule`, `ExamScheduleParticipant`, `ExamEvent`, `ExamRoom`, `ExamRoomSeat`, `ExamRoomSupervisor`, `ExamRoomReport`, `ExamRoomReportAbsence`, `ExamRoomFieldNote`, `ExamSession`, `ExamAnswer`, `ExamAccessAttempt`, `ScorePublication`, `ExamSessionEvent`, `ExamSessionAuditLog`, `Question`, `QuestionVersion`, `ExamFile`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): `academic-service`, `hr-service`, `student-service`, `assessment-service`; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- `ExamType` is `DAILY | ASSIGNMENT | MIDTERM | FINAL`. `ExamCategory` (`EXAM | NON_EXAM`) is derived in `categoryOf(type)` and emitted on responses; never store `category` in the database ([ADR 0009](../../docs/adr/0009-exam-category-derives-from-type.md)).
- `MIDTERM` and `FINAL` activities lock their policy preset to their own type, require `ROTATING` tokens, and must link to a matching `ExamEvent`. Only `exam-schedules.manage-all` may create `FINAL` activities or edit policy presets (`/exam-policy-presets`).
- Exams run without a camera; supervision is the room supervisor, kiosk mode, violations and the absence gap from `lastSeenAt` ([ADR 0010](../../docs/adr/0010-exams-run-without-a-camera.md)).
- Client rules: `platform` comes from the request (`Origin` or `Sec-Fetch-Site`, or `X-Client-Platform: web`); `assertClientVerified({ platform, sebVerified })` in `client-gate.policy.ts` rejects a web client without a verified `seb` with `SEB_REQUIRED`. Start and resume sessions call it; native (Istiqra) is never SEB-checked. `ExamSession.client` records `ISTIQRA` or `SEB`.
- `SebVerifier.verify` compares `configKeyHash` with `sha256(pageUrl + configKey)` for each active `SebConfig`, using `timingSafeEqual`. The `pageUrl` origin must be in the exam-web origin list. A failed SEB check does not count as a wrong token attempt.
- SEB endpoints: `GET/POST /seb-configs`, `PATCH/DELETE /seb-configs/:id` (`exam-schedules.manage-all`); `GET /seb-configs/active` and `GET /seb-configs/:id/file` (`exam-sessions.take`); `GET /public/seb-configs/:id/file` serves only active configurations without auth; `POST /seb-configs/check` (`exam-schedules.manage-all`). The Config Key is a weak barrier, derivable from the `.seb` file ([ADR 0011](../../docs/adr/0011-web-exams-run-in-safe-exam-browser.md)).
- Permissions are explicit per action (review, schedule, grade); see the seed for the codes.

## Gotchas

- A default `test` run reports skipped specs; they are not failures.

## Open work

- A score a teacher changes after sending reaches assessment-service again, but the report card is not updated.
- The sessions list does not say which students never started.
- No AI import yet.
