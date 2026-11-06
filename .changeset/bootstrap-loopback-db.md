---
'infra': patch
---

Connect bootstrap.sh to PostgreSQL over the loopback of the deploy host, since DATABASE_URL carries the address the containers use.
