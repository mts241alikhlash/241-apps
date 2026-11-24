---
'identity-service': minor
'exam-service': minor
'exam-web': minor
---

Standardize Istiqra exam RBAC roles and permissions: add `EXAM_ADMIN`, retire `ASSESSMENT_ADMIN` into `ACADEMIC_ADMIN`, introduce `exam-grading.read-all`, `exam-rooms.read-all`, and `exam-settings.manage`, scope teacher schedules to non-exam activities, add read-only access for `PRINCIPAL`, tighten technician/supervisor room scoping, and provide `db:reconcile-exam-roles` for production role reconciliation.
