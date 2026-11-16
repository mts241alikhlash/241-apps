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

### Question import

- One table template, version 2, for Word (`.docx`) and Excel (`.xlsx`) alike. Sheet `Identitas` (Word: the first table) holds the identity: Versi Template, Nama Guru, NIK, Mapel, Tingkat. Sheet `Soal` (Word: the second table) holds the questions with the columns Jenis, Soal, A to E, Kunci, Abaikan harakat, Poin. A Word file with a third table gets a warning and that table is ignored.
- `GET /exam-imports/template` returns the template. `POST /exam-imports/preview` reads the file and returns the questions and row errors without saving. `POST /exam-imports` saves; it takes `confirmDuplicates` when a question's text already exists in the bank.
- The identity must match the package: Mapel, Tingkat, and a NIK of a staff account. A mismatch is refused.
- One bad row cancels the whole import; nothing is saved. Duplicates need `confirmDuplicates`.
- Limits: 500 questions per file, 10 MB.
- Vertical Word layout (`GET /exam-imports/template?format=docx&layout=vertical`, with optional `pg`, `pgKompleks`, `benarSalah`, `isian`, `uraian` counts from 0 to 100, default 20, 10, 10, 0, 5). Sections are `BAGIAN PG`, `BAGIAN PG KOMPLEKS`, `BAGIAN BENAR/SALAH`, `BAGIAN ISIAN` and `BAGIAN URAIAN`; a parenthesised note after the name is ignored. Each question is its question lines (an optional leading number such as `1.`), then choice lines, then `Kunci:` and optional `Abaikan harakat: ya`, and the last line is `Poin:`, which is required and ends the question.
- Choices are typed `A.` to `E.` (also `A)` or `A:`), or left to Word's automatic numbering, where item 1 is A. Typed choices must run in order A, B, C and so on; trailing blank ones are ignored, while a skipped, blank or out-of-order letter is an error. A question takes 2 to 5 choices for PG and PG Kompleks. A `Kunci:` letter that no choice carries is an error, which also catches a blank middle item that Word's automatic numbering silently closed up.
- The standard counts are 20 PG, 10 PG Kompleks, 10 Benar/Salah and 5 Uraian; Isian has no standard. A different count adds a warning such as `PG 18 dari 20` to the preview. Warnings never block a save.

## Gotchas

- A default `test` run reports skipped specs; they are not failures.
- Images are uploaded before the database write, so a failed save can leave orphan image files. Accepted debt.
- Nested Word tables are not supported.
- Old v1 Excel files and paragraph-style Word files are rejected with "Unduh template baru".
- In a vertical file, any paragraph starting with the word `Bagian` that is not a section line is an error.
- In Isian, Benar/Salah and Uraian bodies, avoid lists and avoid later lines that start with `2.` or `3)`: they are read as the next question.
- A `Poin:` line is required for every question; a question without one is an error.

## Open work

- A score a teacher changes after sending reaches assessment-service again, but the report card is not updated.
- The sessions list does not say which students never started.
- No AI import yet.
