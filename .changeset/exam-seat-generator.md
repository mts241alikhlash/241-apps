---
'exam-service': minor
'@mts241alikhlash/exam-api': minor
'exam-web': minor
---

An exam period can generate its rooms and desk numbers in one action (`POST /exam-events/:id/seats/generate`, preview or apply, apply replaces the seats of the rooms in the plan only after confirmation). Girls take the left block and boys the right block of each room, desk numbers run block by block and row by row, and classrooms and grades are spread so that no neighbours share a grade or classroom where the numbers allow it. The Pembagian Kursi page replaces the automatic distribution with a Generate Kursi dialog with the rule choices, a grid preview and an apply step.
