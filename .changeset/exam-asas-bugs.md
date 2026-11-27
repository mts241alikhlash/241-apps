---
'exam-service': patch
---

- A session in progress keeps saving answers, heartbeats, violations and its hand-in after the activity or schedule window ends, until its own `finalizeAt`; a closed activity and a session not in progress are refused as before.
- Allowing a late entry flags the student's current session in the room (in progress first, then the latest started) as well as the seat, and the late check accepts either the session or the seat flag.
