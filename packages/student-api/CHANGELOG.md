# @mts241alikhlash/student-api

## 0.3.1

### Patch Changes

- 9d66ce9: Assessment UI refresh: the assessment item, grading, weight, attendance, rapor and dashboard views are reworked, with a weight list page, score notes and an academic period filter; assessment items filter by several teaching assignments and carry graded and student counts; enrollment summaries carry NISN and gender; exam grading shows the participant number.
- 2746853: RDM Excel bridge, service part: assessment items gain materi and KKTP and unique names per class and subject; a teacher fills RDM's sumatif and SAS templates from assessment scores, downloads an RDM-layout workbook for any subject and imports it back with a preview; RDM settings choose which assessment types go to sumatif and SAS; enrollment summaries carry NISN; new permissions `assessment-items.rdm`, `assessment-settings.read` and `assessment-settings.update`.

## 0.3.0

### Minor Changes

- 6d04832: The exam service serves the print pack of an exam event (`GET /exam-events/:id/print-pack`, optional `roomId`) with each room's seated students, supervisors and technician, and the student service answers bulk participant-number lookups (`POST /students/participant-numbers/lookup`).

## 0.2.0

### Minor Changes

- 474bda9: Carry the participant-number lookup and the admin issuance route in the generated client.
