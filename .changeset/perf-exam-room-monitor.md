---
'exam-service': patch
'@mts241alikhlash/exam-api': patch
---

The room monitor and overview batch their lookups: one participant-number call per semester instead of one per seat, one package query, one staff-name lookup per page. New GET /exam-rooms/field-notes returns the field notes of every visible room in one call.
