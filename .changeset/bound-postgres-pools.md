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

Bound each service's Postgres pool with DATABASE_POOL_MAX and DATABASE_POOL_TIMEOUT_MS (3 s for identity, student, academic and hr; 4 s otherwise) instead of queueing forever. A pool wait timeout now answers 503 with a retry message instead of 500.
