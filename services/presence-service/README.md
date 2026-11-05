# presence-service

## Purpose

Owns gate credentials, devices, scans, one daily attendance row per person per day, leave, work patterns and the monthly attendance period that closes.

Port 3400 locally; database `presence` (14 models: `PresenceCredential`, `PresenceDevice`, `PresenceScan`, `DailyPresence`, `PresenceCorrection`, `WorkPattern`, `WorkPatternDay`, `WorkPatternAssignment`, `NonWorkingDay`, `LeaveType`, `LeaveRequest`, `LeaveDay`, `LeaveBalance`, `AttendancePeriod`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): none; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- Every model keys on `userId`, never on a student or employee table. The enum `PresenceSubjectType { STUDENT, EMPLOYEE }` filters recaps and is never branched on for behavior.
- The monthly summary arithmetic (`summarizeMonth`) has exactly one implementation here; payroll consumes it over HTTP.

## Gotchas

- Payroll lived here for a day and moved to hr-service; do not merge or split them again until the arithmetic sits behind a contract both sides test.

## Open work

- A screen to issue and print student cards, and a student recap, are frontend work in academic-web.
