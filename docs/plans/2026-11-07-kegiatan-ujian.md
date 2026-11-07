# Kegiatan ujian & tugas — Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu baris "kegiatan" menjadi induk jadwal per kelas, dengan kebijakan (token, gap, ambang pelanggaran) tersimpan dan dapat diatur admin lewat preset.

**Architecture:** Tabel `exam_activities` + `exam_policy_presets` baru; `exam_schedules.activity_id` dibuat otomatis per kelas terpilih. Kebijakan efektif disalin ke kegiatan (JSONB), dibekukan saat ACTIVE, dan dikirim ke klien saat sesi dimulai. Deteksi gap dihitung server dari `last_seen_at`.

**Tech Stack:** NestJS + Prisma (exam-service), Vitest, SvelteKit/Vue web (exam-web), Kotlin/Compose (241-android), OpenAPI + klien tergenerate.

**Spec:** `docs/specs/2026-11-07-kegiatan-ujian-design.md`

## Global Constraints

- `241-apps`: tanpa komentar di kode; changeset wajib (`exam-service` + `@mts241alikhlash/exam-api` + `exam-web` patch); kontrak & klien wajib current (`pnpm openapi:emit && pnpm api:generate && pnpm openapi:check && pnpm api:check`).
- Migrasi Prisma baru di `services/exam-service/prisma/migrations/`.
- Mesin sesi/ruang/kursi tidak diubah; jadwal lama tanpa `activity_id` tetap berjalan.
- Kebijakan default: batas pelanggaran 3; ambang fokus 10 s; jeda snapshot 15 s (30 s tugas); jeda heartbeat 15 s; gap dicatat 60 s (5 mnt tugas); gap wajib token 5 mnt (30 mnt tugas); dihitung pelanggaran ke-2 (ke-3 tugas); slot token 600 s; token ruang tidak dipakai untuk masuk.
- Guru hanya boleh mengubah durasi, jendela, kelas, jenis token; angka penegakan milik admin.

## Review Focus

- Jadwal lama tanpa kegiatan tidak boleh berubah perilaku (masih bisa dimulai, token lama tetap sah sampai jendelanya habis).
- Token statis tidak boleh berlaku untuk kegiatan lain (cakupan harus `activity.id`).
- Gap deteksi tidak boleh mengunci siswa hanya karena HP tidur (butuh token saja, bukan auto-submit).
- Mengubah preset tidak boleh mengubah kegiatan yang sudah ACTIVE.
- Kebijakan yang hilang/rusak di payload harus membuat aplikasi memakai cadangan aman, bukan berhenti.

---

### Task 1: Model kegiatan, preset, dan tautan jadwal

**Review:** per-task — data migration

**Files:**

- Create: `services/exam-service/prisma/exam-activity.prisma`
- Modify: `services/exam-service/prisma/exam-session.prisma` (model jadwal: `activityId String? @db.Uuid` + relasi + `@@index([activityId])`)
- Create: `services/exam-service/prisma/migrations/<ts>_add_exam_activity/migration.sql`
- Test: `services/exam-service/src/exam-activity/infrastructure/prisma-exam-activity.db.spec.ts`

**Interfaces:**

- Produces: model `ExamActivity` (`id`, `semesterId`, `eventId?`, `gradeId`, `subjectId`, `packageId`, `type`, `tokenMode`, `presetId?`, `policy Json`, `startsAt`, `endsAt`, `durationMinutes`, `status`, `createdById`) dan model `ExamPolicyPreset` (`id`, `name`, `policy Json`, `isDefault`).

- [ ] **Step 1: Tulis test DB yang gagal** — membuat kegiatan + dua jadwal anak, lalu membaca kembali kegiatan beserta jumlah jadwalnya.
- [ ] **Step 2: Jalankan** `pnpm --filter exam-service exec vitest run src/exam-activity/infrastructure/prisma-exam-activity.db.spec.ts` — harapan: gagal (model belum ada).
- [ ] **Step 3: Tulis model + migrasi** pada dua file prisma di atas, `prisma migrate dev --name add_exam_activity` di `services/exam-service`.
- [ ] **Step 4: Jalankan test lagi** — harapan: PASS.
- [ ] **Step 5: Commit** — `feat(exam): add exam activities and policy presets`.

### Task 2: Skema kebijakan, preset bawaan, dan pagar nilai

**Review:** per-task — data migration

**Files:**

- Create: `services/exam-service/src/exam-activity/domain/policies/exam-policy.policy.ts`
- Create: `services/exam-service/src/exam-activity/domain/policies/exam-policy.policy.spec.ts`
- Create: `services/exam-service/prisma/seed-presets.ts` (dipanggil migrasi/seed)

**Interfaces:**

- Produces: `type ExamPolicy` (field: `violationLimit`, `focusThresholdMs`, `snapshotIntervalMs`, `heartbeatIntervalMs`, `gapRecordedMs`, `gapTokenMs`, `gapViolationFrom`, `tokenSlotSeconds`), `DEFAULT_POLICIES: Record<'UJIAN_KETAT'|'ULANGAN_KELAS'|'TUGAS', ExamPolicy>`, `parsePolicy(value: unknown): ExamPolicy` (melempar bila di luar batas).

- [ ] **Step 1: Tulis test** untuk tiga kasus: nilai sah dipakai apa adanya; nilai di luar pagar (mis. `violationLimit: 0`, `gapTokenMs: 10`) ditolak; field hilang diisi default.
- [ ] **Step 2: Jalankan test** — harapan: gagal.
- [ ] **Step 3: Implementasikan `DEFAULT_POLICIES` + `parsePolicy`** dengan pagar sesuai Global Constraints.
- [ ] **Step 4: Jalankan test** — harapan: PASS.
- [ ] **Step 5: Commit** — `feat(exam): validate activity policies and seed presets`.

### Task 3: API kegiatan (buat, ubah, daftar) + jadwal anak otomatis

**Files:**

- Create: `services/exam-service/src/exam-activity/application/use-cases/create-activity/create-activity.use-case.ts`
- Create: `services/exam-service/src/exam-activity/application/use-cases/update-activity-policy/update-activity-policy.use-case.ts`
- Create: `services/exam-service/src/exam-activity/presentation/http/exam-activity.controller.ts` (+ dto)
- Create: `services/exam-service/src/exam-activity/exam-activity.module.ts`
- Test: `.../create-activity.use-case.spec.ts`, `.../update-activity-policy.use-case.spec.ts`
- Modify: `services/exam-service/src/app.module.ts` (daftar modul)

**Interfaces:**

- Consumes: `parsePolicy`, model dari Task 1/2.
- Produces: `POST /exam-activities` body `{ gradeId, subjectId, packageId, type, eventId?, classroomIds: string[], presetId, tokenMode, startsAt, endsAt, durationMinutes, policyOverrides? }` → `ExamActivityDto`; `PATCH /exam-activities/:id/policy` (admin) → `ExamActivityDto`. Pada `POST`, guru hanya boleh mengirim `overrides` untuk `durationMinutes`, `endsAt`, `classroomIds`, `tokenMode`.

**Catatan:** jadwal anak dibuat satu per `classroomIds` dengan `startsAt/endsAt/duration/type/tokenRotation` sama; `activity_id` diisi.

- [ ] **Step 1: Tulis test** — membuat kegiatan dengan dua kelas menghasilkan dua jadwal anak; guru mengirim `policyOverrides.violationLimit` ditolak 403; `PATCH` policy menolak bila `status = ACTIVE`.
- [ ] **Step 2: Jalankan test** — harapan: gagal.
- [ ] **Step 3: Implementasikan use case + controller** sesuai Interfaces.
- [ ] **Step 4: Jalankan test** — harapan: PASS; lalu `pnpm openapi:emit && pnpm api:generate`.
- [ ] **Step 5: Catat audit setiap perubahan kegiatan** — baris `exam_activity_audit_logs` (`activity_id`, `actor_id`, `action`, `before`, `after`, `at`), ditulis pada `POST` dan `PATCH`; tambahkan tabelnya di migrasi Task 1 bila belum ada.
- [ ] **Step 6: Commit** — `feat(exam): create activities with their classroom schedules`.

### Task 4: Kebijakan token per kegiatan

**Files:**

- Modify: `services/exam-service/src/exam-schedule/domain/policies/derive-access-code.policy.ts` (cakupan kode dari kegiatan bila ada)
- Modify: `services/exam-service/src/exam-session/application/use-cases/start-exam-session/start-exam-session.use-case.ts:96-112` (verifikasi memakai cakupan kegiatan; token ruang tidak diterima sebagai pintu masuk)
- Modify: `services/exam-service/src/exam-session/application/use-cases/resume-exam-session/resume-exam-session.use-case.ts:120-135`
- Test: `.../start-exam-session/start-exam-session.use-case.spec.ts` (+ kasus baru)

**Interfaces:**

- Consumes: `activity.tokenMode`, `activity.id`.
- Produces: `codeScope(schedule): string` = `activity:<id>` bila kegiatan ada, selain itu `schedule:<id>`; `verifyEntryCode(...)` menerima kode kegiatan; `ROTATING` memakai slot sekarang + toleransi 1 slot, `STATIC` memakai rotation `0` dan berlaku sepanjang jendela; `POST /exam-activities/:id/token/rotate` menaikkan `token_rotation` kegiatan sehingga kode lama (termasuk STATIC) langsung tidak sah.

- [ ] **Step 1: Tulis test** — (a) kegiatan `ROTATING` menerima kode slot sekarang dan menolak slot 2 lampau; (b) kegiatan `STATIC` menerima kode yang sama 30 menit kemudian; (c) kode kegiatan A menolak sesi kegiatan B; (d) token ruang tidak lagi memulai sesi; (e) setelah rotate, kode STATIC sebelumnya ditolak dan kode baru diterima.
- [ ] **Step 2: Jalankan test** — harapan: gagal.
- [ ] **Step 3: Implementasikan `codeScope` + pemakaiannya di start/resume.**
- [ ] **Step 4: Jalankan test** — harapan: PASS.
- [ ] **Step 5: Commit** — `feat(exam): scope the access code to the activity`.

### Task 5: Deteksi gap kehadiran di server

**Review:** per-task — concurrency

**Files:**

- Create: `services/exam-service/src/exam-session/application/use-cases/check-absence-gap/check-absence-gap.use-case.ts`
- Create: `.../check-absence-gap.use-case.spec.ts`
- Modify: `services/exam-service/prisma/exam-session.prisma` (enum `SessionEventType` + `ABSENCE_GAP`)
- Modify: heartbeat use case: panggil pemeriksa gap saat menyimpan `lastSeenAt`

**Interfaces:**

- Consumes: `policy.gapRecordedMs`, `policy.gapTokenMs`, `policy.gapViolationFrom`.
- Produces: `checkAbsenceGap(input: { session: ExamSession; now: Date }): Promise<void>` — mencatat event `ABSENCE_GAP` (`detail` = durasi detik) bila `now - lastSeenAt >= gapRecordedMs`; menyetel `requiresTokenReentry = true` bila `>= gapTokenMs`; menambah `violationCount` hanya bila jumlah event `ABSENCE_GAP` pada sesi `>= gapViolationFrom`.

- [ ] **Step 1: Tulis test** — gap 30 s tidak mencatat apa pun; gap 90 s mencatat event tanpa pelanggaran; gap 6 mnt membuat `requiresTokenReentry`; dua kali gap 6 mnt menghasilkan `violationCount = 1`.
- [ ] **Step 2: Jalankan test** — harapan: gagal.
- [ ] **Step 3: Implementasikan use case + migrasi enum.**
- [ ] **Step 4: Jalankan test** — harapan: PASS.
- [ ] **Step 5: Commit** — `feat(exam): record absence gaps and gate re-entry on them`.

### Task 6: Kebijakan efektif sampai ke aplikasi

**Files:**

- Modify: `services/exam-service/src/exam-session/presentation/http/dto/start-session.dto.ts` (dan DTO resume) — field `policy`
- Modify: `.../start-exam-session.use-case.ts` — kembalikan `policy`
- Modify: `241-android` `data/model/ExamModels.kt` + `data/repository/ExamRepository.kt` + `kiosk/ViolationPolicy.kt` + `SessionEventTracker.kt` + `proctor/SnapshotScheduler.kt` + `ExamViewModel.kt`
- Test: `241-android` `kiosk/ExamPolicyTest.kt`, `data/model/ExamDtoJsonTest.kt`

**Interfaces:**

- Consumes: `policy` dari respons start/resume.
- Produces: `data class ExamPolicy(val violationLimit: Int = 3, val focusThresholdMs: Long = 10_000, val snapshotIntervalMs: Long = 15_000, val heartbeatIntervalMs: Long = 15_000)` di app; `ViolationPolicy.exceeded(policy, count)`.

- [ ] **Step 1: Tulis test** — JSON `policy` ter-parse benar; tanpa `policy` memakai cadangan (3 / 10 s / 15 s / 15 s); `ViolationPolicy.exceeded` memakai batas dari objek.
- [ ] **Step 2: Jalankan test** — harapan: gagal.
- [ ] **Step 3: Implementasikan** DTO + app model + pemakaian di tracker/scheduler/loop.
- [ ] **Step 4: Jalankan test** — harapan: PASS (`./gradlew --no-daemon spotlessCheck :apps:exam-android:testStandardDebugUnitTest --tests '*ExamPolicyTest' --tests '*ExamDtoJsonTest'`).
- [ ] **Step 5: Commit** (dua repo) — `feat: deliver the activity policy to the client`.

### Task 7: UI web — pemilih kelas, preset, halaman lanjutan

**Files:**

- Create: `apps/exam-web/src/features/exam-activity/components/ActivityForm.vue` (+ `.spec.ts`)
- Create: `apps/exam-web/src/features/exam-activity/services/examActivityService.ts`
- Create: `apps/exam-web/src/features/exam-activity/types/index.ts`
- Modify: rute menu ujian (tautan ke form kegiatan)

**Interfaces:**

- Consumes: `POST /exam-activities`, `PATCH /exam-activities/:id/policy`, `GET /exam-policy-presets`.
- Produces: form dengan urutan tingkat → centang kelas → paket/mapel → preset → durasi/jendela/jenis token; tombol "Lanjutan" hanya tampil untuk admin.

- [ ] **Step 1: Tulis test** — memilih tingkat 7 memunculkan hanya kelas 7; menyimpan mengirim `classroomIds` terpilih; pengguna non-admin tidak melihat tombol Lanjutan.
- [ ] **Step 2: Jalankan** `pnpm --filter exam-web exec vitest run src/features/exam-activity` — harapan: gagal.
- [ ] **Step 3: Implementasikan komponen + service.**
- [ ] **Step 4: Jalankan test** — harapan: PASS.
- [ ] **Step 5: Commit** — `feat(exam-web): create activities for a grade and its classes`.

### Task 8: Bispro + tampilan monitor

**Files:**

- Create: `docs/exam/bispro-kegiatan.md`
- Modify: `apps/exam-web/src/features/exam-room/components/roomParticipantColumns.ts` (label preset + `ABSENCE_GAP`)
- Modify: `apps/exam-web/src/features/exam-room/types/index.ts` (label event baru)
- Test: `.../roomParticipantColumns.spec.ts`

**Interfaces:**

- Consumes: nama preset + event `ABSENCE_GAP` dari API monitor.

- [ ] **Step 1: Tulis test** — baris peserta menampilkan nama preset; label `ABSENCE_GAP` diterjemahkan ("Hilang N detik").
- [ ] **Step 2: Jalankan test** — harapan: gagal.
- [ ] **Step 3: Implementasikan label + tulis `docs/exam/bispro-kegiatan.md`** berisi: tabel aktivitas → preset → token → jendela, dan siapa boleh mengubah apa.
- [ ] **Step 4: Jalankan test** — harapan: PASS.
- [ ] **Step 5: Commit** — `docs+feat(exam-web): activity playbook and monitor labels`.

---

## Verifikasi akhir (setelah semua task)

- [ ] `pnpm --filter exam-service run validate`
- [ ] `pnpm openapi:emit && pnpm api:generate && pnpm openapi:check && pnpm api:check`
- [ ] `node .github/scripts/require-changeset.mjs $(git merge-base origin/main HEAD) HEAD`
- [ ] `241-android`: `./gradlew --no-daemon spotlessCheck check`
- [ ] Uji manual di VPS: buat kegiatan TUGAS untuk satu kelas, mulai dengan token statis 30 menit kemudian, matikan aplikasi 6 menit, pastikan token diminta dan event `ABSENCE_GAP` tercatat.
