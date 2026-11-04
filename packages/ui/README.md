# @mts241alikhlash/ui

Canonical source from the latest `admission-web/packages/ui`. App-specific
feature code stays in each web repository.

## Tema dan skala Mira

`src/style.css` tiap app cukup berisi:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@mts241alikhlash/ui/theme.css';

@source '../node_modules/@mts241alikhlash/ui/src';
```

plus `@source` untuk `packages/platform` dan `web-shared` dan aturan khusus app. `theme.css` memuat warna (primary mengikuti logo), skala radius, dan token ukuran kontrol: `--control-h-xs|sm|md|lg` (20, 24, 28, 32 px; di bawah `md` 24, 32, 36, 40 px), `--text-control` dan `--icon-control`. Komponen membaca token itu dengan nilai Mira sebagai cadangan, jadi mengganti skala cukup dengan mengubah satu file. Naikkan versi `ui` dan ganti `style.css` dalam satu perubahan app yang sama: tanpa `theme.css` kontrol di ponsel tetap 28 px. Tinggi kontrol form dan tombol di halaman tidak perlu ditimpa lagi dengan `h-9` atau `h-10`.

## Card, tab dan aksi tabel

| Bagian | Aturan |
| --- | --- |
| `Card` | `gap="none"` menghapus celah bawaan; `variant="flat"` untuk card di dalam card |
| `CardHeader` | `standard`: tinggi minimum 52 px, garis bawah, latar `bg-muted/30`, aksi utama di kanan |
| `CardFooter` | `standard`: aksi form rata kanan, garis atas, latar `bg-muted/30` sama dengan header |
| `CardTitle` | `size="md"` 16 px untuk card, `size="lg"` 20 px untuk judul halaman |
| `CardContent` | `variant="standard"` untuk isi, `variant="flush"` untuk tabel |
| `CardTabs` | tab bergaris dalam card (bar tab berlatar sama dengan header); `start="field"` bila isi pertama field (20 px), `start="block"` bila lain (16 px) |
| Aksi baris | satu aksi: tombol langsung; dua aksi atau lebih: `ActionCell` (aksi khusus lewat prop `items`); tanpa menu "Lihat" untuk berkas yang sudah tertaut di baris |
| Nama berkas | `AttachmentName`, tanpa `truncate` atau `max-w`; nama bawaan dari `formatAttachmentName` di `@mts241alikhlash/web-shared` |
| Linimasa | `HorizontalStepper` |

`check-card-overrides <dir>` menampilkan `Card`, `CardHeader`, `CardFooter` dan `CardTitle` yang masih menimpa `gap-0`, `py-0`, ukuran font, atau (khusus header dan footer) warna latar lewat `class`.

## DataTable: kolom yang menempel

`pinnedColumns` (`{ left?: string[]; right?: string[] }`) menempelkan kolom ke tepi tabel saat digulir. Tanpa prop ini hanya kolom `actions` menempel di kanan. Dengan prop ini setiap kolom yang menempel mengambil lebar dari `size` pada `ColumnDef`, jadi isi `size` untuk kolom `select`, `status`, dan `actions`.
