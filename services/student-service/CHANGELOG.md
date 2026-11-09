# student-service

## 0.2.0

### Minor Changes

- 474bda9: Menambah `GET /exam-activities` (kegiatan semester aktif) dan `PATCH /exam-activities/{id}` (`{ status }`) di exam-service; status yang berhenti dari `ACTIVE` menutup semua sesi yang masih berjalan lewat `CloseActivitySessionsUseCase` dengan id pengguna sebagai aktor.
  
  Pembuatan kegiatan kini memicu penerbitan nomor peserta semester tersebut secara best-effort melalui `POST /students/participant-numbers/issue` di student-service (provisioning token); kegagalan hanya dicatat dan tidak menggagalkan pembuatan kegiatan.
- 474bda9: Memproyeksikan kegiatan, event, ruang, nomor kursi, nomor peserta, dan siklus hidup ujian ke `GET /exams/me`: `activityId`, `activityStatus`, `eventId`, `eventName`, `lifecycle`, `roomName`, `seatNumber`, `participantNumber`, dan `makeup`. Ruang dan kursi hanya terisi saat ujian `OPEN`, dan jadwal susulan mewarisi kegiatan serta event dari jadwal induk.
  
  Menambah `GET /students/by-id/{studentId}/participant-number` di student-service agar exam-service bisa membaca nomor peserta dengan provisioning token, karena rute nomor peserta yang ada memakai token akun siswa.
- 474bda9: Menerbitkan nomor peserta per semester dan tingkat pada tabel `student_participant_numbers` (format `241-YYT-GG-OOO`, idempoten, urut nama siswa) serta menambah `GET /students/{id}/participant-number` dan `GET /students/me/participant-number`.

## 0.1.1

### Patch Changes

- Updated dependencies [a6602e2]
  - @mts241alikhlash/nest-core@0.1.1
