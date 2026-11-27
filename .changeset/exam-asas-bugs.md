---
'exam-service': patch
---

- A session in progress keeps saving answers, heartbeats, violations and its hand-in after the activity or schedule window ends, until its own `finalizeAt`; a closed activity and a session not in progress are refused as before.
- Allowing a late entry flags the student's current session in the room (in progress first, then the latest started) as well as the seat, and the late check accepts either the session or the seat flag.
- An Excel question import is bounded before ExcelJS reads it: at most 8 worksheets, 1 MB per XML part and 8 MB of XML, well-formed XML only, and merged cells, column ranges, validations, conditional formats, links, drawings and defined names are removed, so a small crafted file can no longer exhaust the memory.
- A session released after the activity end can be started again on a new device until its own `finalizeAt`; call suspensions never move the deadline past the schedule end; a late entry without a running session is audited on the seat.
- The Excel guard counts every part that is not media, refuses misnamed sheet parts, caps cells, rows and elements, and keeps small merged ranges (within A to Z, 2,000 rows and 5,000 cells) so merged text still imports.
