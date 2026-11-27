# Offline exams

An exam activity can be taken on the Istiqra app (Online) or outside it, on paper or as a practical (Offline). This guide is for staff who set up the exam period and for teachers who record offline scores. It also lists what the release and the operator must do. The design is in the approved spec; the terms are in the [glossary](../../GLOSSARY.md).

## 1. The model

- An activity has a **delivery mode**, `Online` or `Offline`. It is chosen at creation and cannot be changed afterwards.
- An Offline activity is either `Written` or `Practical`, never both. It has no question package, ever, and one score per student with a maximum (`Max score`, 1 to 1000, default 100).
- The timetable, the package and the scores are independent. Per-classroom schedules exist without a package, and an Online package can be attached later.
- Online activities can be created with or without a package.

What students see and who can start (the lifecycle comes from `scheduleLifecycle` and `assertOpenable` in exam-service; a student only sees activities that are not `DRAFT`):

| Mode    | Package       | Activity status         | Students see it                                      | Student can start              |
| ------- | ------------- | ----------------------- | ---------------------------------------------------- | ------------------------------ |
| Online  | none or ready | `DRAFT`                 | no                                                   | no                             |
| Online  | none or ready | `SCHEDULED`             | yes, upcoming until the end of the window            | no                             |
| Online  | none          | `ACTIVE`                | yes, upcoming until the end of the window            | no, `PACKAGE_MISSING`          |
| Online  | ready         | `ACTIVE`                | yes, upcoming, then open inside the window           | yes, inside the window only    |
| Offline | never         | `SCHEDULED` or `ACTIVE` | yes, with the Offline marker, upcoming then finished | never, `OFFLINE_NOT_STARTABLE` |
| any     | any           | `CLOSED`                | yes, finished                                        | no                             |

- An Online activity cannot be set to `ACTIVE` without an approved or locked package ("Pasang paket soal dulu"). `SCHEDULED` needs no package.
- An Offline schedule is shown as upcoming only before the activity starts; from the start of the window it is finished, because nothing is ever opened.
- A makeup (susulan) ignores the status of the original activity: it is open by its own window and its own schedule. Closing an activity does not touch the sessions of its makeups.

## 2. Setting up

1. Open Kegiatan and create an activity. Fields that matter: `Delivery` (Online or Offline), `Type` and `Max score` (Offline only), the classrooms (`Kelas yang ikut`), and `Paket soal` (Online only, optional). Offline has no package field.
2. Classrooms can be added or changed later with `Tetapkan kelas` on the activity detail page. It creates the per-classroom schedules for any activity, with or without a package, until the activity is `CLOSED`.
3. `Bagikan jadwal` (detail page and list action, activity in `DRAFT`) moves the activity to `SCHEDULED`. Students now see the timetable. Nothing opens by this step.
4. For Online, attach the package later with `Pasang paket`. It sets the package on the existing schedules and creates schedules only for classrooms that have none. Offline activities refuse a package (`OFFLINE_NO_PACKAGE`).
5. `Berlangsung` (`ACTIVE`) means the exam is open for students inside the window. `Terjadwal` (`SCHEDULED`) means the timetable is published and nothing is open. The status can be moved by hand or by the automatic job below.

On the Android app an Offline exam appears with an "Offline" marker and shows "Belum dibuka", then "Selesai". It is never selectable.

## 3. Automatic status

A job runs every minute and moves activities by itself. Per activity:

- It opens an Online `SCHEDULED` activity that has an approved or locked package `autoOpenLeadMinutes` (default 5) before the start. Without a ready package it does not open, and the activity is logged as blocked (a warning in the service log when the set of blocked activities changes).
- It closes an `ACTIVE` activity at `endsAt + autoCloseGraceMinutes` (default 15). An Online activity is not closed while a session of a regular schedule is still `IN_PROGRESS`; it closes on a later run once none is running. Makeup sessions do not hold it open.
- It closes a `SCHEDULED` activity of either mode that never opened once `endsAt + autoCloseGraceMinutes` has passed. Offline activities close after the grace, with no session check.
- The `Auto status` switch (activity form and detail page) turns the job off for one activity. Needs `exam-schedules.manage`.
- Every automatic change is audited with the system actor (`AUTO_OPEN` or `AUTO_CLOSE`).

The two timings live in the activity policy next to `lateToleranceMinutes` (bounds 0 to 60 and 0 to 240 minutes). The detail page shows the effective values; changing them needs `exam-schedules.manage-all` (the policy dialog).

Late tolerance. The value that decides whether a late student may still start is `lateToleranceMinutes` of the **activity policy** (default 15 minutes). The period-level field `lateToleranceMinutes` of the exam period is not used by that check. This difference caused an incident on 26 Nov 2026: the period said 30 while students were held to 15. Read the number in the readiness check, not in the period.

To keep an activity open for latecomers, switch `Auto status` off, extend its end time before the close time, or re-open it by hand.

## 4. Readiness check

On the activity list page, pick `Tanggal kesiapan`. Each activity of that day gets a checklist:

| Check            | Meaning                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `PACKAGE`        | Online only: a package is attached and approved or locked.                                |
| `SCHEDULES`      | Every classroom of the grade has a schedule.                                              |
| `SEATS`          | Every active student of those classrooms has a seat in the period.                        |
| `NUMBERS`        | Every seated student has a participant number.                                            |
| `SUPERVISORS`    | Every room in use has a supervisor on the slot that contains the start time.              |
| `TECHNICIANS`    | Every room in use has a technician.                                                       |
| `LATE_TOLERANCE` | Informational: shows the effective late tolerance of the activity policy. It never fails. |

`SEATS`, `NUMBERS`, `SUPERVISORS` and `TECHNICIANS` are only checked for activities linked to an exam period.

## 5. Offline scores

Open `Nilai Offline` (`/exam/offline-scores`). It lists the offline schedules you may grade: the subject teacher through the existing grading scope, and staff with the manage-all grading permission. Entering needs `exam-grading.grade`; viewing needs `exam-grading.read`. Pick a classroom row to open `Isi Nilai`.

The roster is the students seated for that classroom in the period, sorted by participant number. A schedule without a period has an empty roster. Each student is in one state:

- **Scored**: has a score.
- **Absent**: marked absent in the room monitor (`Catat Absen`). The row shows `Tidak hadir`, is locked, cannot take a score, and is never sent to assessment.
- **Missing**: present but no score yet.

Entering:

- Typing a score saves that row by itself shortly after (autosave per row). A score is 0 to the maximum with at most two decimals; a comma is accepted. The note holds up to 300 characters. Every save is audited.
- Pasting a column. Paste into any score cell: line 1 goes to that row, line 2 to the next row, and so on, over all rows below it including absent students. A header line (`Score`, `Nilai`, `Skor`) at the top is dropped. A line that is not a number still uses up its row and is skipped, and so does a line that lands on an absent student. A paste containing a tab is refused ("Tempel satu kolom nilai saja"): copy one column only. A summary names the students who were skipped or got an invalid value.
- Import a `.xlsx` or `.csv` (`Impor nilai`). The header row needs `No. Peserta` and `Score` (or `Nilai`); `Note` (or `Catatan`) is optional. Students are matched on `No. Peserta`. Limits: 1 MB and 500 rows. A row is rejected when the number is empty, duplicated in the file, not in this class, the value is not a number or is out of range, the student is absent (unless the cell says `TIDAK HADIR`), or the note is too long. A row is skipped, not rejected, when the score cell is empty or says `TIDAK HADIR` for an absent student. An empty cell never clears a stored score. The result lists rejected and skipped rows by row number.
- Download the sheet (`Unduh lembar nilai (.xlsx)`). It is prefilled with the roster (`No. Peserta`, `Nama`, `Score`, `Note`) and can be filled by hand and imported back.
- Print the Score Sheet from `Cetak Dokumen` (`/exam/print/score-sheet`), in the same family as Daftar Hadir, to fill in by hand in the room.

Sending to assessment. `Kirim ke penilaian` queues the scores of students who are Scored; a background job sends them to assessment-service like online scores and retries failures. If students are still Missing, the dialog lists them and asks for confirmation; they are left out and can be sent later. Absent students are never sent.

After sending:

- A sent score cannot be cleared. Replace it with a new value; a changed value is queued and sent again.
- If a student with an already sent score is later marked absent, the score stays in assessment. The page shows a warning naming the student; correct it in assessment.

## 6. Berita Acara and Daftar Hadir

Berita Acara, Daftar Hadir and the printed timetable show `Mulai` and `Selesai` on every row, from the activity window. Offline rows show registered, present and absent counts; the started and submitted counts exist only for Online schedules that can have sessions.

Absences of offline exams are recorded in the room monitor, not in Berita Acara. The monitor lists offline students with the `Offline` state (never as not started, late or silent, since they have no session by design) and `Catat Absen` works on them. The absence is stored on the offline schedule: the offline score page shows the student as Absent (`Tidak hadir`) and publishing leaves them out. Berita Acara is the printed record of the slot: it shows the absent count of each row and a sentence naming the offline subjects as done on paper or as a practical. An activity with no classroom assigned yet appears as a row without a schedule and no absent count, so assign classrooms first.

## 7. Release notes

- The route prefix `/exam-offline` is in `apps/exam-web/api-routes.config.ts`. After the merge, merge the Release PR and run `Update the lock` **before** the deploy; otherwise the gateway has no route and `/exam-offline/*` answers 404. See [release](release.md) and [deploy](deploy.md).
- Two forward-only migrations ship with this: `20261127000000_offline_exams` (delivery mode, offline kind, max score, auto status, nullable schedule package, offline results table, CHECK constraints) and `20261127010000_offline_results_publication_status`. They are not reversible; see [rollback](rollback.md).
- After the deploy, every `ACTIVE` activity whose end plus grace has passed is closed within about a minute. This is safe: sessions still running keep an Online activity open. Online `SCHEDULED` activities with a ready package open themselves at their lead time.
- The Android app needs a new release for the Offline marker. Old builds show an offline exam as "Belum dibuka" and then "Selesai" without the marker and can never start it. The Android contract copy was synced to exam 0.9.2 on branch `feat/offline-exam-marker` of `241-android`; the release itself is the owner's decision.

## 8. Operator runbook: existing paper activities

This section is a runbook. Nothing here was run by the people who wrote it, and no production data may be changed before the owner confirms each step.

There is no screen to change the delivery mode of an existing activity. Activities created before this release are all Online. For the paper exams (Tafsir Al-Qur'an, Mustholah Al-Hadits, Kejam'iyyahan for all grades: Written; Prakarya kelas 7: Practical) either recreate them as Offline activities, or run a one-off SQL in the `exam` database for the chosen activities only:

1. In `exam_activities`, set `delivery_mode` to `OFFLINE`, `offline_kind` to `WRITTEN` or `PRACTICAL`, and `max_score` for the chosen activity ids. The database CHECK requires an Offline activity to have an offline kind and no package, and an Offline schedule to have no package, so the chosen activities and their schedules must have no package.
2. Do not touch other rows. Keep the schedules' own `delivery_mode` in step with the activity, because `exam_schedules` carries its own copy (the CHECK there also needs no package).
3. Assign the classrooms of each grade with `Tetapkan kelas` on the page.
4. Open the readiness check for the exam days and confirm that every activity passes or states why not.
5. Online activities that have no schedules yet (for example Informatika 7 and 8, Muthola'ah 8) need `Tetapkan kelas` as well.

Ask the owner to confirm each activity and kind before step 1.

## 9. Gotchas

- An Offline schedule never gets a token or a session. The supervisor token endpoint refuses it with 409 `OFFLINE_NO_TOKEN`, and starting it answers `OFFLINE_NOT_STARTABLE`.
- The delivery mode cannot be changed after creation: no screen or endpoint does it.
- The room monitor lists offline schedules for absence only: they do not count as not started and do not change the exam window shown in the monitor. An Online schedule without a package is still left out; its students show `Tidak ada jadwal ujian pada jam ini` and cannot be marked absent until a package is attached.
- Offline score entry reads the seats of the exam period. Without seats there is no roster and nobody to score.
- The import matches on participant numbers; when none can be loaded the import answers 503 "Nomor peserta tidak bisa dimuat".
- `Auto status` off means the job never touches the activity, in either direction.
