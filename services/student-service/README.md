# student-service

## Purpose

Owns the student lifecycle: students, parents and their links, class enrollment, graduation and graduation holds.

Port 3900 locally; database `student` (6 models: `StudentEnrollment`, `StudentGraduation`, `StudentGraduationHold`, `Parent`, `StudentParent`, `Student`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure), `@mts241alikhlash/academic-api`.
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): `assessment-service`, `academic-service`; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- A person's address is not stored here; it lives in identity-service and is read over HTTP.
- Enrollment from admission arrives through `POST /students/enroll`.

## Gotchas

- Classroom, semester and academic year data are read from academic-service; keep the narrow read models in `platform/`.

## Open work

- None recorded.
