# exam-service

## 0.8.4

### Patch Changes

- 491c7d8: The Jadwal Ujian page lists the subject timetable (grouped by day and slot, printable) even before packages are attached, and activities carry their subject and grade names.

## 0.8.3

### Patch Changes

- 5a3c657: A partly filled last room is numbered as a smaller room, so its desks run 1 to the last student and the last row sits on the girls side instead of leaving the highest numbers empty.

## 0.8.2

### Patch Changes

- d393fd3: Seat generation fills each gender side row by row from the front, so a partly filled room leaves its back desks empty instead of the last lane.

## 0.8.1

### Patch Changes

- fe8b88b: Seat generation fills each room to capacity before the next one, per gender side, so only the last room takes the remainder.

## 0.8.0

### Minor Changes

- f3309b4: Room reports and rosters read the exam timetable when no per-class schedule exists yet, supervisor slots can be created without a supervisor name, and `POST /exam-events/:id/supervisor-slots/generate` creates one empty slot per room per timetable window.
- f3309b4: An exam activity (jadwal mapel) can be created without a question package and given one later with `POST /exam-activities/:id/package`; scheduling or activating it still needs an approved package.
- 334de86: Desk numbers snake across the full row of eight lanes (1 to 8, then 16 to 9), girls fill the left lanes and boys the right, and same class or grade neighbours are avoided across the aisle too.

### Patch Changes

- f3309b4: Report schedule rows in the room report contract allow a missing schedule and package title and carry the activity and grade.

## 0.7.1

### Patch Changes

- 01473b3: Read the identity password reset answer as the plain array the response interceptor returns, so resetting event credentials no longer fails with 503.

## 0.7.0

### Minor Changes

- 6d04832: The signed student, supervisor and technician attendance sheets can be uploaded as scans (PDF, JPG or PNG, up to 10 MB): student sheets per room and supervisor slot, supervisor sheets per day, technician sheets per room and day. A new upload replaces the previous file of the same scope, and the files can be listed and downloaded.
- 6d04832: Exam events can reset the login passwords of their seated students in one action (`POST /exam-events/:id/credentials/reset`, optional `roomId`, requires `confirm: true`): identity-service gives each account a random readable password, stores only its hash, revokes its sessions and answers the new passwords once. The nest-core helper `randomReadablePassword()` provides the password.
- 6d04832: Participant numbers are issued and listed per semester from a standalone page under Ujian, Persiapan, Nomor Peserta (`POST /exam-participant-numbers/issue` and `POST /exam-participant-numbers/lookup`), no longer only from an activity. Desk numbers of the seat generator now snake within each block: odd rows run left to right and even rows right to left.
- 6d04832: School-wide exam rules live in the exam policy, set per exam type in Pengaturan, Preset: late-entry tolerance and minimum time before submit (both in minutes), shuffle questions, shuffle choices and allow web access through Safe Exam Browser. The late cutoff is now the start of the paper plus the tolerance instead of the start of the exam period, the minimum submit time shown to students matches the one enforced, and a policy without the new keys falls back to the defaults. The exam period form takes dates only.
- 6d04832: The exam service serves the print pack of an exam event (`GET /exam-events/:id/print-pack`, optional `roomId`) with each room's seated students, supervisors and technician, and the student service answers bulk participant-number lookups (`POST /students/participant-numbers/lookup`).
- 6d04832: Every Berita Acara is reachable from one page: `GET /exam-rooms/reports` lists one row per supervisor slot the caller staffs, and exam-web adds `Berita Acara` to the sidebar next to the seat list. The document drops a schedule for a class with no seat in the room, shows the room code without its letter prefix and pads a seat number to two digits, and the print button returns to wherever it was opened from.
- 6d04832: An exam period can generate its rooms and desk numbers in one action (`POST /exam-events/:id/seats/generate`, preview or apply, apply replaces the seats of the rooms in the plan only after confirmation). Girls take the left block and boys the right block of each room, desk numbers run block by block and row by row, and classrooms and grades are spread so that no neighbours share a grade or classroom where the numbers allow it. The Pembagian Kursi page replaces the automatic distribution with a Generate Kursi dialog with the rule choices, a grid preview and an apply step.
- 6d04832: Handing in a Berita Acara now means uploading the signed, scanned file (PDF, JPG or PNG, up to 10 MB, checked by its first bytes): one file per room report, required to submit, replaceable by a coordinator while the report is submitted and downloadable by whoever may view the report. The Berita Acara list submits per room, per subject or per day with a file for every room, three uploads at a time, and retries only the rooms that failed.
- 6d04832: Question import reads a vertical Word layout: sections per question type, A to E choices typed or automatic, Kunci, Abaikan harakat and Poin; the template download takes a layout and the question counts, and a count that differs from the school standard shows a warning in the preview without blocking the save.

### Patch Changes

- Updated dependencies [6d04832]
  - @mts241alikhlash/nest-core@0.2.0

## 0.6.0

### Minor Changes

- 79e0cbe: Question import uses one table template (version 2) for Word and Excel with the teacher's NIK, subject and grade in an identity table; a preview checks the file before saving and a save is all or nothing; exam-web shows the preview and the exam service can be previewed through POST /exam-imports/preview.

## 0.5.0

### Minor Changes

- a13680d: Safe Exam Browser configurations can be built in exam-web without SEB Config Tool: the server writes a plain .seb (gzip of plnd plus the gzipped plist) that opens the student exam list of the calling app, computes its Config Key with the SEB-JSON rules, stores it, and each configuration can be downloaded from the settings page.

## 0.4.1

### Patch Changes

- adbca23: An activity can only be created with an approved or locked package, the same rule a single schedule already had, and a session's raw score is rounded to two decimals so partial multiple-response thirds add up to whole numbers (23, not 23.0001).
- 718e942: Starting an exam again with the right token now clears the token re-entry a proctor reset set, so the student gets the questions instead of "Masukkan token ujian untuk melanjutkan".

## 0.4.0

### Minor Changes

- ed0a2aa: Rename exam types to DAILY, ASSIGNMENT, MIDTERM, FINAL and expose server-derived category on exam contracts.
- 774a670: Adds Safe Exam Browser configuration management and a public config file endpoint to the exam service, client, and web app.
- 8bccfde: Camera proctoring is removed: no snapshot or camera-blocked endpoints, no camera fields on sessions and the room monitor, and no `snapshotIntervalMs` in exam policies. Deploy it together with Istiqra 0.2.0: older APKs require snapshotIntervalMs and stop loading exams.

### Patch Changes

- 14caf5f: Removes the unused storage delete and renames the migration spec.
- d587566: Type the replacement answer key of an item key adjustment as a free-form object.
- d587566: Type the content of a question version as the union of the five question content shapes.
- 0b76217: Expose the parent schedule end on room monitor sessions as scheduleEndsAt.
- d587566: Type the room seat response with a required seat number.
- d587566: Type the event of an exam schedule request as nullable so it can be detached.
- d587566: Mark the minimum submit time optional in the exam schedule requests.
- d587566: Type the answer of a student exam session as the union of its four shapes.
- d587566: The room monitor response types the last session event as an object.
- 7110781: Lint runs one type-aware ESLint config; `lint:strict` and `eslint.typecheck.config.mjs` are gone.
- d587566: The activity response types its status and token mode as enums.
- Updated dependencies [7110781]
  - @mts241alikhlash/nest-core@0.1.2

## 0.3.0

### Minor Changes

- 474bda9: Menambah `GET /exam-activities` (kegiatan semester aktif) dan `PATCH /exam-activities/{id}` (`{ status }`) di exam-service; status yang berhenti dari `ACTIVE` menutup semua sesi yang masih berjalan lewat `CloseActivitySessionsUseCase` dengan id pengguna sebagai aktor.
  
  Pembuatan kegiatan kini memicu penerbitan nomor peserta semester tersebut secara best-effort melalui `POST /students/participant-numbers/issue` di student-service (provisioning token); kegagalan hanya dicatat dan tidak menggagalkan pembuatan kegiatan.
- 474bda9: Memproyeksikan kegiatan, event, ruang, nomor kursi, nomor peserta, dan siklus hidup ujian ke `GET /exams/me`: `activityId`, `activityStatus`, `eventId`, `eventName`, `lifecycle`, `roomName`, `seatNumber`, `participantNumber`, dan `makeup`. Ruang dan kursi hanya terisi saat ujian `OPEN`, dan jadwal susulan mewarisi kegiatan serta event dari jadwal induk.
  
  Menambah `GET /students/by-id/{studentId}/participant-number` di student-service agar exam-service bisa membaca nomor peserta dengan provisioning token, karena rute nomor peserta yang ada memakai token akun siswa.
- 474bda9: Menambah `POST /exam-activities/{id}/participant-numbers/issue` untuk menerbitkan ulang nomor peserta semester kegiatan secara best-effort, dan mengekspos `activityId` pada setiap jadwal agar baris jadwal bisa membuka layar status kegiatan.

### Patch Changes

- 474bda9: Memungkinkan guru dan pengawas melihat foto pengawas (galeri foto bukti kamera) pada sesi ujian atau tugas yang tidak memiliki ruangan melalui tombol Foto di halaman daftar sesi jadwal.

## 0.2.1

### Patch Changes

- e89c1f1: Memungkinkan guru dan pengawas melihat foto pengawas (galeri foto bukti kamera) pada sesi ujian atau tugas yang tidak memiliki ruangan melalui tombol Foto di halaman daftar sesi jadwal.

## 0.2.0

### Minor Changes

- 06861f5: Satu kegiatan kini menjadi induk jadwal per kelas: `exam_activities` membawa tingkat, mapel, paket, jendela, durasi, jenis token, dan kebijakan penegakan (JSON) yang disalin dari preset; jadwal per kelas dibuat otomatis lewat `POST /exam-activities`. Preset kebijakan (`UJIAN_KETAT`, `ULANGAN_KELAS`, `TUGAS`) diseed lewat migrasi, admin dapat mengubah kebijakan lewat `PATCH /exam-activities/:id/policy` (ditolak saat kegiatan ACTIVE) dan mengganti token lewat `POST /exam-activities/:id/token/rotate`. Setiap perubahan tercatat di `exam_activity_audit_logs`.

## 0.1.3

### Patch Changes

- 95c9a83: Give the exam time back when a phone call interrupts a sitting: the app reports the pause, the session deadline and finalize time shift by the paused minutes inside the existing 180 minute allowance, and the pause shows up in the session event history as CALL_SUSPENDED.
- 7d8fbab: Report the device readiness of a sitting — whether Do Not Disturb is granted, whether screen pinning is active, and whether battery optimization is off for the app — and warn on the room monitor when one of them is missing.

## 0.1.2

### Patch Changes

- be376d1: Accept a 1 MB proctoring snapshot instead of 50 KB, and key throttling by signed-in user so a room behind one address is not blocked.
- 552a5cf: Throttle by signed-in user instead of by address, so a room of tablets behind one NAT does not share a single bucket.

## 0.1.1

### Patch Changes

- ba5a860: Let the OpenAPI emit script run without a dev env file.
- ae2f596: Bound the monitor fallback window by the school day.
- Updated dependencies [a6602e2]
  - @mts241alikhlash/nest-core@0.1.1
