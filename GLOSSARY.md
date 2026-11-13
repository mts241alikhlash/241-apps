# Glossary

Indonesian domain terms, the name used in code, and what they mean. One heading per bounded context (the service that owns it). Terms appear in the UI as written here; code and APIs use the English name.

## Identity

- **Akun** — `User` — a login account. An account is not a person: students, staff and parents reference one by id.
- **Profil** — `Profile` — the personal data of a person (name, identity numbers, address), kept apart from the account.
- **Peran** — `Role` — a job function that groups permissions.
- **Izin akses** — `Permission` — one action a role may do, written `<module>.<action>`.
- **Super Admin** — `SUPER_ADMIN` — the one role that bypasses permission checks, for recovery.
- **Satuan pendidikan** — `SchoolUnit` — the school (institution) record; its type is `SchoolUnitType`.
- **Pelamar** — `APPLICANT` — the role of an admission applicant, who signs in separately from staff.
- **Log audit** — `AuditLog` — the record of who changed what.
- **Agama / Golongan darah** — `Religion` / `BloodType` — reference lists owned by identity.

## Admission

- **PPDB / PSB** — admission — Penerimaan Peserta Didik Baru (new student admission); the UI says "Penerimaan Santri Baru".
- **Pendaftar** — `AdmissionApplication` — a person applying; also the list of applications.
- **Gelombang** — `AdmissionWave` — an admission period with its own dates and quota.
- **Berkas / Jenis Berkas** — `AdmissionDocument` / `AdmissionDocumentType` — a document an applicant uploads and the kind of document required. A type is Wajib (required), Susulan (may be delivered later) or Opsional (optional).
- **Berkas Susulan** — late documents — documents allowed after submission, with a due date computed from the first semester start.
- **Verifikasi Berkas** — document review — staff approving or rejecting an applicant's documents.
- **Pembayaran / Rekening Pembayaran** — `AdmissionPayment` / `AdmissionBankAccount` — a payment proof and the school account applicants pay into.
- **Keputusan** — decision — accepting or rejecting applicants.
- **Daftar Ulang** — enrollment — re-registration of accepted applicants, which creates students.
- **NIS / NISN** — student number — the school's student number and the national one. The NIS is composed from the school-year code, grade level and an alphabetical sequence; **Kunci NIS** (`AdmissionNisLock`) fixes it one way.
- **Halaman Depan** — `AdmissionLandingSection` — the public admission landing page content.
- **Unduhan** — `AdmissionDownload` — files offered for download (brochures, forms).
- **Siswa baru / Pindahan** — new student / transfer — the two kinds of applicant.

## Academic

- **Tahun Ajaran** — `AcademicYear` — a school year.
- **Semester** — `Semester` — a term of a school year; its kind is `SemesterType`.
- **Kenaikan Kelas** — semester rollover — moving students to the next grade and term.
- **Kalender Pendidikan** — `AcademicCalendar` — the school calendar of events; typed by `AcademicCalendarType`.
- **Tingkat Kelas** — `Grade` — a grade level; offered in a year as `GradeAcademicYear`.
- **Kelas** — `Classroom` — a class group, with a **wali kelas** (`ClassroomSupervisor`, homeroom teacher).
- **Kurikulum / Mata Pelajaran** — `Curricula` / `Subject` — the curriculum and its subjects (`CurriculumSubject`).
- **KKM** — passing score — Nilai Ketuntasan Minimum, the minimum score to pass a subject.
- **Jam Pelajaran** — `TimeSlot` — a period in the daily timetable.
- **Jadwal Pelajaran** — `Schedule` — the lesson timetable.
- **Penugasan Mengajar** — `TeachingAssignment` — a teacher assigned to teach a subject to a class.
- **Data Referensi Santri** — reference lists — administrator-managed choice lists (occupation, education, income range, disability, transportation, and so on) that feed the admission form; they carry no EMIS codes.

## Student

- **Siswa / Santri** — `Student` — an enrolled student.
- **Orang Tua** — `Parent`, linked through `StudentParent` — a parent or guardian.
- **Rombel / Pendaftaran siswa** — `StudentEnrollment` — a student's place in a class for a term.
- **Kelulusan** — `StudentGraduation` — graduation; a **tahanan kelulusan** (`StudentGraduationHold`) blocks a student from graduating.
- **Alumni** — graduated students.

## HR

- **Pegawai** — `Employee` — a staff member (teachers are employees).
- **Jabatan / Kategori Jabatan** — `Position` / `PositionCategory` — a post and its category; held through `EmployeePosition`.
- **Jenis Kepegawaian** — `EmploymentType` — the kind of employment.
- **Penggajian** — payroll — **Perhitungan** (`PayrollRun`) calculates a month; **Slip Gaji** (`Payslip`) is one employee's result; **Komponen Gaji** (`SalaryComponent`) is a pay line item assigned through `SalaryAssignment`.

## Presence

- **Presensi** — presence — recorded attendance, for staff and students.
- **Kartu Presensi** — `PresenceCredential` — a card or code used to scan.
- **Perangkat Gerbang / Kiosk** — `PresenceDevice` — a gate device that records scans (`PresenceScan`).
- **Pola Kerja** — `WorkPattern` — a staff work schedule; assigned through `WorkPatternAssignment`.
- **Hari Libur** — `NonWorkingDay` — a day with no attendance expected.
- **Izin & Cuti** — `LeaveRequest` of a `LeaveType` — leave and permission; balances in `LeaveBalance`.
- **Periode Kehadiran** — `AttendancePeriod` — a month that can be closed.
- **Rekap Bulanan** — monthly summary — attendance totals per person for payroll.

## Inventory

- **Aset** — `InventoryAsset` — an item the school owns, with physical units (`InventoryAssetUnit`).
- **Kategori / Lokasi / Kondisi / Status / Sumber Dana** — `InventoryCategory` / `InventoryLocation` / `InventoryCondition` / `InventoryStatus` / `InventoryFundingSource` — the reference lists describing an asset.
- **Peminjaman** — `InventoryLoan` — lending items out.
- **Riwayat Sirkulasi** — `InventoryHistory` — the movement history of an asset.
- **Alur Persetujuan** — `ApprovalWorkflow` — the approval steps a request goes through.

## Portal

- **Berita / Artikel / Pengumuman** — `Post` — public posts of different types.
- **Agenda** — `AgendaEntry` — an event on the public calendar.
- **Galeri** — `GalleryAlbum` — photo albums.
- **Halaman** — `PortalPage` — a static public page.
- **Menu / Beranda** — `PortalNavItem` / `PortalHomepageSection` — the site navigation and the home page sections.
- **Taksonomi** — categories and tags (`PostCategory`, `PostTag`).

## Assessment

- **Butir Penilaian** — `AssessmentItem` — a graded item (quiz, assignment); its weight is `AssessmentWeight`.
- **Nilai Siswa** — `StudentScore` — a student's score on an item.
- **Nilai Rapor** — `ReportCardSubject` score — the final report grade of one subject on a `Rapor`; the only grade assessment treats as final.
- **Salinan Nilai Ujian** — `ExamScore` — an exam score kept in assessment for reference; it is not a report grade.
- **Presensi (kelas)** — `Attendance` — lesson attendance.
- **Rapor** — `ReportCard` — the term report, with one line per subject (`ReportCardSubject`).

## Exam

- **Paket Soal** — `ExamPackage` — a set of questions; reviewed through **Persetujuan Paket** (`ExamPackageReview`).
- **Bank Soal** — `Question`, with versions `QuestionVersion` — the question bank.
- **Periode Ujian** — `ExamEvent` — an official exam period (only for `MIDTERM` and `FINAL`).
- **Kegiatan** — `ExamActivity` — one grade-level exam or classwork activity that generates per-classroom schedules (`ExamSchedule`) and copies a policy preset (`ExamPolicyPreset`).
- **Jenis Ujian** — `ExamType` — the four activity and schedule types: **Ulangan Harian** (`DAILY`), **Tugas** (`ASSIGNMENT`), **UTS** (`MIDTERM`), and **UAS** (`FINAL`).
- **Kategori Ujian** — `ExamCategory` — derived from `ExamType` on the server: **Ujian** (`EXAM`, covering `MIDTERM` and `FINAL`) and **Non-ujian** (`NON_EXAM`, covering `DAILY` and `ASSIGNMENT`).
- **Jadwal Ujian** — `ExamSchedule` — when a package is sat by a classroom, or by selected makeup participants (`ExamScheduleParticipant`).
- **Ruang Ujian** — `ExamRoom` — an exam room with seats and supervisors (**pengawas**).
- **Sesi Ujian** — `ExamSession` — one participant's sitting, with answers (`ExamAnswer`).
- **Nilai Ujian** — an exam score from grading a session; it may or may not be taken into a **Nilai Rapor**.
- **Penilaian Ujian** — grading — scoring answers; results are released as a `ScorePublication`.
- **Safe Exam Browser (SEB)** — the locked browser that runs web exams with a school configuration; a web client is verified only inside it.
- **Config Key** — `configKey` — the 64-character hex key of a SEB configuration (`SebConfig`), read by the page through the SEB JavaScript API and hashed by the server.
- **Klien ujian** — `ExamClient` (`ISTIQRA` or `SEB`) — the client a session started with, recorded on `ExamSession.client`.
