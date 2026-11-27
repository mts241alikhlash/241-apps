# Bispro kegiatan ujian & non-ujian

Dokumen ini menjelaskan taksonomi jenis dan kategori ujian, cara kerja kegiatan (`ExamActivity`), preset kebijakan (`ExamPolicyPreset`), siapa yang membuat apa, serta pemisahan menu **Ujian** dan **Non-ujian**. Acuannya kode `exam-service`, `exam-web`, dan `exam-android`.

## 1. Jenis, kategori, dan istilah

- **Periode Ujian (`ExamEvent`)**: rentang pelaksanaan resmi yang dibuka admin (hanya untuk **UTS** dan **UAS**).
- **Kegiatan (`ExamActivity`)**: satu ujian atau kegiatan kelas untuk satu **tingkat**, dengan kelas-kelas yang dipilih. Sistem membuatkan **jadwal per kelas (`ExamSchedule`)** secara otomatis.
- **Empat jenis (`ExamType`) dan dua kategori (`ExamCategory`)**:

| Kode (`ExamType`) | Label UI       | Kategori (`ExamCategory`) | Label Kategori |
| ----------------- | -------------- | ------------------------- | -------------- |
| `DAILY`           | Ulangan Harian | `NON_EXAM`                | Non-ujian      |
| `ASSIGNMENT`      | Tugas          | `NON_EXAM`                | Non-ujian      |
| `MIDTERM`         | UTS            | `EXAM`                    | Ujian          |
| `FINAL`           | UAS            | `EXAM`                    | Ujian          |

Kategori diturunkan di server dari `type` (lihat [ADR 0009](../adr/0009-exam-category-derives-from-type.md)). Jadwal **susulan (`MAKEUP`)** selalu mewarisi `type` (dan otomatis `category`) dari jadwal induknya.

## 2. Preset kebijakan (4 kolom)

Setiap jenis memiliki satu preset bawaan di tabel `exam_policy_presets`:

| Setelan                                        | UTS (`MIDTERM`)    | UAS (`FINAL`)      | Ulangan Harian (`DAILY`) | Tugas (`ASSIGNMENT`)      |
| ---------------------------------------------- | ------------------ | ------------------ | ------------------------ | ------------------------- |
| Batas pelanggaran sebelum dikumpulkan otomatis | 3                  | 3                  | 3                        | 3                         |
| Ambang "fokus hilang"                          | 10 detik           | 10 detik           | 10 detik                 | 10 detik                  |
| Detak kehadiran                                | 15 detik           | 15 detik           | 15 detik                 | 15 detik                  |
| Hilang dicatat mulai                           | 60 detik           | 60 detik           | 60 detik                 | 5 menit                   |
| Hilang wajib token mulai                       | 5 menit            | 5 menit            | 5 menit                  | 30 menit                  |
| Hilang dihitung pelanggaran                    | kejadian ke-2      | kejadian ke-2      | kejadian ke-2            | kejadian ke-3             |
| Token                                          | berputar 600 detik | berputar 600 detik | berputar 600 detik       | **tetap** sepanjang tugas |

Aturan kunci preset dan token:

- **Ujian (`MIDTERM`, `FINAL`)**: wajib memakai preset jenisnya sendiri (`PRESET_LOCKED` bila diganti) dan wajib memakai **token berputar (`ROTATING`)** (`TOKEN_MODE_LOCKED` bila `STATIC`).
- **Non-ujian (`DAILY`, `ASSIGNMENT`)**: boleh memilih preset `DAILY` atau `ASSIGNMENT` dan bebas memilih token berputar atau tetap.
- Preset hanya **cetakan**: saat kegiatan dibuat, angkanya disalin ke `exam_activities.policy`. Mengubah preset di halaman **Pengaturan → Preset** hanya berlaku untuk kegiatan **baru**; kegiatan yang sudah ada tidak berubah.

## 3. Siapa membuat dan mengubah apa

Hak akses ujian memisahkan kewenangan **Guru pengampu (`TEACHER`)**, **TU Kurikulum (`CURRICULUM_STAFF`)**, **Panitia / Pimpinan (`VICE_PRINCIPAL_STUDENT_AFFAIRS`)**, **Admin Ujian (`EXAM_ADMIN`, `VICE_PRINCIPAL_CURRICULUM`, `OPERATOR`)**, **Pengawas (`EXAM_SUPERVISOR`)**, **Teknisi (`EXAM_TECHNICIAN`)**, serta mode **baca-saja Kepala Madrasah (`PRINCIPAL`)**.

| Aksi                                                                                   | Guru (`TEACHER`)                                                                                                      | TU (`CURRICULUM_STAFF`)                                                     | Wakamad Kesiswaan (`VICE_PRINCIPAL_STUDENT_AFFAIRS`)  | Admin Istiqra (`EXAM_ADMIN` / `VICE_PRINCIPAL_CURRICULUM` / `OPERATOR`) |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Membuat / mengubah kegiatan `DAILY` & `ASSIGNMENT` (`NON_EXAM`)                        | Ya (hanya mapel & kelas yang diampu atau miliknya sendiri)                                                            | Ya                                                                          | Ya                                                    | Ya                                                                      |
| Membuat / mengubah kegiatan `MIDTERM` (UTS)                                            | Tidak (`EXAM_ADMIN_ONLY`)                                                                                             | Ya, hanya di dalam `ExamEvent` `MIDTERM` berstatus `ACTIVE` & dalam rentang | Ya, wajib tertaut `ExamEvent` `MIDTERM`               | Ya, wajib tertaut `ExamEvent` `MIDTERM`                                 |
| Membuat / mengubah kegiatan `FINAL` (UAS)                                              | Tidak (`FINAL_ADMIN_ONLY`)                                                                                            | Tidak (`FINAL_ADMIN_ONLY`)                                                  | Ya, wajib tertaut `ExamEvent` `FINAL`                 | Ya, wajib tertaut `ExamEvent` `FINAL`                                   |
| Membuka / mengelola Periode Ujian (`ExamEvent`), ruang, kursi, pengawas, cetak dokumen | Tidak                                                                                                                 | Ya (`exam-events.manage`)                                                   | Ya (`exam-events.manage`)                             | Ya (`exam-events.manage`)                                               |
| Menyetujui paket soal & menyesuaikan kunci (`approve` / `adjust-key`)                  | Tidak                                                                                                                 | Tidak                                                                       | Tidak                                                 | Ya (`exam-questions.approve`, `exam-packages.adjust-key`)               |
| Mengubah kebijakan kegiatan (`PATCH /exam-activities/:id/policy`)                      | Tidak                                                                                                                 | Tidak                                                                       | Ya (`exam-schedules.manage-all`, saat bukan `ACTIVE`) | Ya (`exam-schedules.manage-all`, saat bukan `ACTIVE`)                   |
| Mengganti token kegiatan (`POST /exam-activities/:id/token/rotate`)                    | Tidak                                                                                                                 | Tidak                                                                       | Ya (`exam-schedules.manage-all`)                      | Ya (`exam-schedules.manage-all`)                                        |
| Mengubah Preset & SEB (`PATCH /exam-policy-presets/:type`, `/settings/seb`)            | Tidak                                                                                                                 | Tidak                                                                       | Tidak                                                 | Ya (`exam-settings.manage`)                                             |
| Menilai jawaban                                                                        | Ya (`exam-grading.grade`, khusus kelas & mapel yang diampu)                                                           | Tidak (baca-saja via `exam-grading.read-all`)                               | Tidak (baca-saja via `exam-grading.read-all`)         | Tidak (baca-saja via `exam-grading.read-all`)                           |
| Membuat susulan (`MAKEUP`) & mengelola pesertanya; jenis ikut jadwal induk             | Hanya `NON_EXAM` pada kelas & mapel yang diampu (`exam-grading.grade`); `MIDTERM` / `FINAL` tidak (`EXAM_ADMIN_ONLY`) | Ya (`exam-events.manage`)                                                   | Ya (`exam-schedules.manage-all`)                      | Ya (`exam-schedules.manage-all`)                                        |
| Monitoring semua ruang, pemulihan sesi (`release`), & Berita Acara                     | Tidak                                                                                                                 | Ya (`exam-rooms.manage-all`, `exam-sessions.release`)                       | Ya (`exam-rooms.manage-all`, `exam-sessions.release`) | Ya (`exam-rooms.manage-all`, `exam-sessions.release`)                   |

Pemisahan izin pengaturan sistem: **`exam-settings.manage`** memisahkan akses **Preset** dan **Safe Exam Browser (SEB)** dari `exam-schedules.manage-all`, sehingga hanya dipegang `EXAM_ADMIN`, `VICE_PRINCIPAL_CURRICULUM`, dan `OPERATOR` (tidak dimiliki `VICE_PRINCIPAL_STUDENT_AFFAIRS` maupun `CURRICULUM_STAFF`).

### Ringkasan peran ujian

- **`EXAM_ADMIN` / `OPERATOR` / `VICE_PRINCIPAL_CURRICULUM`**: operasional penuh aplikasi Istiqra (termasuk `exam-schedules.manage-all`, `exam-questions.approve`, `exam-packages.adjust-key`, dan `exam-settings.manage`), tanpa hak menilai (`exam-grading.grade`).
- **`VICE_PRINCIPAL_STUDENT_AFFAIRS`**: sekretaris/wakil ketua panitia ujian — persiapan event, penjadwalan termasuk `MIDTERM` & `FINAL` (`exam-schedules.manage-all`), cetak dokumen, monitoring semua ruang, pemulihan sesi, Berita Acara, dan baca nilai; tanpa `exam-questions.approve`, `exam-packages.adjust-key`, `exam-settings.manage`, dan `exam-grading.grade`.
- **`CURRICULUM_STAFF`**: persiapan event/ruang/kursi/pengawas, penjadwalan kelas & persiapan `MIDTERM` selama `ExamEvent` `ACTIVE`, cetak dokumen, monitoring & Berita Acara, dan baca nilai; tanpa `FINAL`, `exam-schedules.manage-all`, `exam-questions.approve`, `exam-packages.adjust-key`, `exam-settings.manage`, dan `exam-grading.grade`.
- **`PRINCIPAL`**: akses **baca-saja** di seluruh menu ujian (`Bank Soal`, `Persiapan`, `Ujian`, `Non-ujian`, `Monitoring`, `Monitoring Semua Ruang`, `Berita Acara`, `Penilaian`, `Cetak Dokumen`), termasuk melihat token masuk ruang (`exam-rooms.read-all`) serta lembar pemeriksaan & rekap nilai (`exam-grading.read-all`, `exam-scores.read-all`), tanpa aksi tulis, reset sandi kartu, unggah berkas, pemulihan sesi, atau menilai.
- **`TEACHER`**: bank soal, pengelolaan kegiatan & jadwal **Non-ujian** (`DAILY` / `ASSIGNMENT`) mapel ampuannya, serta satu-satunya pemegang hak menilai (`exam-grading.grade`), serta dapat membuat jadwal susulan (`MAKEUP`) **Non-ujian** pada kelas & mapel yang diampu. Susulan `MIDTERM` / `FINAL` dibuat dan dikelola panitia atau admin ujian (`exam-events.manage` / `exam-schedules.manage-all`). Menu **Ujian → Kegiatan** dan **Ujian → Jadwal** disembunyikan dari guru.
- **`EXAM_SUPERVISOR`**: pengawas ruang yang bertugas di **Monitoring** ruang dan **Berita Acara** pada ruang/slot penugasannya (`exam-rooms.supervise`, `exam-sessions.release`), tanpa menu `Persiapan` dan tanpa `Monitoring Semua Ruang`.
- **`EXAM_TECHNICIAN`**: teknisi ruang yang bertugas khusus pada ruang dengan `technicianUserId` miliknya (`exam-rooms.technician`, `exam-schedules.access-code`, `exam-schedules.read`, `exam-sessions.read`, `exam-sessions.release`) pada menu **Monitoring**, **Monitoring Semua Ruang**, dan **Berita Acara** (baca & catat laporan lapangan tanpa menyerahkan Berita Acara pengawas), tanpa menu `Persiapan`.
- **`ACADEMIC_ADMIN`**: menerima peleburan `ASSESSMENT_ADMIN` (yang dipensiunkan dari `DEFAULT_ROLES`) dan hanya memegang izin baca nilai ujian (`exam-scores.read`, `exam-scores.read-all`) tanpa izin operasional ujian.
- **`STUDENT`**: peserta ujian (`exam-sessions.take`) pada menu **Ujian Saya**.

## 4. Pemisahan menu Ujian dan Non-ujian

Di `exam-web`, navigasi dibagi berdasarkan kategori server dan peran:

- **Bank Soal**: `Paket Soal` (`exam-packages.read`), `Persetujuan Paket` (`exam-questions.approve`).
- **Ujian (`category = EXAM`)**:
  - `Persiapan`: `Periode Ujian`, `Ruangan`, `Pembagian Kursi`, `Jadwal Pengawas` (`exam-events.read` | `exam-events.manage`); `Nomor Peserta` (`exam-events.manage`); `Kegiatan` & `Jadwal` (`exam-schedules.manage-all` | `exam-events.read` — tampil untuk Panitia/Admin/TU dan `PRINCIPAL`, tersembunyi dari `TEACHER`).
  - `Pelaksanaan`: `Monitoring` (`exam-rooms.supervise` | `exam-rooms.technician` | `exam-rooms.read-all` | `exam-rooms.manage-all`), `Monitoring Semua Ruang` (`exam-rooms.technician` | `exam-rooms.read-all` | `exam-rooms.manage-all`), `Berita Acara` (`exam-rooms.supervise` | `exam-rooms.technician` | `exam-rooms.read-all` | `exam-rooms.manage-all`).
  - `Penilaian` (`exam-grading.read` | `exam-grading.read-all` | `exam-grading.manage-all`).
  - `Cetak Dokumen`: `Jadwal Ujian`, `Kartu Peserta`, `Daftar Meja`, `Daftar Hadir Peserta`, `Daftar Hadir Pengawas & Teknisi` (`exam-events.manage` | `exam-events.read`); `Daftar Soal & Kunci` (`exam-grading.read` | `exam-grading.read-all` | `exam-grading.manage-all`).
- **Non-ujian (`category = NON_EXAM`)**: `Kegiatan`, `Jadwal` (`exam-schedules.manage` | `exam-schedules.manage-all` | `exam-events.read`), `Penilaian`, `Daftar Soal & Kunci` (`exam-grading.read` | `exam-grading.read-all` | `exam-grading.manage-all`).
- **Saya**: `Ujian Saya` (`exam-sessions.take`, menampilkan semua jadwal siswa dengan badge kategori).
- **Pengaturan**: `Preset` (`/settings/presets`) dan `Safe Exam Browser` (`/settings/seb`), keduanya khusus pemegang **`exam-settings.manage`**.

Di `exam-android`, tab/menu siswa memisahkan daftar berdasarkan field `category` dari server (`EXAM` untuk Ujian, `NON_EXAM` untuk Non-ujian), termasuk jadwal susulan yang mengikuti kategori jadwal induknya.

## 5. Token dan pengawasan saat sesi berjalan

- Satu kode per **kegiatan** (mapel), dipakai semua kelas yang ikut.
- Ujian (`MIDTERM`, `FINAL`): kode selalu berputar sesuai `tokenSlotSeconds`; kode dari slot sebelumnya masih diterima dengan masa tenggang.
- Kode bocor → panitia/admin pemegang `exam-schedules.manage-all` menjalankan **Ganti token** pada halaman detail kegiatan; kode lama langsung tidak berlaku.
- Token masuk ruang (`accessCode`) dapat dilihat oleh `exam-rooms.manage-all`, `exam-rooms.supervise`, `exam-rooms.technician`, dan `exam-rooms.read-all` (`PRINCIPAL` baca-saja), sedangkan pemutaran token ruang hanya oleh `exam-rooms.technician` atau `exam-rooms.manage-all` pada ruang yang ditugaskan.
- Keluar aplikasi = wajib memasukkan kode lagi. Aplikasi mati sendiri, HP restart, atau jaringan putus bukan pelanggaran dan tidak meminta kode, tetapi waktu ujian tetap berjalan.
- Panggilan masuk menjeda ujian sementara dan mengembalikan waktu saat panggilan selesai.

## 6. Ujian lewat web (Safe Exam Browser)

- Siswa yang memakai browser hanya boleh mulai dan melanjutkan sesi di **Safe Exam Browser (SEB)** dengan konfigurasi sekolah yang aktif; server menolak sebaliknya dengan `SEB_REQUIRED`. Istiqra (Android) tidak diperiksa SEB dan tidak berubah.
- Konfigurasi dibuat pengelola dengan izin `exam-settings.manage` di **Pengaturan → Safe Exam Browser** (`/settings/seb`). Cara membuat dan mengganti berkas `.seb` ada di [panduan Safe Exam Browser](../guides/safe-exam-browser.md); keputusan ada di [ADR 0011](../adr/0011-web-exams-run-in-safe-exam-browser.md).
- Kolom `requireAndroidApp` (periode ujian) dan `allowWebClient` (ruang dan sesi) sudah dihapus.
