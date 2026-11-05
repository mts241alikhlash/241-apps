# exam-service

## Purpose

Owns computer-based exams: the question bank with versions, packages and their approval, schedules, rooms and seats, sessions, answers and score publication.

Port 4100 locally; database `exam` (22 models: `ExamPackage`, `ExamPackageReview`, `ExamPackageItem`, `ExamSchedule`, `ExamScheduleParticipant`, `ExamEvent`, `ExamRoom`, `ExamRoomSeat`, `ExamRoomSupervisor`, `ExamRoomReport`, `ExamRoomReportAbsence`, `ExamRoomFieldNote`, `ExamSession`, `ExamAnswer`, `ExamAccessAttempt`, `ScorePublication`, `ExamSessionEvent`, `ExamSessionAuditLog`, `ExamProctorSnapshot`, `Question`, `QuestionVersion`, `ExamFile`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): `academic-service`, `hr-service`, `student-service`, `assessment-service`; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- Camera proctoring snapshots are under `exam-sessions/:id/snapshots`.
- Permissions are explicit per action (review, schedule, grade); see the seed for the codes.

## Gotchas

- A default `test` run reports skipped specs; they are not failures.

## Open work

- A score a teacher changes after sending reaches assessment-service again, but the report card is not updated.
- The sessions list does not say which students never started.
- No AI import yet.
