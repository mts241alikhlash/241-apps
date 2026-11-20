---
'exam-service': minor
---

Room reports and rosters read the exam timetable when no per-class schedule exists yet, supervisor slots can be created without a supervisor name, and `POST /exam-events/:id/supervisor-slots/generate` creates one empty slot per room per timetable window.
