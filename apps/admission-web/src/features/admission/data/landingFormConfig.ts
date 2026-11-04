import type { LandingImagePurpose, LandingSectionKey } from '../types/landing'
import { landingDefaults } from './landingDefaults'

export type LandingField =
  | {
      kind: 'text'
      name: string
      label: string
      max: number
      multiline?: boolean
      optional?: boolean
    }
  | {
      kind: 'lines'
      name: string
      label: string
      maxLines: number
      max: number
    }
  | { kind: 'tags'; name: string; label: string; maxItems: number; max: number }
  | {
      kind: 'image'
      name: string
      label: string
      purpose: LandingImagePurpose
      optional?: boolean
      builtIn?: string
    }
  | { kind: 'group'; name: string; label: string; fields: LandingField[] }
  | {
      kind: 'list'
      name: string
      label: string
      itemLabel: string
      itemNoun: string
      min: number
      max: number
      titleField: string
      fields: LandingField[]
      blank: () => Record<string, unknown>
      itemCheck?: (
        item: Record<string, unknown>,
      ) => { path: string; message: string } | null
    }

export interface LandingSectionConfig {
  key: LandingSectionKey
  label: string
  hint: string
  fields: LandingField[]
}

const text = (
  name: string,
  label: string,
  max: number,
  extra: { multiline?: boolean; optional?: boolean } = {},
): LandingField => ({ kind: 'text', name, label, max, ...extra })
const lines = (
  name: string,
  label: string,
  maxLines: number,
  max: number,
): LandingField => ({ kind: 'lines', name, label, maxLines, max })
const image = (
  name: string,
  label: string,
  purpose: LandingImagePurpose,
  extra: { optional?: boolean; builtIn?: string } = {},
): LandingField => ({ kind: 'image', name, label, purpose, ...extra })

const SAMPLE_STORY_TEXTS = new Set(
  landingDefaults.stories.items
    .filter((story) => story.placeholder)
    .flatMap((story) => [story.name, story.quote]),
)

export const LANDING_SECTIONS: LandingSectionConfig[] = [
  {
    key: 'hero',
    label: 'Bagian atas',
    hint: 'Judul, tombol, dan dua foto yang pertama dilihat pengunjung.',
    fields: [
      text('eyebrow', 'Teks kecil di atas judul', 100),
      lines('titleLines', 'Judul (satu baris per kolom)', 3, 60),
      text('description', 'Deskripsi', 300, { multiline: true }),
      text('registerLabel', 'Tombol pendaftaran', 40),
      text('guideLabel', 'Tautan cara mendaftar', 40),
      text('exploreLabel', 'Tautan mengenal sekolah', 80),
      lines('photoNoteLines', 'Catatan di bawah foto', 3, 40),
      {
        kind: 'group',
        name: 'schoolPhoto',
        label: 'Foto besar',
        fields: [
          image('image', 'Foto', 'photo', { builtIn: '/hero/baiat.webp' }),
          text('alt', 'Deskripsi foto (untuk pembaca layar)', 200),
          text('caption', 'Keterangan foto', 120),
        ],
      },
      {
        kind: 'group',
        name: 'studyPhoto',
        label: 'Foto kecil',
        fields: [
          image('image', 'Foto', 'photo', { builtIn: '/hero/tahfidz.webp' }),
          text('alt', 'Deskripsi foto (untuk pembaca layar)', 200),
          text('title', 'Judul foto', 60),
          text('tag', 'Label kecil', 40),
        ],
      },
    ],
  },
  {
    key: 'life',
    label: 'Mengenal sekolah',
    hint: 'Teks pengantar dan galeri foto kegiatan yang bisa digulir.',
    fields: [
      text('label', 'Teks kecil di atas judul', 80),
      lines('titleLines', 'Judul (satu baris per kolom)', 3, 40),
      text('description', 'Deskripsi', 300, { multiline: true }),
      text('footnote', 'Kalimat penutup', 100),
      text('linkLabel', 'Label tautan jadwal', 40),
      {
        kind: 'list',
        name: 'photos',
        label: 'Foto kegiatan',
        itemLabel: 'Foto',
        itemNoun: 'foto',
        min: 1,
        max: 12,
        titleField: 'title',
        fields: [
          image('image', 'Foto', 'photo'),
          text('alt', 'Deskripsi foto (untuk pembaca layar)', 200),
          text('title', 'Judul', 60),
          text('caption', 'Keterangan', 160, { multiline: true }),
        ],
        blank: () => ({ image: null, alt: '', title: '', caption: '' }),
      },
    ],
  },
  {
    key: 'info',
    label: 'Informasi PPDB',
    hint: 'Poster informasi pendaftaran, ukuran potret 1080 × 1920. Kosongkan daftar untuk menyembunyikan bagian ini.',
    fields: [
      text('title', 'Judul', 80),
      text('description', 'Deskripsi', 300, { multiline: true }),
      {
        kind: 'list',
        name: 'posters',
        label: 'Poster',
        itemLabel: 'Poster',
        itemNoun: 'poster',
        min: 0,
        max: 10,
        titleField: 'alt',
        fields: [
          image('image', 'Poster (potret 9:16)', 'poster'),
          text('alt', 'Deskripsi poster (untuk pembaca layar)', 200),
          text('caption', 'Keterangan (opsional)', 120, { optional: true }),
        ],
        blank: () => ({ image: null, alt: '', caption: '' }),
      },
    ],
  },
  {
    key: 'steps',
    label: 'Alur pendaftaran',
    hint: 'Tiga sampai lima langkah. Desain menyesuaikan jumlah kolomnya.',
    fields: [
      text('title', 'Judul', 80),
      text('description', 'Deskripsi', 300, { multiline: true }),
      {
        kind: 'list',
        name: 'items',
        label: 'Langkah',
        itemLabel: 'Langkah',
        itemNoun: 'langkah',
        min: 3,
        max: 5,
        titleField: 'title',
        fields: [
          text('title', 'Judul langkah', 60),
          text('description', 'Penjelasan', 200, { multiline: true }),
        ],
        blank: () => ({ title: '', description: '' }),
      },
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab',
    hint: 'Pertanyaan yang sering diajukan calon santri dan orang tua.',
    fields: [
      text('title', 'Judul', 80),
      text('description', 'Deskripsi', 200, { multiline: true }),
      {
        kind: 'list',
        name: 'items',
        label: 'Pertanyaan',
        itemLabel: 'Pertanyaan',
        itemNoun: 'pertanyaan',
        min: 1,
        max: 15,
        titleField: 'question',
        fields: [
          text('question', 'Pertanyaan', 150),
          text('answer', 'Jawaban', 600, { multiline: true }),
        ],
        blank: () => ({ question: '', answer: '' }),
      },
    ],
  },
  {
    key: 'stories',
    label: 'Cerita keluarga',
    hint: 'Kisah alumni dan orang tua. Kosongkan daftar untuk menyembunyikan bagian ini.',
    fields: [
      text('label', 'Teks kecil di atas judul', 80),
      text('title', 'Judul', 80),
      text('description', 'Deskripsi', 250, { multiline: true }),
      {
        kind: 'list',
        name: 'items',
        label: 'Cerita',
        itemLabel: 'Cerita',
        itemNoun: 'cerita',
        min: 0,
        max: 8,
        titleField: 'name',
        fields: [
          text('kind', 'Jenis cerita', 40),
          text('quote', 'Kutipan', 500, { multiline: true }),
          text('name', 'Nama', 60),
          text('position', 'Jabatan atau pekerjaan (opsional)', 80, {
            optional: true,
          }),
          { kind: 'tags', name: 'tags', label: 'Label', maxItems: 3, max: 60 },
          image('photo', 'Foto (opsional)', 'photo', { optional: true }),
        ],
        itemCheck: (item) =>
          SAMPLE_STORY_TEXTS.has(String(item.name)) ||
          SAMPLE_STORY_TEXTS.has(String(item.quote))
            ? {
                path: 'name',
                message:
                  'Ini masih cerita contoh. Ganti dengan cerita nyata atau hapus.',
              }
            : null,
        blank: () => ({
          kind: '',
          quote: '',
          name: '',
          position: '',
          tags: [],
          photo: null,
        }),
      },
    ],
  },
  {
    key: 'closing',
    label: 'Penutup',
    hint: 'Ajakan terakhir di bagian bawah halaman.',
    fields: [
      text('title', 'Judul', 100),
      text('description', 'Deskripsi', 250, { multiline: true }),
      text('registerLabel', 'Tombol pendaftaran', 40),
      text('requirementsLabel', 'Tautan persyaratan', 60),
      {
        kind: 'group',
        name: 'photo',
        label: 'Foto',
        fields: [
          image('image', 'Foto', 'photo', {
            builtIn: '/hero/rapat-orangtua.webp',
          }),
          text('alt', 'Deskripsi foto (untuk pembaca layar)', 200),
        ],
      },
    ],
  },
]
