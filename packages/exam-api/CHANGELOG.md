# @mts241alikhlash/exam-api

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
