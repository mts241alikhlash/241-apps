---
'exam-service': patch
---

- A session in progress keeps saving answers, heartbeats, violations and its hand-in after the activity or schedule window ends, until its own `finalizeAt`; a closed activity and a session not in progress are refused as before.
