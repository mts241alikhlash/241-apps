# assessment-service

## 0.1.5

### Patch Changes

- 9d66ce9: Assessment UI refresh: the assessment item, grading, weight, attendance, rapor and dashboard views are reworked, with a weight list page, score notes and an academic period filter; assessment items filter by several teaching assignments and carry graded and student counts; enrollment summaries carry NISN and gender; exam grading shows the participant number.
- 2746853: RDM Excel bridge, service part: assessment items gain materi and KKTP and unique names per class and subject; a teacher fills RDM's sumatif and SAS templates from assessment scores, downloads an RDM-layout workbook for any subject and imports it back with a preview; RDM settings choose which assessment types go to sumatif and SAS; enrollment summaries carry NISN; new permissions `assessment-items.rdm`, `assessment-settings.read` and `assessment-settings.update`.

## 0.1.4

### Patch Changes

- be1132e: Add DataTable row-click support, exam score recap documents, exam-api updates, and skip throttling on internal controllers.

## 0.1.3

### Patch Changes

- Updated dependencies [6d04832]
  - @mts241alikhlash/nest-core@0.2.0

## 0.1.2

### Patch Changes

- 7110781: Lint runs one type-aware ESLint config; `lint:strict` and `eslint.typecheck.config.mjs` are gone.
- Updated dependencies [7110781]
  - @mts241alikhlash/nest-core@0.1.2

## 0.1.1

### Patch Changes

- b3dcff7: Add the school-wide dashboard endpoint.
- 3650159: Derive today, the weekday and the dashboard day in the school time zone.
- ba5a860: Let the OpenAPI emit script run without a dev env file.
- Updated dependencies [a6602e2]
  - @mts241alikhlash/nest-core@0.1.1
