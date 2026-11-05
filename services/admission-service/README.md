# admission-service

## Purpose

Owns admission waves, applications, documents and document types, payments and bank accounts, announcements, download files, landing content, decisions and enrollment of accepted applicants.

Port 3700 locally; database `admission` (16 models: `AdmissionWave`, `AdmissionApplication`, `AdmissionApplicationParent`, `AdmissionAchievement`, `AdmissionScholarship`, `AdmissionDocumentType`, `AdmissionDocument`, `AdmissionPayment`, `AdmissionAnnouncement`, `AdmissionNotification`, `AdmissionBankAccount`, `AdmissionNisLock`, `AdmissionDownload`, `AdmissionLandingSection`, `AdmissionLandingImage`, `File`). The terms are in the [glossary](../../GLOSSARY.md).

## Depends on

- Packages: `@mts241alikhlash/nest-core` (shared infrastructure).
- Other services (HTTP, through ports and adapters in `src/platform/` or `integration/`): `student-service`, `academic-service`; and always identity, for token introspection and permissions.
- PostgreSQL (its own database) and, where uploads exist, the S3 bucket.

## Rules specific to this package

- Without a `waveId` the service resolves the active wave itself (`findActiveWave`); with no open wave, registration answers 400.
- It names `APPLICANT` and `STUDENT` only to grant them, never to decide an authorization outcome.
- NIS numbers are composed from the school-year code, grade level and an alphabetical sequence, and the lock (`AdmissionNisLock`) is one-way.

## Gotchas

- The public landing answer is sent with `Cache-Control: public, max-age=60`.
- Late documents are computed, not stored: the limit comes from the first semester start plus the type's months.

## Open work

- Carry the admission data into student-service after enrollment with an edit screen, then the EMIS export.
