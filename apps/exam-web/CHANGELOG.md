# exam-web

## 0.2.0

### Minor Changes

- 474bda9: Menambahkan pemilih status kegiatan pada formulir kegiatan di exam-web. Memilih status mengirim `PATCH /exam-activities/{id}` dengan `{ status }`, dan status `ACTIVE` memberi peringatan bila sekarang di luar jendela kegiatan.

### Patch Changes

- 474bda9: Menambah `POST /exam-activities/{id}/participant-numbers/issue` untuk menerbitkan ulang nomor peserta semester kegiatan secara best-effort, dan mengekspos `activityId` pada setiap jadwal agar baris jadwal bisa membuka layar status kegiatan.
- 474bda9: Memungkinkan guru dan pengawas melihat foto pengawas (galeri foto bukti kamera) pada sesi ujian atau tugas yang tidak memiliki ruangan melalui tombol Foto di halaman daftar sesi jadwal.

## 0.1.4

### Patch Changes

- e89c1f1: Memungkinkan guru dan pengawas melihat foto pengawas (galeri foto bukti kamera) pada sesi ujian atau tugas yang tidak memiliki ruangan melalui tombol Foto di halaman daftar sesi jadwal.

## 0.1.3

### Patch Changes

- 06861f5: Satu kegiatan kini menjadi induk jadwal per kelas: `exam_activities` membawa tingkat, mapel, paket, jendela, durasi, jenis token, dan kebijakan penegakan (JSON) yang disalin dari preset; jadwal per kelas dibuat otomatis lewat `POST /exam-activities`. Preset kebijakan (`UJIAN_KETAT`, `ULANGAN_KELAS`, `TUGAS`) diseed lewat migrasi, admin dapat mengubah kebijakan lewat `PATCH /exam-activities/:id/policy` (ditolak saat kegiatan ACTIVE) dan mengganti token lewat `POST /exam-activities/:id/token/rotate`. Setiap perubahan tercatat di `exam_activity_audit_logs`.

## 0.1.2

### Patch Changes

- 7d8fbab: Report the device readiness of a sitting — whether Do Not Disturb is granted, whether screen pinning is active, and whether battery optimization is off for the app — and warn on the room monitor when one of them is missing.

## 0.1.1

### Patch Changes

- 63ffb1e: Serve build files under /_app so app routes under /assets work.
- Updated dependencies [8894dbd]
  - @mts241alikhlash/platform@0.1.1
