---
'@mts241alikhlash/nest-core': minor
'identity-service': minor
'exam-service': minor
'@mts241alikhlash/identity-api': minor
'@mts241alikhlash/exam-api': minor
---

Exam events can reset the login passwords of their seated students in one action (`POST /exam-events/:id/credentials/reset`, optional `roomId`, requires `confirm: true`): identity-service gives each account a random readable password, stores only its hash, revokes its sessions and answers the new passwords once. The nest-core helper `randomReadablePassword()` provides the password.
