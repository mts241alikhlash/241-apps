# assessment-service

## Purpose

Owns teaching evaluation: assessment items and weights, student scores, lesson attendance, exam scores and report cards.

Port 4000 locally; database `assessment` (7 models: `AssessmentWeight`, `AssessmentItem`, `StudentScore`, `Attendance`, `ReportCard`, `ReportCardSubject`, `ExamScore`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): `academic-service`, `hr-service`, `student-service`, `presence-service`; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- Reads classrooms, semesters, teaching assignments, employees and students from other services over HTTP.
- Report card averages are served to student-service.

## Gotchas

- Exam scores arrive from exam-service; a score changed after it was sent reaches here again but the report card is not updated.

## Open work

- None recorded.
