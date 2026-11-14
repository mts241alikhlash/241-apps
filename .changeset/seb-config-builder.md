---
'exam-service': minor
'exam-web': minor
'@mts241alikhlash/exam-api': minor
---

Safe Exam Browser configurations can be built in exam-web without SEB Config Tool: the server writes a plain .seb (gzip of plnd plus the gzipped plist) that opens the student exam list of the calling app, computes its Config Key with the SEB-JSON rules, stores it, and each configuration can be downloaded from the settings page.
