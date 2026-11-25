---
'assessment-service': patch
'identity-service': patch
'student-service': patch
'assessment-web': patch
'@mts241alikhlash/assessment-api': patch
'@mts241alikhlash/student-api': patch
'@mts241alikhlash/web-shared': patch
---

RDM Excel bridge, service part: assessment items gain materi and KKTP and unique names per class and subject; a teacher fills RDM's sumatif and SAS templates from assessment scores, downloads an RDM-layout workbook for any subject and imports it back with a preview; RDM settings choose which assessment types go to sumatif and SAS; enrollment summaries carry NISN; new permissions `assessment-items.rdm`, `assessment-settings.read` and `assessment-settings.update`.
