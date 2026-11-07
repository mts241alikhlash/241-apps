# Kegiatan ujian & tugas sebagai induk jadwal — Desain

Tanggal: 2026-11-07
Status: menunggu persetujuan
Ruang lingkup: `241-apps` (exam-service, exam-web, kontrak) + `241-android`

## Kenapa

Aplikasi akan dipakai untuk **dua dunia**: ujian resmi (UTS/UAS, dengan ruang dan pengawas) dan pemakaian harian (tugas, kuis, PR, ulangan harian). Hari ini:

- `ExamType` (`UH`, `QUIZ`, `ASSIGNMENT`, `UTS`, `UAS`) hanya **label**; tidak ada percabangan perilaku di server.
- Aplikasi **selalu** masuk mode terkunci + kamera + hitung pelanggaran, apa pun labelnya. Flag `requireAndroidApp` ada di kegiatan tetapi tidak pernah dibaca aplikasi.
- Token untuk **memulai** menempel pada **jadwal** (per kelas + mapel), sehingga satu ujian untuk dua kelas menghasilkan dua kode berbeda.
- Semua angka penegakan (batas pelanggaran, ambang fokus, jeda heartbeat/snapshot, slot token, gap dianggap hilang) **tertanam di kode**.
- Guru harus membuat satu jadwal per kelas untuk kegiatan yang sama.

Akibatnya, perbedaan "ujian vs tugas" hanya bisa dijelaskan lewat pengetahuan orang, bukan lewat mekanisme. Itu yang ingin dihapus.

## Tujuan

1. Satu **kegiatan** menjadi satu-satunya baris yang dikelola guru: tingkat, kelas terpilih, mapel, paket soal, jendela, durasi, jenis token.
2. Perbedaan perilaku antaraktivitas keluar dari **kebijakan (policy) yang tersimpan**, bukan dari kode: token berputar vs tetap, ambang gap, batas pelanggaran, jeda snapshot/heartbeat, durasi.
3. Token **melekat pada kegiatan** (per mapel), berputar 10 menit untuk ujian dan tetap untuk tugas, dan **selalu diminta ulang ketika siswa keluar aplikasi**.
4. Penilaian waktu hilang dilakukan **server** berdasarkan gap heartbeat, bukan berdasarkan cerita aplikasi.
5. Semua setelan punya **preset** yang bisa diubah admin; guru hanya mengubah durasi, jendela, kelas, dan jenis token.

## Bukan tujuan

- Armada milik sekolah / Device Owner (HP siswa bersifat pribadi; jalur itu sudah dihapus).
- Penilaian esai otomatis.
- Perubahan pada layanan `assessment` (rapor) atau `presence`.
- Mode offline penuh; resinkronisasi yang ada tetap dipakai.
- Mengubah mekanisme ruang, kursi, monitor, laporan ruang, atau penilaian.

## Anti-tujuan (gagal walau teknis jalan)

- Mengubah aturan sebuah kegiatan yang **sedang berjalan** tanpa jejak audit.
- Memberi pengecualian per siswa selain jalur pengawas yang sudah ada.
- Memperluas token ke cakupan ruang (satu kode membuka semua mapel).
- Mengunci siswa otomatis karena gap yang ambigu.

## Kendala

- Monorepo `241-apps`: tanpa komentar di kode, changeset wajib, kontrak OpenAPI + klien digenerate (`pnpm openapi:emit`, `pnpm api:generate`), migrasi Prisma per service.
- `241-android`: minSdk 24, komentar hanya bila fungsional.
- Server adalah otoritas; aplikasi tidak boleh punya angka kebijakan sendiri.
- Mesin sesi/ruang/kursi tidak berubah: kursi tetap dicari dari `(eventId, studentId)`, event tetap memegang `requireAndroidApp`, `late_tolerance_minutes`, `min_submit_minutes`.
- HP siswa: tanpa Device Owner, screenshot diblokir `FLAG_SECURE`, copy/paste dimatikan, tombol volume ditelan.

## Pendekatan yang dipertimbangkan

|                 | Cara                                                                                 | Trade-off                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| A               | Tambah `group_id` + `token_mode` di `exam_schedules`                                 | Paling kecil, tetapi grup hanya tempelan: mengubah satu jadwal tidak otomatis mengubah saudaranya, bispro sulit dijelaskan |
| **B (dipilih)** | Tabel **kegiatan** baru sebagai induk; jadwal per kelas dibuat otomatis sebagai anak | Satu baris guru, token menempel di induk, bispro jelas. Biaya: tabel + migrasi + API + UI pemilih kelas                    |
| C               | Memperluas `exam_events` yang ada                                                    | Konsep paling sedikit, tetapi makna "event" berubah (sekarang periode UAS, bukan satu mapel)                               |

Dipilih **B**. `exam_events` tetap ada dan tetap memegang gate aplikasi serta ruang; kegiatan baru menjadi lapisan yang menghubungkan paket soal, mapel, tingkat, kelas terpilih, dan kebijakan.

## Keputusan pemilik (dari brainstorm)

1. Pengawasan **sama** untuk semua aktivitas: terkunci + kamera + hitung pelanggaran.
2. Token **per mapel/kegiatan**, bukan per ruang; berputar 10 menit untuk ujian, **tetap** untuk tugas, dan token tetap **bisa diganti** guru.
3. **Token ruang tidak dipakai** sebagai pintu masuk.
4. Halaman masukkan token **tetap berguna**: keluar aplikasi → wajib token lagi.
5. Cakupan **per tingkat + pemilih kelas** (mis. tingkat 7, centang 7A–7C).
6. Mekanisme ujian dan tugas **satu jalur**; perbedaan hanya lewat kebijakan.
7. Gap: ≤60 detik lanjut diam-diam; 1–5 menit dicatat; >5 menit wajib token; **dihitung pelanggaran mulai kejadian kedua**.
8. Preset milik **admin**; guru mengubah durasi, jendela, kelas, jenis token saja; preset disalin ke kegiatan saat dibuat, dibekukan saat ACTIVE, dan setiap perubahan tercatat.

## Usulan teknis (bukan keputusan pemilik)

- Tabel `exam_activities`: `id`, `semester_id`, `event_id` (opsional, untuk gate + ruang), `grade_id`, `subject_id`, `package_id`, `type` (label), `token_mode` (`ROTATING`|`STATIC`), `preset_id`, `policy` (JSONB, salinan efektif), `starts_at`, `ends_at`, `duration_minutes`, `status` (`DRAFT`|`SCHEDULED`|`ACTIVE`|`CLOSED`), `created_by_id`.
- `exam_schedules.activity_id` (nullable, untuk data lama) — jadwal anak dibuat otomatis satu per kelas terpilih dan tidak diedit langsung.
- Kode akses diturunkan dari `activity.id` (bukan `schedule.id`), sehingga satu kode berlaku untuk semua kelas kegiatan itu. Token ruang berhenti dipakai untuk masuk.
- `exam_policy_presets`: `id`, `name`, `policy` JSONB, `is_default`. Seed 3 preset: `UJIAN_KETAT`, `ULANGAN_KELAS`, `TUGAS`.
- Kebijakan efektif dikirim ke aplikasi pada `POST /me/exams/{id}/sessions` dan `resume`, dan aplikasi memakai nilai itu (batas pelanggaran, ambang fokus, jeda snapshot/heartbeat, ambang gap) dengan cadangan aman bila tidak ada.
- Deteksi gap di server: pakai `last_seen_at` + heartbeat 15 detik; hasilkan event `ABSENCE_GAP` dengan durasi; `>5 menit` → `requires_token_reentry = true`; dihitung pelanggaran mulai kejadian kedua (memakai `ViolationPolicy` di server).
- Monitor & riwayat: tampilkan nama preset, mode token, dan event `ABSENCE_GAP`.

## Nilai awal preset

| Setelan                  | Ujian ketat | Ulangan kelas | Tugas  |
| ------------------------ | ----------- | ------------- | ------ |
| Batas pelanggaran        | 3           | 3             | 3      |
| Ambang fokus hilang      | 10 s        | 10 s          | 10 s   |
| Jeda snapshot            | 15 s        | 15 s          | 30 s   |
| Jeda heartbeat           | 15 s        | 15 s          | 15 s   |
| Gap dicatat mulai        | 60 s        | 60 s          | 5 mnt  |
| Gap wajib token          | 5 mnt       | 5 mnt         | 30 mnt |
| Gap dihitung pelanggaran | ke-2        | ke-2          | ke-3   |
| Slot token               | 600 s       | 600 s         | statis |
| Durasi umum              | 90–120 mnt  | 45–60 mnt     | 60 mnt |

## Yang diserahkan ke pelaksana

- Nama tabel/kolom persis, bentuk DTO, dan pemetaan kontrak.
- Cara UI menampilkan pemilih kelas (satu halaman vs dialog) selama guru menyelesaikan satu kegiatan dalam satu alur.
- Detail migrasi data lama (jadwal tanpa `activity_id` tetap berjalan seperti sekarang).
- Penempatan halaman "lanjutan" untuk admin.
