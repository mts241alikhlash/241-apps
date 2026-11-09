# Ujian aktif, ruang siswa, dan berita acara — Desain

Tanggal: 2026-11-09
Status: menunggu persetujuan
Ruang lingkup: `241-apps` (exam-service, exam-web, kontrak) + `241-android`
Melanjutkan: `docs/specs/2026-11-07-kegiatan-ujian-design.md` (kegiatan sebagai induk jadwal; sudah diimplementasikan)

## Kenapa

Kegiatan ujian (`exam_activities`) sudah ada, begitu pula ruang, kursi, monitor, dan berita acara ruang. Yang belum ada adalah apa yang dilihat **siswa**:

- `GET /me/exams` hanya mengirim id, judul, mapel, jendela, durasi, status sesi. Tidak ada kegiatan, event, ruangan, kursi, nomor peserta, atau status kegiatan.
- Field `participantNumber` ada di aplikasi tetapi **tidak pernah dikirim server**; nomor peserta praktis kosong.
- Semua endpoint ruang dan kursi milik guru/admin (`exam-rooms/{roomId}/...`). Tidak ada proyeksi untuk pemilik kursi.
- Server tidak menolak siswa memulai sesi ketika kegiatan sudah ditutup; aplikasi yang menebak dari jam perangkat.
- Aplikasi tidak membedakan ujian dan non-ujian di navigasi: satu daftar, satu profil, tanpa kartu ruang.

## Tujuan

1. Satu makna "ujian aktif": status kegiatan `ACTIVE` **dan** sekarang di dalam jendela kegiatan (dan jendela jadwal kelasnya). Di luar itu otomatis "akan datang" atau "selesai".
2. Server menjadi satu-satunya penentu: menolak mulai sesi bila kegiatan tidak aktif, dengan kode galat yang sudah dikenal aplikasi (`WINDOW_CLOSED`).
3. Siswa bisa melihat ruangan, nomor peserta, dan nomor meja miliknya untuk kegiatan yang sedang aktif.
4. Aplikasi memisahkan **Ujian** (punya kegiatan/event) dan **Non-ujian** (tugas, kuis, ulangan harian tanpa ruang); kartu ujian muncul di Profil hanya selama ujian aktif.
5. Berita acara tetap **per ruang dan per slot**, ditandatangani pengawas ruang; tidak ada laporan tingkat kegiatan.

## Bukan tujuan

- Cron atau worker yang mengubah status tersimpan mengikuti waktu.
- Tabel aktivasi baru per sesi/ruang.
- Mengubah mekanisme kursi, monitor ruang, laporan ruang, atau penilaian.
- Notifikasi push per fase ujian.
- Menampilkan berita acara di aplikasi siswa.

## Anti-tujuan (gagal walau teknis jalan)

- Dua sumber kebenaran status (status tersimpan yang diubah job + hitungan saat baca) sehingga admin dan siswa melihat hal berbeda.
- Aplikasi memutuskan sendiri boleh/tidaknya mulai ujian berdasarkan jam perangkat.
- Ruang/nomor peserta bisa dilihat siswa untuk kegiatan yang belum aktif.
- Menambah menu baru setiap kali ada jenis penilaian baru.

## Kendala

- Monorepo: changeset wajib, kontrak OpenAPI + klien digenerate (`pnpm openapi:emit`, `pnpm api:generate`), migrasi Prisma per service, tanpa komentar di kode.
- Server adalah otoritas; aplikasi tidak boleh punya angka kebijakan sendiri.
- `exam_events` sudah memegang `requireAndroidApp`, `late_tolerance_minutes`, `min_submit_minutes`, ruang, kursi, dan berita acara; `exam_activities` memegang paket, mapel, tingkat, kelas, kebijakan, token.
- Ujian susulan sudah menjadi jadwal nyata (`kind = MAKEUP`, `makeup_of_id`) dengan jendelanya sendiri.
- Aplikasi Android: minSdk 24, satu APK untuk dua jalur (ujian dan non-ujian).

## Keadaan sekarang (terverifikasi di kode dan kontrak)

| Bagian            | Keadaan                                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exam_activities` | Ada: `POST /exam-activities`, `PATCH /exam-activities/{id}/policy`, `POST /exam-activities/{id}/token/rotate`. `ExamActivityDto` memuat `status`, `startsAt`, `endsAt`, `tokenMode`, `policy`, `eventId`. |
| `exam_events`     | `ExamEventDto` memuat `status`, `startsAt`, `endsAt`, `lateToleranceMinutes`, `minSubmitMinutes`.                                                                                                         |
| Ruang & kursi     | `exam_rooms`, `exam_room_seats`, endpoint guru/admin (`/exam-rooms/{roomId}/seats`, `/monitor`, `/overview`).                                                                                             |
| Berita acara      | `exam_rooms/{roomId}/reports/{slotId}` + `submit`, `verify`, `absences`, `field-notes` — per ruang per slot.                                                                                              |
| `GET /me/exams`   | Hanya id, judul, mapel, jendela, durasi, status, sessionId, nama mapel, tipe.                                                                                                                             |
| Server saat mulai | `POST /me/exams/{id}/sessions` memakai kode akses kegiatan; tidak membaca status kegiatan untuk menolak.                                                                                                  |
| Aplikasi          | Satu menu daftar; tidak ada kartu ruang; label "ujian" dipakai untuk semua tipe.                                                                                                                          |

## Keputusan pemilik (dari brainstorm 2026-11-09)

1. Kegiatan/event punya **status** seperti CRUD lain: `ACTIVE`/`INACTIVE` (admin bisa menutup lebih awal atau membatalkan).
2. "Aktif" = status `ACTIVE` **dan** sekarang di dalam rentang tanggal. Lewat rentang, ujian otomatis berstatus selesai tanpa job.
3. Keaktifan juga menjadi **syarat** siswa boleh membuka dan mengerjakan.
4. Sidebar aplikasi dipisah: **Ujian** dan **Non-ujian**.
5. Profil siswa menampilkan kartu kegiatan aktif berisi ruangan, nomor peserta, nomor meja; kartu hilang saat kegiatan selesai atau dinonaktifkan.
6. Susulan tetap lewat jadwal `MAKEUP`, bukan mekanisme aktivasi baru.
7. Berita acara mengikuti **ruang** (dan slot), bukan kegiatan.

## Pendekatan yang dipertimbangkan

| Cara            | Isi                                                                                                                                         | Trade-off                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 (dipilih)** | Status dan jendela dievaluasi **saat dibaca** oleh server; siswa menerima `lifecycle` hasil hitungan; penjagaan di satu titik (mulai sesi). | Paling sedikit bergerak, tanpa job dan tanpa tabel baru, mudah diuji. Status "selesai" dihitung ulang tiap permintaan.                                                                              |
| 2               | State machine terjadwal: cron mengubah status tersimpan (akan datang → berjalan → selesai).                                                 | Satu field dibaca aplikasi, cocok untuk notifikasi per fase; menambah worker, penanganan job telat, dan dua sumber kebenaran.                                                                       |
| 3               | Aktivasi per slot/ruang (buka-tutup tiap gelombang).                                                                                        | Paling fleksibel untuk UAS multi-hari; tabel aktivasi baru, UI admin tambahan, dan penjagaan berlapis. Tidak dibutuhkan karena jadwal sudah punya jendela sendiri dan susulan sudah menjadi jadwal. |

Dipilih **1** karena seluruh data sudah ada; opsi 2/3 baru masuk akal bila nanti perlu notifikasi atau laporan per fase.

## Usulan teknis (bukan keputusan pemilik)

- **Proyeksi siswa** pada `GET /me/exams` (tanpa endpoint baru):
  - `activityId`, `activityStatus`, `eventId`, `eventName`, `eventStatus`,
  - `windowStartsAt`, `windowEndsAt`,
  - `roomName`, `seatNumber`, `participantNumber`,
  - `lifecycle`: `UPCOMING` | `OPEN` | `FINISHED` (dihitung server dari status + jendela + toleransi).
  - Kursi dicari dari `(eventId, studentId)`; kosong bila kegiatan tanpa event.
- **Penjagaan**: `POST /me/exams/{id}/sessions` dan `POST .../resume` menolak dengan `409` bila `lifecycle != OPEN`, memakai kode `WINDOW_CLOSED` (sudah dikenal aplikasi) dan pesan yang menyebut ruangan serta nomor peserta bila ada.
- **Permission**: `exam-activities.read-own` untuk proyeksi kegiatan; `exam-rooms.read-own` untuk ruang/kursi milik sendiri. Guru/admin tidak berubah.
- **Admin (exam-web)**: status kegiatan/event dapat diubah dari layar CRUD yang ada; peringatan bila diaktifkan padahal di luar jendela. Tidak ada layar baru.
- **Aplikasi**: satu sumber data `/me/exams`; menu `Ujian` menampilkan kegiatan (dikelompokkan per event/kegiatan), menu `Non-ujian` menampilkan tipe tanpa event. Kartu Profil dirender hanya untuk `lifecycle = OPEN` dan hilang untuk `FINISHED`.
- **Berita acara**: tidak berubah; tetap per ruang per slot. Aplikasi hanya menampilkan ruang/kursi, bukan laporan.

## Yang diserahkan ke pelaksana

- Nama field DTO persis dan pemetaan kontrak; penamaan `lifecycle` vs `state`.
- Bentuk query kursi (join langsung vs port layanan) dan caching.
- Apakah `eventStatus` layak dikirim terpisah atau cukup digabung ke `lifecycle`.
- Susunan visual menu Ujian/Non-ujian dan kartu Profil.
- Detail migrasi data lama untuk jadwal tanpa `activity_id`.

## Risiko

| Risiko                                                                    | Mitigasi                                                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Admin mengaktifkan kegiatan di luar jendela lalu mengira siswa bisa masuk | `lifecycle` tetap menghitung jendela; UI admin memberi peringatan; server menolak dengan kode yang bisa ditampilkan |
| Kursi siswa belum ditetapkan saat kegiatan aktif                          | `roomName`/`seatNumber` null; aplikasi menampilkan "Belum ditetapkan" dan tombol mulai tetap mengikuti `lifecycle`  |
| Susulan tidak terlihat siswa                                              | jadwal `MAKEUP` ikut diproyeksikan beserta flag `makeup: true`                                                      |
| Aplikasi versi lama                                                       | field baru opsional; versi lama tetap berjalan dengan data yang ada                                                 |

## Keputusan pelaksana (sudah diputuskan, bukan pertanyaan)

- **Enum status memakai yang sudah ada**: kegiatan `DRAFT | SCHEDULED | ACTIVE | CLOSED`, event `DRAFT | ACTIVE | COMPLETED`. "Aktif" berarti kegiatan `ACTIVE`; status lain berarti tidak aktif. Tidak ada migrasi enum.
- **Status event bersifat informasi**, tidak menjadi gerbang tambahan: gerbang memakai status kegiatan + jendela, supaya event lama yang masih `DRAFT` tidak mengunci semua kegiatan.
- **Jendela**: bila jadwal punya kegiatan, jendela kegiatan yang menjadi acuan; bila tidak, jendela jadwal. `lateToleranceMinutes` tetap hanya memengaruhi izin masuk terlambat, bukan batas akhir `OPEN`.
- **Susulan**: `kind = MAKEUP` selalu masuk jalur Ujian dan mewarisi `eventId`/`activityId`/ruang dari jadwal induknya (`makeupOfId`), karena `createMakeup` tidak menyalin kedua id itu; jendela `lifecycle` memakai jendela jadwal susulan sendiri; nomor peserta tetap nomor semesternya.
- **Nomor peserta adalah registri per semester, bukan turunan kursi.** Format `SSS-YYT-GG-OOO` (contoh `241-261-08-001`: kode sekolah, tahun+semester, tingkat, urut). Cakupan unik `(semester, tingkat)`, urut alfabet nama (bukan NIS). Disimpan di **student-service** (`student_participant_numbers`: `student_id`, `semester_id`, `grade_level`, `ordinal`, `number`, `assigned_at`, unik pada `semester_id + grade_level + ordinal`), karena umurnya satu semester dan roster ada di sana. Nomor meja tetap terpisah di `exam_room_seats`.
- **Penerbitan nomor bersifat idempoten dan tercatat**: dijalankan saat kegiatan ujian pertama semester itu dijadwalkan atau saat admin menekan "Terbitkan nomor"; siswa yang masuk belakangan mendapat nomor berikutnya; nomor yang sudah terbit tidak pernah berubah otomatis. Tidak ada job terjadwal.
- **`participantNumber` boleh tampil kapan saja** (itu identitas di kartu ujian), sedangkan **ruang dan kursi hanya saat `lifecycle = OPEN`**.
- **Server menyembunyikan ruang/kursi kecuali `lifecycle = OPEN`**; sebelum aktif dan sesudah selesai field-nya `null`. Aplikasi membedakan "Belum ditetapkan" (OPEN tanpa kursi) dari "belum waktunya" (null di luar OPEN).
- **Penutupan lebih awal menghentikan sesi berjalan**: saat kegiatan diubah ke status tidak aktif atau event ditutup, semua sesi `IN_PROGRESS` milik kegiatan itu difinalisasi seketika (`finalize(id, 'EXPIRED')` + baris audit `CLOSED_BY_ADMIN`), jawaban yang tersimpan tetap dinilai, dan aplikasi menerima `WINDOW_CLOSED` sehingga keluar ke daftar. Sesi baru dan `resume` juga ditolak. Tidak ada alasan finalisasi baru di enum; jejak alasan dicatat di audit.
- **Permission**: tidak ada permission baru. `GET /me/exams` tetap memakai `exam-sessions.take`; proyeksi ruang/kursi ikut di dalamnya.
- **Backend yang belum ada**: registri nomor peserta + endpoint internal di student-service, `GET /exam-activities` (daftar/detail) dan `PATCH /exam-activities/{id}` (status), plus kontrol status di layar kegiatan/event yang sudah ada. Bukan layar baru.

## Pertanyaan terbuka untuk pemilik

Tidak ada. Dua pertanyaan terakhir sudah dijawab: nomor peserta diturunkan dari nomor meja (nama kontrak tetap dua), dan penutupan lebih awal menghentikan sesi berjalan.
