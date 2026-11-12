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

| Aksi                                                                | Guru (`exam-schedules.manage`)                                                | Admin (`exam-schedules.manage-all`)     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| Membuat kegiatan `DAILY` / `ASSIGNMENT`                             | Ya, kapan saja                                                                | Ya                                      |
| Membuat kegiatan `MIDTERM` (UTS)                                    | Ya, hanya di dalam `ExamEvent` `MIDTERM` berstatus `ACTIVE` dan dalam rentang | Ya, wajib tertaut `ExamEvent` `MIDTERM` |
| Membuat kegiatan `FINAL` (UAS)                                      | Tidak (`FINAL_ADMIN_ONLY`)                                                    | Ya, wajib tertaut `ExamEvent` `FINAL`   |
| Membuka / mengelola Periode Ujian (`ExamEvent` UTS/UAS)             | Tidak                                                                         | Ya                                      |
| Membuat jadwal susulan (`MAKEUP`)                                   | Ya (`exam-grading.grade`), jenis ikut jadwal induk                            | Ya                                      |
| Mengubah kebijakan kegiatan (`PATCH /exam-activities/:id/policy`)   | Tidak                                                                         | Ya (selama status bukan `ACTIVE`)       |
| Mengganti token kegiatan (`POST /exam-activities/:id/token/rotate`) | Tidak                                                                         | Ya                                      |
| Mengubah angka preset (`PATCH /exam-policy-presets/:type`)          | Tidak                                                                         | Ya                                      |
| Tambah waktu / lepas perangkat / buka ulang sesi                    | Pengawas di ruang                                                             | Ya                                      |

## 4. Pemisahan menu Ujian dan Non-ujian

Di `exam-web`, navigasi dibagi berdasarkan kategori server:

- **Bank Soal**: Paket Soal, Persetujuan Paket (dipakai bersama).
- **Ujian (`category = EXAM`)**: Periode Ujian, Kegiatan, Jadwal, Ruang, Penilaian.
- **Non-ujian (`category = NON_EXAM`)**: Kegiatan, Jadwal, Penilaian.
- **Saya**: Ujian Saya (menampilkan semua jadwal siswa dengan badge kategori).
- **Pengaturan**: Preset (`/settings/presets`, khusus `exam-schedules.manage-all`).

Di `exam-android`, tab/menu siswa memisahkan daftar berdasarkan field `category` dari server (`EXAM` untuk Ujian, `NON_EXAM` untuk Non-ujian), termasuk jadwal susulan yang mengikuti kategori jadwal induknya.

## 5. Token dan pengawasan saat sesi berjalan

- Satu kode per **kegiatan** (mapel), dipakai semua kelas yang ikut.
- Ujian (`MIDTERM`, `FINAL`): kode selalu berputar sesuai `tokenSlotSeconds`; kode dari slot sebelumnya masih diterima dengan masa tenggang.
- Kode bocor → admin menjalankan **Ganti token** pada halaman detail kegiatan; kode lama langsung tidak berlaku.
- Keluar aplikasi = wajib memasukkan kode lagi. Aplikasi mati sendiri, HP restart, atau jaringan putus bukan pelanggaran dan tidak meminta kode, tetapi waktu ujian tetap berjalan.
- Panggilan masuk menjeda ujian sementara dan mengembalikan waktu saat panggilan selesai.
