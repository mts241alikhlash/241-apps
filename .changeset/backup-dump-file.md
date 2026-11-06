---
'infra': patch
---

Let the backup shell create each dump file, since pg_dump runs as postgres and the backup tree is root-only.
