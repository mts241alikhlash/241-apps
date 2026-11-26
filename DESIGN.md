# Design Direction — 241 Apps

> School Operating Platform for MTs Persis 241 Al-Ikhlash

Dial: ENERGY 1 / RHYTHM 1 / MOTION 1

---

## 1. Identity & Character

- **Institution**: MTs Persis 241 Al-Ikhlash (Islamic Junior High School).
- **Domain**: School administration, examination (CBT), academic records, grading, and portals.
- **Audience**: Teachers, administrative staff, proctors, students, and parents.
- **Voice & Tone**: Dignified, calm, trustworthy, and clear. Indonesian for UI copy; direct instructions without AI buzzwords or marketing fluff.

---

## 2. Dials & Liveliness

- **ENERGY 1 (Calm)**:
  - Clean institutional productivity tool (similar to GOV.UK / Linear utility).
  - No decorative gradients, glowing cards, or visual clutter.
  - Color is reserved for intentional actions (Navy primary) and verified statuses (Destructive red, Brand Gold accent).
- **RHYTHM 1 (Uniform & Structured)**:
  - Predictable, dense, consistent layout across all 9 web applications.
  - Standard card container encapsulating list and data tables.
  - Floating topbar and collapsible icon sidebar.
- **MOTION 1 (Restrained)**:
  - Instant state transitions with accessible feedback.
  - Micro-interactions on hover and keyboard focus only.
  - Respect `prefers-reduced-motion` at all times; no gratuitous scroll animations.

---

## 3. Color Palette

- **Primary (`oklch(0.37 0.105 261)`)**: Deep Pesantren Navy. Used for primary CTA buttons, active selection rings, and brand headers.
- **Brand Accent (`oklch(0.694 0.072 97)`)**: Warm Madrasah Gold. Used sparingly as an accent touch, brand highlights, or status accents; never as a heavy solid background across full-width headers.
- **Canvas (`oklch(0.96 0.005 260)`)**: Soft light neutral page canvas.
- **Surface / Card (`oklch(1 0 0)`)**: Pure white card surface for content clarity and high contrast.
- **Dividers & Borders (`oklch(0.928 0.006 264.531)`)**: Clean 1px structural borders defining card boundaries and table rows.
- **CardHeader**: Clean white (`bg-card`) with 1px bottom border (`border-b border-border`) to keep reading focus squarely on table data.
  - Verified Contrast Ratios (WCAG AA/AAA):
    - Title/Foreground (`#030712`) on Card Header (`#ffffff`): **20.13:1** (Passes AAA).
    - Subtitle/Muted Foreground (`#6a7282`) on Card Header (`#ffffff`): **4.84:1** (Passes AA).
    - Primary Button (`#f9fafb` on `#1d3d76`): **10.14:1** (Passes AAA).

---

## 4. Typography

- **Primary Typeface**: `DM Sans`.
- **Numbers & Scores**: `tabular-nums` for alignment in tables, schedules, and marks.
- **Weights**:
  - 400: Body text, description, table cells.
  - 500: Form labels, controls, table headers.
  - 600: Page titles, card titles, section headings.
  - 700: Forbidden (avoid heavy shouts).

---

## 5. Craftsmanship & Standards

- Interactive elements must be functional or removed (no dead controls).
- Every text element must meet WCAG AA contrast (>= 4.5:1 for normal text).
- Controls scale via design tokens (`--control-h-*`, `--text-control`, `--icon-control`).
- All actions are accessible via keyboard navigation with visible focus indicators.

---

## 6. Iconography & Purpose (R-04)

Setiap ikon dibatasi untuk fungsi utilitas domain yang spesifik; dilarang menggunakan ikon hiasan AI (sparkle, magic, lightning, robot):

- **`Settings2`** (Trigger `ActionCell`): Menggantikan titik tiga generik untuk menandakan menu aksi/pengaturan baris data secara tegas.
- **`Plus`** (Tombol utama `CardHeader`): Menegaskan aksi penambahan data baru di setiap modul tabel.
- **`Eye`** (Menu `ActionCell`): Mengarahkan ke pratinjau detail read-only.
- **`Edit2`** (Menu `ActionCell`): Membuka form penyuntingan data.
- **`Trash2`** (Menu `ActionCell`): Menandai aksi penghapusan permanen (destructive) dengan konfirmasi.
- **`UserCheck`** (Menu `ActionCell`): Menandai penetapan atau verifikasi pengawas/peserta ujian.

---

## 7. Layout Archetypes & Card Hierarchy (R-14)

Penggunaan komponen `Card` diadaptasikan ke 4 arketipe hierarki konten, bukan sekadar cetakan seragam:

1. **Arketipe A — Tabel Data Penuh (List Views)**:
   - Contoh: `EventListView`, `PackageListView`, `ScheduleListView`.
   - Pola: `Card` flex penuh (`flex min-h-0 flex-1 flex-col overflow-hidden`), `CardHeader` memuat judul + tombol "Tambah" di kanan, isi berupa `DataTable` dengan scroll independen dan pagination di footer.
2. **Arketipe B — Aksi Terfokus & Ringkas (Auth / Token Views)**:
   - Contoh: `ExamTokenView`.
   - Pola: Kartu terpusat (`max-w-md`), tanpa tabel, form single-column bervolume ringkas dengan `Skeleton` saat memuat.
3. **Arketipe C — Komposit & Monitoring (Detail / Inspection Views)**:
   - Contoh: `EventDetailView`, `PackageDetailView`, `RoomMonitorDetailView`.
   - Pola: Header multi-metadata dengan badges status, ringkasan metrik real-time, dan sub-tabel atau kartu relasi.
4. **Arketipe D — Lembar Cetak Dokumen (Print Views)**:
   - Contoh: `RoomPrintView`, `RoomReportPrintView`.
   - Pola: Pratinjau kartu di layar dengan tombol print, yang secara otomatis melepas border/card saat `@media print` untuk output kertas bersih.

---

## 8. CardHeader Intentionality Log (R-31)

Setiap keputusan desain pada `CardHeader variant="muted"` memiliki alasan satu baris:

- **Tinggi `min-h-12` (48px) dan padding `py-2 px-4`**: Memenuhi target sentuh tombol aksi minimal 44px (WCAG/R-03) dengan spasi vertikal yang lapang di samping judul.
- **Ukuran font judul 14px (`text-sm font-semibold`)**: Mengimbangi ketinggian header 48px agar hierarki judul tabel tetap seimbang dan tegas terhadap kontrol tombol.
- **Tombol aksi di sisi kanan header**: Memisahkan kontrol pembuatan data tingkat halaman dari area toolbar pencarian dan filter di dalam `DataTable`.
- **Latar putih bersih (`bg-card`) dengan pembatas 1px (`border-b border-border`)**: Memberikan kontras teks optimal (20.1:1 AAA) tanpa menimbulkan kelelahan mata saat mengolah tabel berjam-jam.
- **Trunkasi judul `min-w-0 truncate`**: Mencegah teks judul panjang menabrak tombol aksi atau memicu luapan horizontal pada layar ponsel (< 640px).
