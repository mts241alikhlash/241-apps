---
'exam-service': patch
---

A supervisor without another exam read permission sees the exam periods of their upcoming supervision slots in `GET /exam-events`, not only during an active slot, as the in-memory repository already did.
