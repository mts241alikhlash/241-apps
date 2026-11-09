# Ujian aktif, ruang siswa, dan berita acara — Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Siswa hanya bisa membuka pekerjaan ketika kegiatannya aktif, dan melihat ruangan, nomor peserta, serta nomor meja untuk kegiatan yang sedang berlangsung.

**Architecture:** Status dan jendela dievaluasi di server saat dibaca (`GET /me/exams` mengirim `lifecycle`), penjagaan di satu titik (`POST /me/exams/{id}/sessions` dan resume), ruang/kursi diproyeksikan dari `exam_room_seats`, dan penutupan kegiatan memfinalisasi sesi yang masih berjalan. Aplikasi Android hanya menampilkan hasil proyeksi.

**Tech Stack:** NestJS + Prisma (exam-service), OpenAPI contract + klien ter-generate, Vue (exam-web), Kotlin/Compose (241-android).

**Spec:** `docs/specs/2026-11-09-ujian-aktif-ruang-dan-berita-acara-design.md`

## Global Constraints

- Tanpa komentar di kode kecuali fungsi yang tidak terbaca dari kodenya.
- Setiap PR di `241-apps` wajib changeset, dan perubahan kontrak wajib `pnpm openapi:emit` lalu `pnpm api:generate`.
- Server adalah otoritas; aplikasi tidak menghitung sendiri boleh/tidaknya mulai.
- Tidak ada enum status baru, tidak ada kolom `participant_number`, tidak ada permission baru.
- `participantNumber` berasal dari registri student-service; ruang/kursi hanya dikirim saat `lifecycle = OPEN`.
- Penutupan lebih awal memakai `finalize(id, 'EXPIRED')` + audit `CLOSED_BY_ADMIN`.
- Android: minSdk 24, komentar hanya bila fungsional.

## Review Focus

- Siswa di luar jendela atau pada kegiatan non-aktif tetap bisa memulai sesi (gerbang bocor).
- Ruang/kursi bocor lewat `GET /me/exams` sebelum kegiatan aktif.
- Nomor peserta berubah di tengah semester saat registri diterbitkan ulang.
- Sesi yang sedang berjalan ikut terhapus/terkunci tanpa jawaban tersimpan ketika kegiatan ditutup.
- Jadwal `MAKEUP` tidak mendapat ruang/kegiatan sehingga siswa susulan tidak bisa masuk.
- Diskriminasi `lifecycle` pada batas jendela (tepat di `startsAt` dan `endsAt`).

---

### Task 1: Lifecycle policy

**Files:**

- Create: `services/exam-service/src/exam-session/domain/policies/exam-lifecycle.policy.ts`
- Test: `services/exam-service/src/exam-session/domain/policies/exam-lifecycle.policy.spec.ts`

**Interfaces:**

- Consumes: `ExamActivityStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED'`.
- Produces: `type ExamLifecycle = 'UPCOMING' | 'OPEN' | 'FINISHED'`, `examLifecycle(activityStatus: ExamActivityStatus, window: { startsAt: Date; endsAt: Date }, now: Date): ExamLifecycle`.

- [ ] **Step 1: Write the failing test**

```ts
it('opens only for an active activity inside its window', () => {
  const window = {
    startsAt: new Date('2026-11-09T02:00:00Z'),
    endsAt: new Date('2026-11-09T05:00:00Z'),
  }
  expect(
    examLifecycle('ACTIVE', window, new Date('2026-11-09T02:00:00Z')),
  ).toBe('OPEN')
  expect(
    examLifecycle('ACTIVE', window, new Date('2026-11-09T04:59:59Z')),
  ).toBe('OPEN')
  expect(
    examLifecycle('ACTIVE', window, new Date('2026-11-09T05:00:00Z')),
  ).toBe('FINISHED')
  expect(
    examLifecycle('ACTIVE', window, new Date('2026-11-09T01:59:59Z')),
  ).toBe('UPCOMING')
  expect(
    examLifecycle('SCHEDULED', window, new Date('2026-11-09T03:00:00Z')),
  ).toBe('FINISHED')
  expect(
    examLifecycle('CLOSED', window, new Date('2026-11-09T03:00:00Z')),
  ).toBe('FINISHED')
  expect(examLifecycle('DRAFT', window, new Date('2026-11-09T03:00:00Z'))).toBe(
    'FINISHED',
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter exam-service test -- exam-lifecycle`
Expected: FAIL, `examLifecycle is not a function`.

- [ ] **Step 3: Implement** `exam-lifecycle.policy.ts`: `ACTIVE` + `now < startsAt` → `UPCOMING`; `ACTIVE` + `now < endsAt` → `OPEN`; selain itu `FINISHED`.

- [ ] **Step 4: Run test to verify it passes** — `pnpm --filter exam-service test -- exam-lifecycle`, expected PASS.

- [ ] **Step 5: Commit** — `git add services/exam-service/src/exam-session/domain/policies/exam-lifecycle.*` lalu `git commit -m "feat(exam): derive the exam lifecycle from status and window"`.

---

### Task 2: Participant number registry in student-service

**Review:** per-task — data migration (registri nomor)

**Files:**

- Create: `services/student-service/prisma/migrations/*_student_participant_numbers/migration.sql` (lewat `pnpm --filter student-service prisma migrate dev --name student_participant_numbers`)
- Modify: `services/student-service/prisma/schema.prisma`
- Create: `services/student-service/src/student/application/use-cases/issue-participant-numbers/issue-participant-numbers.use-case.ts` (+ spec)
- Modify: `services/student-service/src/student/presentation/http/student.controller.ts`
- Test: `services/student-service/src/student/infrastructure/persistence/prisma/prisma-participant-number.repository.db.spec.ts`

**Interfaces:**

- Produces: tabel `student_participant_numbers`; `IssueParticipantNumbersUseCase.execute(semesterId: string): Promise<{ issued: number }>`; `GET /students/{id}/participant-number?semesterId=` → `{ number: string } | null`; `GET /students/me/participant-number` → `{ number: string } | null`.

- [ ] **Step 1: Write failing tests**: dua siswa satu semester/tingkat → `241-261-08-001`, `241-261-08-002` urut alfabet; menjalankan ulang tidak menambah nomor; siswa baru mendapat nomor berikutnya; tingkat lain mulai dari `001`.
- [ ] **Step 2: Run** `pnpm --filter student-service test -- participant-number` — expected FAIL.
- [ ] **Step 3: Implement** skema + migrasi + use case idempoten (transaksi, `SELECT ... FOR UPDATE` pada baris semester).
- [ ] **Step 4: Run** tes + `pnpm --filter student-service test` — expected PASS.
- [ ] **Step 5: Changeset** `'student-service': minor`; **Commit** — `git commit -m "feat(student): issue participant numbers per semester and grade"`.

---

### Task 3: Seat lookup for the student

**Review:** per-task — authorization (data milik siswa lain)

**Files:**

- Modify: `services/exam-service/src/exam-room/domain/repositories/exam-room.repository.ts`
- Modify: `services/exam-service/src/exam-room/infrastructure/persistence/prisma/prisma-exam-room.repository.ts`
- Test: `services/exam-service/src/exam-room/infrastructure/persistence/prisma/prisma-exam-room.db.spec.ts`

**Interfaces:**

- Produces: `findSeatForStudent(eventId: string, studentId: string): Promise<{ roomName: string; seatNumber: number } | null>` pada `IExamRoomRepository`.

- [ ] **Step 1: Write the failing db test** — buat event + room + seat untuk satu siswa, lalu `expect(await repo.findSeatForStudent(event.id, student.id)).toEqual({ roomName: 'R-1', seatNumber: 7 })`; siswa lain tanpa kursi → `null`.
- [ ] **Step 2: Run** `pnpm --filter exam-service test -- prisma-exam-room.db` — expected FAIL.
- [ ] **Step 3: Implement** query Prisma `examRoomSeat.findFirst({ where: { studentId, room: { eventId } }, include: { room: true } })` dan petakan ke bentuk di atas.
- [ ] **Step 4: Run** tes — expected PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(exam): look up a student's room and seat for an event"`.

---

### Task 4: Project activity, event, room and seat in `/me/exams`

**Review:** per-task — persisted format (kontrak OpenAPI)

**Files:**

- Modify: `services/exam-service/src/exam-session/application/use-cases/list-my-exams/list-my-exams.use-case.ts`
- Modify: `services/exam-service/src/exam-session/presentation/http/dto/student-exam-response.dto.ts`
- Modify: `services/exam-service/src/exam-session/application/use-cases/list-my-exams/list-my-exams.use-case.spec.ts`
- Modify: `contracts/exam/openapi.json`, `packages/exam-api/src/generated.ts` (generated)
- Create: `.changeset/exam-lifecycle-projection.md`

**Interfaces:**

- Consumes: `examLifecycle(...)` (Task 1), `findSeatForStudent(...)` (Task 3), participant number endpoint (Task 2).
- Produces: field baru `MyExam`: `activityId: string | null`, `activityStatus: ExamActivityStatus | null`, `eventId: string | null`, `eventName: string | null`, `lifecycle: ExamLifecycle`, `roomName: string | null`, `seatNumber: number | null`, `participantNumber: string | null`, `makeup: boolean`.

- [ ] **Step 1: Write failing tests** di `list-my-exams.use-case.spec.ts`:
  - kegiatan `ACTIVE` dalam jendela → `lifecycle: 'OPEN'`, `roomName: 'R-1'`, `seatNumber: 7`, `participantNumber: '241-261-08-001'`.
  - kegiatan `ACTIVE` sebelum jendela → `lifecycle: 'UPCOMING'` dan `roomName`/`seatNumber`/`participantNumber` `null`.
  - jadwal `MAKEUP` dengan `makeupOfId` → `makeup: true` dan mewarisi `activityId`/`eventId` jadwal induk.
- [ ] **Step 2: Run** `pnpm --filter exam-service test -- list-my-exams` — expected FAIL.
- [ ] **Step 3: Implement** proyeksi: ambil kegiatan/event dari jadwal (atau induk bila `MAKEUP`), hitung `lifecycle` dengan jendela kegiatan bila ada selain itu jendela jadwal, isi kursi hanya saat `OPEN`, `participantNumber` dari registri student-service (port + cache per permintaan).
- [ ] **Step 4: Run** tes — expected PASS.
- [ ] **Step 5: Regenerate kontrak dan klien**

Run: `pnpm openapi:emit && pnpm api:generate`
Expected: `contracts/exam/openapi.json` dan `packages/exam-api/src/generated.ts` memuat field baru; `pnpm openapi:check` lulus.

- [ ] **Step 6: Changeset** — `.changeset/exam-lifecycle-projection.md` dengan `'exam-service': minor` dan `'@mts241alikhlash/exam-api': minor`.

- [ ] **Step 7: Commit** — `git commit -m "feat(exam): project the activity, room and seat into my exams"`.

---

### Task 5: Gate starting and resuming on the lifecycle

**Review:** per-task — authorization

**Files:**

- Modify: `services/exam-service/src/exam-session/application/use-cases/start-exam-session/start-exam-session.use-case.ts`
- Modify: `services/exam-service/src/exam-session/application/session-access.service.ts`
- Test: `services/exam-service/src/exam-session/application/use-cases/start-exam-session/start-exam-session.use-case.spec.ts`

**Interfaces:**

- Consumes: `examLifecycle(...)` (Task 1), kegiatan dari jadwal.

- [ ] **Step 1: Write failing tests**: lifecycle `UPCOMING` → `ConflictException` dengan `code: 'WINDOW_CLOSED'`; `FINISHED` → sama; `OPEN` → sesi dibuat. Untuk resume (`session-access.service.ts`) perilaku sama.
- [ ] **Step 2: Run** `pnpm --filter exam-service test -- start-exam-session session-access` — expected FAIL.
- [ ] **Step 3: Implement** penjagaan sebelum kode akses divalidasi; pesan menyertakan nama ruangan dan nomor peserta bila ada.
- [ ] **Step 4: Run** tes — expected PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(exam): refuse sessions outside the active window"`.

---

### Task 6: Closing an activity finalises its running sessions

**Review:** per-task — destructive operation

**Files:**

- Create: `services/exam-service/src/exam-session/application/use-cases/close-activity-sessions/close-activity-sessions.use-case.ts` (+ spec)
- Modify: `services/exam-service/src/exam-session/exam-session.module.ts`
- Modify: `services/exam-service/src/exam-activity/presentation/http/exam-activity.controller.ts`

**Interfaces:**

- Consumes: `IExamSessionRepository`, `FinalizeSessionService`.
- Produces: `CloseActivitySessionsUseCase.execute(activityId: string, now?: Date): Promise<number>`.

- [ ] **Step 1: Write failing test**: dua sesi `IN_PROGRESS` pada kegiatan yang ditutup → keduanya final `EXPIRED`, jumlah 2; sesi `SUBMITTED` tidak disentuh.
- [ ] **Step 2: Run** tes — expected FAIL.
- [ ] **Step 3: Implement** ambil id sesi `IN_PROGRESS` per kegiatan (repository: `findInProgressIdsByActivity`), finalisasi `'EXPIRED'`, tulis audit `CLOSED_BY_ADMIN`.
- [ ] **Step 4: Run** tes — expected PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(exam): close running sessions when the activity stops"`.

---

### Task 7: Activity list and status endpoint

**Review:** per-task — authorization

**Files:**

- Modify: `services/exam-service/src/exam-activity/presentation/http/exam-activity.controller.ts`
- Create: `services/exam-service/src/exam-activity/application/use-cases/list-activities/list-activities.use-case.ts` (+ spec)
- Create: `services/exam-service/src/exam-activity/application/use-cases/update-activity-status/update-activity-status.use-case.ts` (+ spec)

**Interfaces:**

- Produces: `GET /exam-activities` → `ExamActivityDto[]`; `PATCH /exam-activities/{id}` body `{ status: ExamActivityStatus }` → `ExamActivityDto`. Status non-`ACTIVE` memanggil `CloseActivitySessionsUseCase`.

- [ ] **Step 1: Write failing tests**: list mengembalikan kegiatan semester aktif; PATCH ke `CLOSED` mengubah status dan memanggil penutupan sesi sekali.
- [ ] **Step 2: Run** `pnpm --filter exam-service test -- list-activities update-activity-status` — expected FAIL.
- [ ] **Step 3: Implement** dua use case + rute dengan permission yang sudah ada (`exam-activities.manage`), lalu `pnpm openapi:emit && pnpm api:generate`.
- [ ] **Step 4: Run** tes + `pnpm openapi:check` — expected PASS.
- [ ] **Step 5: Changeset** `'exam-service': minor`, `'@mts241alikhlash/exam-api': minor`; **Commit** — `git commit -m "feat(exam): list activities and change their status"`.

---

### Task 8: Admin status control in exam-web

**Files:**

- Modify: `apps/exam-web/src/features/exam-event/api/examEventApi.ts` (atau `exam-activity` bila ada)
- Modify: `apps/exam-web/src/features/exam-event/components/EventFormDialog.vue`
- Modify: `apps/exam-web/src/i18n/*` (label status)

- [ ] **Step 1: Write failing component test** — memilih status `ACTIVE` mengirim PATCH dengan `{ status: 'ACTIVE' }`.
- [ ] **Step 2: Run** `pnpm --filter exam-web test -- EventForm` — expected FAIL.
- [ ] **Step 3: Implement** pemilih status di dialog yang sudah ada, dengan peringatan bila `ACTIVE` di luar jendela.
- [ ] **Step 4: Run** tes — expected PASS.
- [ ] **Step 5: Changeset** `'exam-web': minor`; **Commit** — `git commit -m "feat(exam-web): set the activity status from the event form"`.

---

### Task 9: Android model, menus Ujian/Non-ujian

**Files:**

- Modify: `apps/exam-android/src/main/kotlin/id/sch/mts241alikhlash/exam/data/model/ExamModels.kt`
- Modify: `apps/exam-android/src/main/kotlin/id/sch/mts241alikhlash/exam/ui/screens/ExamListViewModel.kt`
- Modify: `apps/exam-android/src/main/kotlin/id/sch/mts241alikhlash/exam/ui/screens/HomeScreen.kt`
- Test: `apps/exam-android/src/test/kotlin/id/sch/mts241alikhlash/exam/ui/screens/ExamGroupingTest.kt`

**Interfaces:**

- Consumes: field baru `ExamSummaryDto` sesuai Task 3.
- Produces: `fun isExamWork(exam: ExamSummaryDto): Boolean` = `activityId != null || eventId != null || makeup`.

- [ ] **Step 1: Write failing test** — `isExamWork` benar untuk kegiatan/event/makeup, salah untuk tugas tanpa kegiatan; pengelompokan memisahkan kedua daftar.
- [ ] **Step 2: Run** `./gradlew :apps:exam-android:testProctorDebugUnitTest --tests '*ExamGrouping*'` — expected FAIL.
- [ ] **Step 3: Implement** field baru pada DTO, `isExamWork`, dua daftar, dan menu sidebar `Ujian` + `Non-ujian` (menggantikan satu menu daftar).
- [ ] **Step 4: Run** tes — expected PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(exam-android): split exam and non-exam work in the menu"`.

---

### Task 10: Android profile card for the active exam

**Files:**

- Modify: `apps/exam-android/src/main/kotlin/id/sch/mts241alikhlash/exam/ui/screens/ProfileScreen.kt`
- Modify: `apps/exam-android/src/main/kotlin/id/sch/mts241alikhlash/exam/ui/screens/HomeScreen.kt`
- Test: `apps/exam-android/src/test/kotlin/id/sch/mts241alikhlash/exam/ui/screens/ProfileExamCardTest.kt`

**Interfaces:**

- Consumes: `lifecycle`, `roomName`, `seatNumber`, `participantNumber`, `eventName`.
- Produces: `fun profileExamRows(exam: ExamSummaryDto?): List<Pair<String, String>>` — kosong bila `exam == null` atau `lifecycle != "OPEN"`.

- [ ] **Step 1: Write failing test** — `lifecycle = "OPEN"` menghasilkan baris Ruangan/No. peserta/No. meja; `"FINISHED"` menghasilkan daftar kosong; `roomName == null` menampilkan "Belum ditetapkan".
- [ ] **Step 2: Run** `./gradlew :apps:exam-android:testProctorDebugUnitTest --tests '*ProfileExamCard*'` — expected FAIL.
- [ ] **Step 3: Implement** `profileExamRows` dan kartu "Ujian aktif" di Profil yang hanya muncul saat `OPEN`.
- [ ] **Step 4: Run** tes — expected PASS.
- [ ] **Step 5: Build & pasang ke perangkat uji** — `./gradlew :apps:exam-android:assembleProctorDebug -PAPI_BASE_URL=https://exam.mts241alikhlash.sch.id/`, lalu unpin + force-stop dulu sebelum `adb install -r`.
- [ ] **Step 6: Commit** — `git commit -m "feat(exam-android): show the active exam room and seat in the profile"`.
