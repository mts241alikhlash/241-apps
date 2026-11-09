# @mts241alikhlash/exam-api

## 0.3.0

### Minor Changes

- 474bda9: Menambah `GET /exam-activities` (kegiatan semester aktif) dan `PATCH /exam-activities/{id}` (`{ status }`) di exam-service; status yang berhenti dari `ACTIVE` menutup semua sesi yang masih berjalan lewat `CloseActivitySessionsUseCase` dengan id pengguna sebagai aktor.
  
  Pembuatan kegiatan kini memicu penerbitan nomor peserta semester tersebut secara best-effort melalui `POST /students/participant-numbers/issue` di student-service (provisioning token); kegagalan hanya dicatat dan tidak menggagalkan pembuatan kegiatan.
- 474bda9: Memproyeksikan kegiatan, event, ruang, nomor kursi, nomor peserta, dan siklus hidup ujian ke `GET /exams/me`: `activityId`, `activityStatus`, `eventId`, `eventName`, `lifecycle`, `roomName`, `seatNumber`, `participantNumber`, dan `makeup`. Ruang dan kursi hanya terisi saat ujian `OPEN`, dan jadwal susulan mewarisi kegiatan serta event dari jadwal induk.
  
  Menambah `GET /students/by-id/{studentId}/participant-number` di student-service agar exam-service bisa membaca nomor peserta dengan provisioning token, karena rute nomor peserta yang ada memakai token akun siswa.
- 474bda9: Menambah `POST /exam-activities/{id}/participant-numbers/issue` untuk menerbitkan ulang nomor peserta semester kegiatan secara best-effort, dan mengekspos `activityId` pada setiap jadwal agar baris jadwal bisa membuka layar status kegiatan.

## 0.2.0

### Minor Changes

- 06861f5: Satu kegiatan kini menjadi induk jadwal per kelas: `exam_activities` membawa tingkat, mapel, paket, jendela, durasi, jenis token, dan kebijakan penegakan (JSON) yang disalin dari preset; jadwal per kelas dibuat otomatis lewat `POST /exam-activities`. Preset kebijakan (`UJIAN_KETAT`, `ULANGAN_KELAS`, `TUGAS`) diseed lewat migrasi, admin dapat mengubah kebijakan lewat `PATCH /exam-activities/:id/policy` (ditolak saat kegiatan ACTIVE) dan mengganti token lewat `POST /exam-activities/:id/token/rotate`. Setiap perubahan tercatat di `exam_activity_audit_logs`.

## 0.1.2

### Patch Changes

- 95c9a83: Give the exam time back when a phone call interrupts a sitting: the app reports the pause, the session deadline and finalize time shift by the paused minutes inside the existing 180 minute allowance, and the pause shows up in the session event history as CALL_SUSPENDED.
- 7d8fbab: Report the device readiness of a sitting — whether Do Not Disturb is granted, whether screen pinning is active, and whether battery optimization is off for the app — and warn on the room monitor when one of them is missing.

## 0.1.1

### Patch Changes

- be376d1: Accept a 1 MB proctoring snapshot instead of 50 KB, and key throttling by signed-in user so a room behind one address is not blocked.
