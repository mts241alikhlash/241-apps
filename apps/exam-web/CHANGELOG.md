# exam-web

## 0.8.7

### Patch Changes

- b939cc2: Wait for the letterhead image before printing the stacked attendance sheets so the letterhead no longer goes missing, load the rosters a few at a time, and show a "preparing" notice while a day is being prepared for printing.

## 0.8.6

### Patch Changes

- 067f87b: The room monitoring time card counts down to the start of a slot that has not begun, and shows that the session ended once the slot is over, instead of counting down to the end from days away.

## 0.8.5

### Patch Changes

- 4fa9fa9: Print attendance sheets from the row action at every level (day, subject, room) on the student and staff attendance pages, and print the supervisor and technician names under the signature lines of the student attendance sheet.
- 599987c: Add the Pengawas Ujian role (supervise rooms and release sessions) and take both permissions away from the Guru role, so only people given the new role can supervise exam rooms. The supervisor schedule picker now lists holders of that role.
- 4bb8539: Rework the room monitoring page into separate cards (room, summary, token and time, actions needed, notes, participants) with every participant shown at once, split activity and battery into their own columns, list silent participants under actions needed, and add a searchable participant picker for physical violation notes. The exam card shows only the room number, and the command search field is no longer tinted.
- Updated dependencies [4bb8539]
  - @mts241alikhlash/ui@0.2.1
  - @mts241alikhlash/platform@0.2.2

## 0.8.4

### Patch Changes

- 20bdd06: Wait for Safe Exam Browser to attach its API before deciding the browser is not SEB, and recognise it by its user agent.

## 0.8.3

### Patch Changes

- 19eb069: Room reports print as separate pages with the letterhead and the subject names, and the attendance sheet fits one A4 page with the subject name aligned to the signature column.

## 0.8.2

### Patch Changes

- 491c7d8: The Jadwal Ujian page lists the subject timetable (grouped by day and slot, printable) even before packages are attached, and activities carry their subject and grade names.

## 0.8.1

### Patch Changes

- 5a3c657: A partly filled last room is numbered as a smaller room, so its desks run 1 to the last student and the last row sits on the girls side instead of leaving the highest numbers empty.

## 0.8.0

### Minor Changes

- 334de86: Desk numbers snake across the full row of eight lanes (1 to 8, then 16 to 9), girls fill the left lanes and boys the right, and same class or grade neighbours are avoided across the aisle too.
- f3309b4: Create an exam activity without a package and attach one later, create empty supervisor slots per room, and print room documents without supervisor names.

### Patch Changes

- f3309b4: List only students who have no seat in any room of the event under "Siswa belum berkursi", not just the selected room.

## 0.7.1

### Patch Changes

- 88a1dbe: Route `/exam-participant-numbers` through the gateway so the Nomor Peserta page can issue and list participant numbers.

## 0.7.0

### Minor Changes

- 6d04832: The signed student, supervisor and technician attendance sheets can be uploaded as scans (PDF, JPG or PNG, up to 10 MB): student sheets per room and supervisor slot, supervisor sheets per day, technician sheets per room and day. A new upload replaces the previous file of the same scope, and the files can be listed and downloaded.
- 6d04832: Participant numbers are issued and listed per semester from a standalone page under Ujian, Persiapan, Nomor Peserta (`POST /exam-participant-numbers/issue` and `POST /exam-participant-numbers/lookup`), no longer only from an activity. Desk numbers of the seat generator now snake within each block: odd rows run left to right and even rows right to left.
- 6d04832: School-wide exam rules live in the exam policy, set per exam type in Pengaturan, Preset: late-entry tolerance and minimum time before submit (both in minutes), shuffle questions, shuffle choices and allow web access through Safe Exam Browser. The late cutoff is now the start of the paper plus the tolerance instead of the start of the exam period, the minimum submit time shown to students matches the one enforced, and a policy without the new keys falls back to the defaults. The exam period form takes dates only.
- 6d04832: Exam web gains the print pages for the room documents on one data source: participant cards, desk numbers, exam schedule, student attendance and supervisor and technician attendance, at `/exam/print/<document>`. The markup is a plain base for the layouts to come.
- 6d04832: Every Berita Acara is reachable from one page: `GET /exam-rooms/reports` lists one row per supervisor slot the caller staffs, and exam-web adds `Berita Acara` to the sidebar next to the seat list. The document drops a schedule for a class with no seat in the room, shows the room code without its letter prefix and pads a seat number to two digits, and the print button returns to wherever it was opened from.
- 6d04832: An exam period can generate its rooms and desk numbers in one action (`POST /exam-events/:id/seats/generate`, preview or apply, apply replaces the seats of the rooms in the plan only after confirmation). Girls take the left block and boys the right block of each room, desk numbers run block by block and row by row, and classrooms and grades are spread so that no neighbours share a grade or classroom where the numbers allow it. The Pembagian Kursi page replaces the automatic distribution with a Generate Kursi dialog with the rule choices, a grid preview and an apply step.
- 6d04832: Handing in a Berita Acara now means uploading the signed, scanned file (PDF, JPG or PNG, up to 10 MB, checked by its first bytes): one file per room report, required to submit, replaceable by a coordinator while the report is submitted and downloadable by whoever may view the report. The Berita Acara list submits per room, per subject or per day with a file for every room, three uploads at a time, and retries only the rooms that failed.
- 6d04832: Question import reads a vertical Word layout: sections per question type, A to E choices typed or automatic, Kunci, Abaikan harakat and Poin; the template download takes a layout and the question counts, and a count that differs from the school standard shows a warning in the preview without blocking the save.

### Patch Changes

- 6d04832: The design system settles on Inter with the `nova` control sizes (20/24/32/36 px, 24/32/36/40 px on a phone) and one type scale. `text-xs` and `text-sm` both read `--text-control` (12 px, 13 px on phones) so sidebar, breadcrumb, table and control text share one size; headings read `--text-heading-sm|heading|title|display|display-lg` (16/18/20/24/30 px); a floating label sits at `--text-label` (11 px). Radius follows the `nova` scale from `--radius` so controls and dialogs sit at 8 px and cards at 10 px, a status colour is a token (`--success`, `--warning`, `--info`, `--destructive`) with no Tailwind palette class outside the admission landing page and the kiosk, `text-control` is a utility registered in `cn` so `twMerge` keeps it, the sidebar is 17rem, tabs are an underline strip only, a card header and footer are 48 px, and the active sidebar item and breadcrumb are marked by `text-primary` alone. Dead variants are gone: `Card variant="flat"`, `CardFooter` `standard`/`thin`, `FieldLegend` `variant`, and the pill `Tabs` variant. Pages no longer set a size of their own: no `text-[Npx]`, no `font-size`, no `font-mono`, no `font-bold`. A badge is plain coloured text with an optional icon instead of a chip, a card uses `CardHeader plain` for a list page's borderless header and `p-4` padding, table surfaces read `--table-stripe`/`--table-header` so a sticky column never shows the cells under it, and spacing uses one scale (0, 0.5, 1, 1.5, 2, 3, 4, 6) checked by `check-card-overrides`.
- Updated dependencies [6d04832]
- Updated dependencies [6d04832]
  - @mts241alikhlash/web-shared@0.2.1
  - @mts241alikhlash/ui@0.2.0
  - @mts241alikhlash/platform@0.2.1

## 0.6.0

### Minor Changes

- 79e0cbe: Question import uses one table template (version 2) for Word and Excel with the teacher's NIK, subject and grade in an identity table; a preview checks the file before saving and a save is all or nothing; exam-web shows the preview and the exam service can be previewed through POST /exam-imports/preview.

## 0.5.0

### Minor Changes

- 2c689bc: exam-web is presented as Istiqra: tab title, login, header, app switcher, exam sheet and favicon carry the Istiqra name and symbol, and the SSO launcher lists it as Istiqra. The auth config takes a logoSrc so an app can show its own logo while the school wordmark stays. Every app drops the leftover Vite favicon for the school logo.

### Patch Changes

- b96d6ad: Every web app declares a light colour scheme (meta tag and `color-scheme: light` on `:root`), so a phone in dark mode no longer darkens form controls and scrollbars; dark mode is left for a later phase. The admission landing drops its template comments.
- Updated dependencies [2c689bc]
- Updated dependencies [b96d6ad]
  - @mts241alikhlash/platform@0.2.0
  - @mts241alikhlash/ui@0.1.3

## 0.4.0

### Minor Changes

- a13680d: Safe Exam Browser configurations can be built in exam-web without SEB Config Tool: the server writes a plain .seb (gzip of plnd plus the gzipped plist) that opens the student exam list of the calling app, computes its Config Key with the SEB-JSON rules, stores it, and each configuration can be downloaded from the settings page.

## 0.3.2

### Patch Changes

- 0d58a39: The identity catalog now has `exam-schedules.manage`, which exam-service and exam-web already checked, so the Kegiatan menu and pages open for the roles that schedule exams. The admin-web school unit type menu checks `school-units.read`, the permission its endpoints use. Every web app opens in Indonesian whatever the browser language, as admission-web already did.

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
