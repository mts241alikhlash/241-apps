---
'exam-service': minor
'@mts241alikhlash/exam-api': minor
'student-service': minor
---

Memproyeksikan kegiatan, event, ruang, nomor kursi, nomor peserta, dan siklus hidup ujian ke `GET /exams/me`: `activityId`, `activityStatus`, `eventId`, `eventName`, `lifecycle`, `roomName`, `seatNumber`, `participantNumber`, dan `makeup`. Ruang dan kursi hanya terisi saat ujian `OPEN`, dan jadwal susulan mewarisi kegiatan serta event dari jadwal induk.

Menambah `GET /students/by-id/{studentId}/participant-number` di student-service agar exam-service bisa membaca nomor peserta dengan provisioning token, karena rute nomor peserta yang ada memakai token akun siswa.
