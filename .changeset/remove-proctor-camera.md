---
'exam-service': minor
'@mts241alikhlash/exam-api': minor
'exam-web': minor
---

Camera proctoring is removed: no snapshot or camera-blocked endpoints, no camera fields on sessions and the room monitor, and no `snapshotIntervalMs` in exam policies. Deploy it together with Istiqra 0.2.0: older APKs require snapshotIntervalMs and stop loading exams.
