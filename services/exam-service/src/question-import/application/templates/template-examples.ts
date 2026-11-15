export const TEMPLATE_IDENTITY: [string, string | number][] = [
  ['Versi Template', 2],
  ['Nama Guru', 'Nama guru'],
  ['NIK', 'NIK 16 digit'],
  ['Mapel', 'Nama mapel'],
  ['Tingkat', '7'],
]

export const QUESTION_HEADERS = [
  'No',
  'Jenis',
  'Soal',
  'A',
  'B',
  'C',
  'D',
  'E',
  'Kunci',
  'Abaikan harakat',
  'Poin',
]

export interface TemplateQuestion {
  no: number
  jenis: string
  soal: string
  choices: (string | null)[]
  kunci: string
  abaikanHarakat: string | null
  poin: number
}

export const TEMPLATE_QUESTIONS: TemplateQuestion[] = [
  {
    no: 1,
    jenis: 'PG',
    soal: 'Berapa hasil $2+3$?',
    choices: ['4', '5', '6', '7', null],
    kunci: 'B',
    abaikanHarakat: null,
    poin: 1,
  },
  {
    no: 2,
    jenis: 'PG Kompleks',
    soal: 'Pilih bilangan genap.',
    choices: ['2', '3', '4', '5', null],
    kunci: 'A,C',
    abaikanHarakat: null,
    poin: 2,
  },
  {
    no: 3,
    jenis: 'Benar/Salah',
    soal: 'Bumi berbentuk bulat.',
    choices: [null, null, null, null, null],
    kunci: 'Benar',
    abaikanHarakat: null,
    poin: 1,
  },
  {
    no: 4,
    jenis: 'Isian',
    soal: 'Ibu kota Indonesia adalah ...',
    choices: [null, null, null, null, null],
    kunci: 'Jakarta|DKI Jakarta',
    abaikanHarakat: 'Tidak',
    poin: 1,
  },
  {
    no: 5,
    jenis: 'Uraian',
    soal: 'Jelaskan arti gotong royong.',
    choices: [null, null, null, null, null],
    kunci: 'Kerja sama dan saling membantu',
    abaikanHarakat: null,
    poin: 5,
  },
]

export const TEMPLATE_NOTES = [
  'Tulis Mapel persis seperti tertulis pada halaman paket.',
  'Tingkat diisi 7, 8, atau 9.',
  'NIK diisi 16 digit NIK yang dipakai untuk masuk ke aplikasi.',
  'Versi Template harus tetap 2.',
  'Satu baris satu soal. Jangan ubah judul kolom pada lembar Soal.',
  'Jenis: PG, PG Kompleks, Benar/Salah, Isian, atau Uraian.',
  'Kunci PG: satu huruf (B). PG Kompleks: beberapa huruf (A,C). Benar/Salah: Benar atau Salah.',
  'Kunci Isian: jawaban benar dipisah tanda | (Jakarta|DKI Jakarta). Kunci Uraian: pedoman penilaian (boleh kosong).',
  'Rumus matematika ditulis di antara tanda dolar, misalnya $x^2$.',
  'Abaikan harakat: Ya jika harakat Arab tidak dihitung saat menilai Isian.',
  'Gambar tidak bisa dimasukkan lewat Excel. Tambahkan gambar lewat editor soal atau berkas Word.',
  'Semua soal masuk sebagai draf dan perlu diajukan serta disetujui.',
]
