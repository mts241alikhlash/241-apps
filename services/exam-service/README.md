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

- One table template, version 2, for Word (`.docx`) and Excel (`.xlsx`) alike. Sheet `Identitas` (Word: the first table) holds the identity: Versi Template, Nama Guru, NIK, Mapel, Tingkat. Sheet `Soal` (Word: the second table) holds the questions with the columns Jenis, Soal, A to E, Kunci, Abaikan harakat, Poin. A Word file with a third table gets a warning and that table is ignored (table layout only).
- `GET /exam-imports/template` returns the template. `POST /exam-imports/preview` reads the file and returns the questions and row errors without saving. `POST /exam-imports` saves; it takes `confirmDuplicates` when a question's text already exists in the bank.
- The identity must match the package: Mapel, Tingkat, and a NIK of a staff account. A mismatch is refused.
- One bad row cancels the whole import; nothing is saved. Duplicates need `confirmDuplicates`.
- Limits: 500 questions per file, 10 MB.
- Excel files are bounded before ExcelJS reads them (`xlsx-guard.ts`): at most 8 worksheet parts, 1 MB per XML part (4 MB for `sharedStrings.xml`) and 8 MB of XML in total, measured while inflating. The workbook and every worksheet must be well-formed XML, else 400 `Berkas Excel tidak bisa dibaca`. Merged cells, column widths, data validations, conditional formats, hyperlinks, drawings, table parts, `extLst` and defined names are removed first; the import reads only cell values, and a merged range keeps its text in the first cell only.
- Vertical Word layout (`GET /exam-imports/template?format=docx&layout=vertical`, with optional `pg`, `pgKompleks`, `benarSalah`, `isian`, `uraian` counts from 0 to 100, default 20, 10, 10, 0, 5). Sections are `BAGIAN PG`, `BAGIAN PG KOMPLEKS`, `BAGIAN BENAR/SALAH`, `BAGIAN ISIAN` and `BAGIAN URAIAN`; a parenthesised note after the name is ignored. Each question is its question lines (an optional leading number such as `1.`), then choice lines, then `Kunci:` and optional `Abaikan harakat: ya`, and the last line is `Poin:`, which is required and ends the question.
- Choices are typed `A.` to `E.` (also `A)` or `A:`), or left to Word's automatic numbering, where item 1 is A. Typed choices must run in order A, B, C and so on; trailing blank ones are ignored, while a skipped, blank or out-of-order letter is an error. A question takes 2 to 5 choices for PG and PG Kompleks. A `Kunci:` letter that no choice carries is an error, which also catches a blank middle item that Word's automatic numbering silently closed up.
- The standard counts are 20 PG, 10 PG Kompleks, 10 Benar/Salah and 5 Uraian; Isian has no standard. A different count adds a warning such as `PG 18 dari 20` to the preview. Warnings never block a save.

### Berita Acara file

- Handing a Berita Acara in means uploading the signed, scanned copy: `POST /exam-rooms/:roomId/reports/:slotId/submit` is `multipart/form-data` with a required `file` and moves the report from `DRAFT` to `SUBMITTED` only together with the file. One file per report (room and supervisor slot).
- PDF, JPG or PNG only, at most 10 MB, recognised by the first bytes (`%PDF-`, `FF D8 FF`, `89 50 4E 47`), never by the client's mime type or extension. Wrong type is 400 `Berkas harus PDF, JPG, atau PNG`; too large is 413 `Ukuran berkas maksimal 10 MB`; none is 400 `Berkas berita acara wajib diunggah`. Separate from the 2 MB question image policy.
- The object is stored under `exam/room-reports/<uuid>` through `IRoomReportFileStorage`; the client file name is kept only as metadata, never in the key. If the status change loses a race (`REPORT_LOCKED`) the stored object is deleted again.
- `PUT .../file` replaces the file while the report is `SUBMITTED` (`exam-rooms.manage-all` only; 409 when still `DRAFT` or already `VERIFIED`) and deletes the old object; the audit entry `REPLACE_ROOM_REPORT_FILE` holds size and mime type, never content. `GET .../file` streams it as an attachment (`Content-Disposition: attachment`, `nosniff`, `no-store`) to whoever may view the report, 404 when none. Reopening a report keeps the file until the next submit replaces it.
- `hasAttachment` and `attachmentName` are on the report and on the list summary.

### Attendance sheet files

- The three signed attendance sheets are uploaded as scans: student (one per room and supervisor slot), supervisor (one per event day), technician (one per room and day). `PUT /exam-events/:id/attendance-files` is `multipart/form-data` with `kind`, `day` (`YYYY-MM-DD`, the Asia/Jakarta day), `roomId`, `slotId` and `file`; `GET` lists metadata (`kind`, `day` filters) and `GET .../:fileId` downloads. All need `exam-events.manage`; there is no status endpoint, the list tells which scopes are done.
- Scope rules: `STUDENT` needs a `roomId` of the event and a `slotId` of that room, and `day` must be the WIB day of the slot start; `SUPERVISOR` takes only `day` and needs at least one supervisor slot of the event that day; `TECHNICIAN` needs `roomId` and `day`, no `slotId`. Wrong event or room is 404, anything else wrong is 400.
- One row per scope: `scope_key` (`eventId:kind:roomId|-:slotId|-:day`) is unique, so NULL parts cannot duplicate. A re-upload replaces the row and then deletes the old object; if the row cannot be saved the new object is deleted. Delete failures are ignored and may leave an orphan object.
- Same file policy as the Berita Acara (PDF, JPG, PNG by magic bytes, 10 MB), stored under `exam/attendance/<uuid>` through `IAttendanceFileStorage`. Download is an attachment with `nosniff` and `no-store`, named `daftar-hadir-<peserta|pengawas|teknisi>[-<roomCode>]-<yyyyMMdd-HHmm>.<ext>`. Audit `UPLOAD_ATTENDANCE_FILE` keeps kind, day, size and mime type, never content.

### Print pack

- `GET /exam-events/:id/print-pack?roomId=<uuid>` (`exam-events.manage`) returns the event, its rooms in code order, each room's seated students (seat number, name, NIS, classroom, participant number), supervisor slots and technician, and `warnings` (for example students without a participant number). `roomId` limits the pack to one room and answers 404 when it is not in the event.
- Participant numbers come from one bulk call to student-service (`POST /students/participant-numbers/lookup`) per pack, for every seated student of the event. Never call it per student or per room.
- `POST /exam-events/:id/credentials/reset?roomId=<uuid>` (`exam-events.manage`, body `{ confirm: true }`) resets the login passwords of the event's seated students in one identity-service call (chunks of 500) and answers `{ items, skipped }` once, `Cache-Control: no-store`. Passwords are never stored, logged or audited; the audit entry (`RESET_CREDENTIALS`) holds the count and the actor. Students without an account are listed in `skipped`. Not idempotent: each call issues new passwords and kills the cards printed before.

## Gotchas

- A default `test` run reports skipped specs; they are not failures.
- Images are uploaded before the database write, so a failed save can leave orphan image files. Accepted debt.
- Berita Acara files are deleted again when the status change fails, but a crash between upload and save, or a failed delete, can leave an orphan object under `exam/room-reports/`. Accepted debt.
- Nested Word tables are not supported.
- Old v1 Excel files and paragraph-style Word files are rejected with "Unduh template baru".
- In a vertical file, any paragraph starting with the word `Bagian` that is not a section line is an error.
- In every section, a body line that starts with a number and a dot or bracket (`2.`, `3)`) is read as the next question, and so are list items outside PG and PG Kompleks choices. Write numbered statements as `(1)`, `(2)` or with letters or `i.`, `ii.`; a question cut this way reports "soal tidak diakhiri baris Poin" with that hint.
- A table inside a question is an error (row 0); turn its content into an image or text. Only the first table, the identity, is allowed in a vertical file.
- Questions are numbered `soal n` by their order in the file, across sections, in error messages; the template numbers them the same way.
- `Poin:` present but empty means an unused template slot: delete the slot. PG takes exactly one `Kunci:` letter; use PG Kompleks for several.
- A `Poin:` line is required for every question; a question without one is an error.

## Open work

- A score a teacher changes after sending reaches assessment-service again, but the report card is not updated.
- The sessions list does not say which students never started.
- No AI import yet.
