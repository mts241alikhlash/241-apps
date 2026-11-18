---
'exam-service': minor
'exam-web': minor
'@mts241alikhlash/exam-api': minor
---

Every Berita Acara is reachable from one page: `GET /exam-rooms/reports` lists one row per supervisor slot the caller staffs, and exam-web adds `Berita Acara` to the sidebar next to the seat list. The document drops a schedule for a class with no seat in the room, shows the room code without its letter prefix and pads a seat number to two digits, and the print button returns to wherever it was opened from.
