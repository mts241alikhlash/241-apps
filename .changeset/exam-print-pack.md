---
'exam-service': minor
'student-service': minor
'@mts241alikhlash/exam-api': minor
'@mts241alikhlash/student-api': minor
---

The exam service serves the print pack of an exam event (`GET /exam-events/:id/print-pack`, optional `roomId`) with each room's seated students, supervisors and technician, and the student service answers bulk participant-number lookups (`POST /students/participant-numbers/lookup`).
