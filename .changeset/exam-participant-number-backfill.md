---
'exam-service': minor
'@mts241alikhlash/exam-api': minor
'exam-web': patch
---

Menambah `POST /exam-activities/{id}/participant-numbers/issue` untuk menerbitkan ulang nomor peserta semester kegiatan secara best-effort, dan mengekspos `activityId` pada setiap jadwal agar baris jadwal bisa membuka layar status kegiatan.
