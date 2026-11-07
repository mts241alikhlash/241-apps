# Bispro kegiatan ujian & tugas

Dokumen ini menjelaskan cara kerja kegiatan di aplikasi ujian, siapa yang mengatur apa, dan langkah operasionalnya. Acuannya kode `exam-service` (kegiatan, jadwal, sesi) dan aplikasi siswa.

## 1. Apa itu "kegiatan"

**Kegiatan** adalah satu baris yang mewakili satu ujian atau satu tugas untuk satu **tingkat**, dengan kelas-kelas yang dipilih. Sistem membuatkan **jadwal per kelas** secara otomatis dari kegiatan itu — guru tidak membuat jadwal satu per satu.

Isi kegiatan: tingkat, kelas yang ikut, mapel, paket soal, jendela waktu, durasi, jenis token, dan satu **preset kebijakan**.

## 2. Preset dan artinya

| Setelan                                        | Ujian ketat (UTS/UAS) | Ulangan kelas      | Tugas/PR                  |
| ---------------------------------------------- | --------------------- | ------------------ | ------------------------- |
| Batas pelanggaran sebelum dikumpulkan otomatis | 3                     | 3                  | 3                         |
| Ambang "fokus hilang"                          | 10 detik              | 10 detik           | 10 detik                  |
| Jeda foto pengawas                             | 15 detik              | 15 detik           | 30 detik                  |
| Detak kehadiran                                | 15 detik              | 15 detik           | 15 detik                  |
| Hilang dicatat mulai                           | 60 detik              | 60 detik           | 5 menit                   |
| Hilang wajib token mulai                       | 5 menit               | 5 menit            | 30 menit                  |
| Hilang dihitung pelanggaran                    | kejadian ke-2         | kejadian ke-2      | kejadian ke-3             |
| Token                                          | berputar 600 detik    | berputar 600 detik | **tetap** sepanjang tugas |

Angka di atas adalah nilai awal preset. **Admin** boleh mengubahnya; **guru** tidak.

## 3. Token

- Satu kode per **kegiatan** (mapel), dipakai semua kelas yang ikut.
- Ujian: kode berganti setiap 10 menit; pengawas membacakan kode yang sedang berlaku. Kode dari 10 menit sebelumnya masih diterima (toleransi 90 detik).
- Tugas: kode **tetap** selama masa tugas, diumumkan sekali.
- Kode bocor → admin menjalankan **ganti token**; kode lama langsung tidak sah.
- **Keluar aplikasi = wajib memasukkan kode lagi.** Aplikasi mati sendiri, HP restart, atau jaringan putus bukan pelanggaran dan tidak meminta kode — tapi waktunya tetap berjalan.
- Hilang lebih dari batas "wajib token" (5 menit untuk ujian) membuat siswa harus meminta kode ke pengawas, dan kejadiannya tercatat.

## 4. Siapa boleh mengubah apa

|                                                                    | Guru              | Admin |
| ------------------------------------------------------------------ | ----------------- | ----- |
| Membuat kegiatan (tingkat + pilih kelas)                           | Ya                | Ya    |
| Memilih preset                                                     | Ya                | Ya    |
| Durasi, jendela/tenggat, jenis token                               | Ya                | Ya    |
| Angka penegakan (batas pelanggaran, ambang fokus, gap, slot token) | Tidak             | Ya    |
| Ganti token kegiatan                                               | Tidak             | Ya    |
| Tambah waktu / lepas perangkat / buka ulang sesi                   | Pengawas di ruang | Ya    |

Preset hanya **cetakan**: saat kegiatan dibuat, nilainya disalin ke kegiatan itu. Mengubah preset berlaku untuk kegiatan **baru**; kegiatan yang sedang berjalan tidak ikut berubah (server menolak perubahan kebijakan pada kegiatan ACTIVE).

## 5. Langkah guru

1. Buat kegiatan → pilih **tingkat** → centang **kelas** yang ikut.
2. Pilih mapel + paket soal, pilih preset, atur durasi dan jendela.
3. Pilih jenis token: berputar (ujian) atau tetap (tugas).
4. Simpan → sistem membuat jadwal per kelas.
5. Umumkan kode (ujian: baca kode berjalan; tugas: kode tetap sekali).

## 6. Langkah pengawas saat ujian

1. Pastikan tiap HP lolos layar **kesiapan perangkat** (DND aktif, penyematan layar, optimisasi baterai dimatikan). Monitor menandai perangkat yang belum siap.
2. Bacakan kode kegiatan yang sedang berlaku.
3. Pantau monitor: status sesi, foto pengawas, dan riwayat kejadian (default hanya menampilkan pelanggaran yang dihitung).
4. Bila siswa tertinggal: **tambah waktu**. Bila HP rusak/ganti: **lepas perangkat** (siswa lalu memasukkan kode lagi).
5. Panggilan masuk → ujian otomatis dijeda, snapshot berhenti, dan waktu dikembalikan saat panggilan selesai. Kejadiannya tampil di riwayat, bukan pelanggaran.

## 7. Setelah ujian

1. Soal objektif dinilai otomatis; esai dinilai manual di halaman penilaian.
2. Publikasikan skor setelah semua sesi dinilai.

## 8. Kasus yang sering ditanya

- **Siswa hilang 10 menit lalu kembali:** waktu tetap berjalan, kejadian `Hilang sementara` tercatat; karena lewat batas, siswa harus memasukkan kode lagi. Kejadian ke-2 baru dihitung pelanggaran.
- **HP siswa mati lalu dinyalakan:** lanjut tanpa kode; waktu tetap berjalan.
- **Siswa memasang ulang aplikasi:** sesi dikenali dari perangkat + kode terkini; jawaban tersimpan di server.
- **Ujian dua mapel di satu ruang:** masing-masing mapel punya kode sendiri; pengawas membacakan sesuai jadwal yang sedang berjalan.
- **Tugas dikerjakan di rumah:** token tetap, jendela lebar, pengawasan (kunci + kamera) tetap aktif **selama sesi dibuka** — kamera tidak menyala di luar sesi.
