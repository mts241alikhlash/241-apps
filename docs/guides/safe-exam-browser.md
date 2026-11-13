# Safe Exam Browser untuk ujian web

Ujian lewat browser hanya boleh dibuka di Safe Exam Browser (SEB) dengan konfigurasi sekolah. Istiqra (Android) tidak berubah. Keputusan dan batasannya ada di [ADR 0011](../adr/0011-web-exams-run-in-safe-exam-browser.md).

## Membuat berkas `.seb`

1. Pasang **SEB Config Tool** (Windows atau macOS).
2. Buat konfigurasi baru dengan pengaturan berikut:
   - **Start URL**: `https://<exam-web>/my-exams`
   - **Quit URL**: sama persis dengan nilai `VITE_SEB_QUIT_URL` di build `exam-web`. SEB menutup diri saat URL ini dimuat, jadi nilainya harus cocok.
   - **Kata sandi keluar**: pilih, simpan di tempat aman untuk pengawas.
   - **Web view**: `browserWindowWebView` = modern.
   - **URL filter**: nonaktif. Jangan memblokir domain, karena halaman ujian memanggil API di host lain.
3. Simpan sebagai `.seb`.
4. Di SEB Config Tool, buka **Configuration Key** dan salin nilainya (64 karakter heksadesimal).

## Mengunggah konfigurasi

1. Masuk sebagai admin dengan izin `exam-schedules.manage-all`, buka **Pengaturan → Safe Exam Browser** (`/settings/seb`).
2. Tekan **Tambah**, isi nama, tempel **Config Key**, lalu pilih berkas `.seb` (maksimal 1 MB).
3. Aktifkan konfigurasi. Sakelar aktif menentukan konfigurasi yang diterima server.
4. Tekan **Uji konfigurasi**. Buka halaman ini dari dalam SEB; tombol hanya bekerja di dalam SEB. Hasil **cocok** dengan nama konfigurasi berarti siap dipakai. Hasil **tidak cocok** berarti Config Key atau berkas tidak sama: ulangi langkah 2.

## Mengganti konfigurasi

1. Unggah konfigurasi baru dan aktifkan.
2. Bagikan berkas baru ke siswa. Tautan unduh publik memakai skema `sebs://` dengan path `/public/seb-configs/<id>/file`; siswa membukanya dari halaman **Ujian Saya** di luar SEB atau dari tautan yang dibagikan.
3. Nonaktifkan konfigurasi lama **setelah** ujian selesai. Selama keduanya aktif, siswa dengan berkas lama tetap bisa masuk.

Konfigurasi lama tidak dihapus otomatis; hapus setelah tidak dipakai lagi.

## Versi SEB minimum

| Platform | Versi minimum |
| -------- | ------------- |
| Windows  | 3.4           |
| macOS    | 3.7           |
| iOS      | 3.7           |

Versi di bawah ini tidak menyediakan API JavaScript. Halaman akan menampilkan "Perbarui Safe Exam Browser".

## Batasan

Config Key bisa diturunkan dari berkas `.seb` yang dipegang siswa, sehingga permintaan dari browser biasa bisa dipalsukan. Ini penghalang, bukan jaminan. Pengawas ruangan tetap wajib mengawasi.
