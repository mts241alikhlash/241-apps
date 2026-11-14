# exam-web

## 0.3.1

### Patch Changes

- fa71065: DataTable shows every row when pagination is hidden instead of only the first ten, so the schedule session list, seat and supervisor panels and package question list are no longer cut off.
- Updated dependencies [fa71065]
  - @mts241alikhlash/ui@0.1.2
  - @mts241alikhlash/platform@0.1.3

## 0.3.0

### Minor Changes

- ed0a2aa: Rename exam types to DAILY, ASSIGNMENT, MIDTERM, FINAL and expose server-derived category on exam contracts.
- 774a670: Adds Safe Exam Browser configuration management and a public config file endpoint to the exam service, client, and web app.
- b816247: Reworked question bank and package screens, room roster printing (participant cards and seat lists for a whole exam period), a client column in the room monitor, and a collapsed sidebar whose menu groups open as a dropdown. Button icons are spaced by the button gap only.
- 8bccfde: Camera proctoring is removed: no snapshot or camera-blocked endpoints, no camera fields on sessions and the room monitor, and no `snapshotIntervalMs` in exam policies. Deploy it together with Istiqra 0.2.0: older APKs require snapshotIntervalMs and stop loading exams.

### Patch Changes

- d587566: Use the generated service clients for API calls.
- d587566: Load grades, staff users and the letterhead through the generated academic and identity clients.
- 7554d11: Stops defaulting the room monitor meta and derives the activity status from the response dto.
- 061bc87: Floating sidebar and top bar layout, card and table restyle, and exam-web views moved to the new layout.
- 7110781: Lint runs one type-aware ESLint config; `lint:strict` and `eslint.typecheck.config.mjs` are gone.
- Updated dependencies [b816247]
- Updated dependencies [061bc87]
- Updated dependencies [d587566]
- Updated dependencies [7110781]
- Updated dependencies [d587566]
  - @mts241alikhlash/ui@0.1.1
  - @mts241alikhlash/platform@0.1.2
  - @mts241alikhlash/web-shared@0.2.0

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
