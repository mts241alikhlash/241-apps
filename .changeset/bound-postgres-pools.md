---
'@mts241alikhlash/nest-core': patch
'academic-service': patch
'admission-service': patch
'assessment-service': patch
'exam-service': patch
'hr-service': patch
'identity-service': patch
'inventory-service': patch
'portal-service': patch
'presence-service': patch
'student-service': patch
---

Bound each service's Postgres pool with DATABASE_POOL_MAX and DATABASE_POOL_TIMEOUT_MS, failing a request after 4 s instead of queueing forever.
