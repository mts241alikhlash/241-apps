# student-service

## 0.3.2

### Patch Changes

- 9d66ce9: Assessment UI refresh: the assessment item, grading, weight, attendance, rapor and dashboard views are reworked, with a weight list page, score notes and an academic period filter; assessment items filter by several teaching assignments and carry graded and student counts; enrollment summaries carry NISN and gender; exam grading shows the participant number.
- 2746853: RDM Excel bridge, service part: assessment items gain materi and KKTP and unique names per class and subject; a teacher fills RDM's sumatif and SAS templates from assessment scores, downloads an RDM-layout workbook for any subject and imports it back with a preview; RDM settings choose which assessment types go to sumatif and SAS; enrollment summaries carry NISN; new permissions `assessment-items.rdm`, `assessment-settings.read` and `assessment-settings.update`.

## 0.3.1

### Patch Changes

- be1132e: Add DataTable row-click support, exam score recap documents, exam-api updates, and skip throttling on internal controllers.

## 0.3.0

### Minor Changes

- 6d04832: The exam service serves the print pack of an exam event (`GET /exam-events/:id/print-pack`, optional `roomId`) with each room's seated students, supervisors and technician, and the student service answers bulk participant-number lookups (`POST /students/participant-numbers/lookup`).

### Patch Changes

- Updated dependencies [6d04832]
  - @mts241alikhlash/nest-core@0.2.0

## 0.2.1

### Patch Changes

- 7110781: Lint runs one type-aware ESLint config; `lint:strict` and `eslint.typecheck.config.mjs` are gone.
- Updated dependencies [7110781]
  - @mts241alikhlash/nest-core@0.1.2

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
