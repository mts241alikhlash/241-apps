import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  MAX_DOWNLOAD_BYTES,
  admissionErrorMessage,
  documentSummaryText,
  formatDateRange,
  formatFileSize,
  imageFileError,
  isWaveClosed,
  jakartaToday,
  pdfFileError,
  presentValue,
  standardDocumentFileName,
} from './utils'

it('keeps zero but names absent and placeholder values', () => {
  expect([null, undefined, '', '   ', '-'].map(presentValue)).toEqual(
    Array(5).fill('Belum diisi'),
  )
  expect(presentValue(0)).toBe('0')
  expect(presentValue('Jalan sangat panjang tanpa spasi')).toBe(
    'Jalan sangat panjang tanpa spasi',
  )
})

function axiosError(status: number, message: unknown) {
  return new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { message },
  })
}

it('shows what the admission service says about a refused request', () => {
  expect(
    admissionErrorMessage(
      axiosError(400, 'Data belum lengkap: NIK, Agama'),
      'Gagal mengirim formulir.',
    ),
  ).toBe('Data belum lengkap: NIK, Agama')
  expect(
    admissionErrorMessage(
      axiosError(409, 'Gelombang pendaftaran sudah ditutup'),
      'Gagal mengirim formulir.',
    ),
  ).toBe('Gelombang pendaftaran sudah ditutup')
})

it('falls back for field validation lists and server failures', () => {
  expect(
    admissionErrorMessage(
      axiosError(400, ['phone must be an Indonesian mobile number']),
      'Gagal menyimpan.',
    ),
  ).toBe('Gagal menyimpan.')
  expect(
    admissionErrorMessage(axiosError(500, 'boom'), 'Gagal menyimpan.'),
  ).not.toBe('boom')
})

it('closes a wave the day after its end date, in Jakarta time', () => {
  const lastDay = new Date('2026-02-01T16:59:00Z')
  const nextDay = new Date('2026-02-01T17:00:00Z')

  expect(isWaveClosed('2026-02-01', lastDay)).toBe(false)
  expect(isWaveClosed('2026-02-01T00:00:00.000Z', nextDay)).toBe(true)
  expect(isWaveClosed(null, nextDay)).toBe(false)
})

it('shortens a date range to what actually differs', () => {
  expect(formatDateRange('2026-10-01T12:00:00', '2026-10-31T12:00:00')).toBe(
    '1–31 Oktober 2026',
  )
  expect(formatDateRange('2026-10-01T12:00:00', '2026-11-15T12:00:00')).toBe(
    '1 Oktober – 15 November 2026',
  )
  expect(formatDateRange('2026-12-20T12:00:00', '2027-01-10T12:00:00')).toBe(
    '20 Desember 2026 – 10 Januari 2027',
  )
})

it('reads today in Jakarta, not UTC', () => {
  expect(jakartaToday(new Date('2026-10-07T20:00:00Z'))).toBe('2026-10-08')
})

describe('documentSummaryText', () => {
  it('lists only the counts that are not zero', () => {
    expect(
      documentSummaryText({
        approved: 3,
        rejected: 1,
        pending: 0,
        missing: 2,
        total: 6,
      }),
    ).toBe('3 disetujui · 1 ditolak · 2 belum diunggah dari 6 berkas')
  })

  it('says so when no document is required', () => {
    expect(
      documentSummaryText({
        approved: 0,
        rejected: 0,
        pending: 0,
        missing: 0,
        total: 0,
      }),
    ).toBe('Tidak ada berkas')
  })

  it('reads well when everything is still waiting', () => {
    expect(
      documentSummaryText({
        approved: 0,
        rejected: 0,
        pending: 4,
        missing: 0,
        total: 4,
      }),
    ).toBe('4 menunggu dari 4 berkas')
  })
})

describe('standardDocumentFileName', () => {
  it('formats filename with document type name, applicant name, and original extension', () => {
    expect(
      standardDocumentFileName(
        'Kartu Keluarga',
        'Ahmad Fauzi',
        'WhatsApp-IMG-2026.pdf',
      ),
    ).toBe('Kartu Keluarga - Ahmad Fauzi.pdf')
    expect(
      standardDocumentFileName(
        'Akta Kelahiran',
        'Ahmad Fauzi',
        'scan_akta.jpeg',
      ),
    ).toBe('Akta Kelahiran - Ahmad Fauzi.jpeg')
  })

  it('handles missing applicant name or document type name gracefully', () => {
    expect(standardDocumentFileName(null, null, 'file.pdf')).toBe('file.pdf')
    expect(standardDocumentFileName('Kartu Keluarga', null, 'file.pdf')).toBe(
      'Kartu Keluarga.pdf',
    )
    expect(
      standardDocumentFileName('Kartu Keluarga', 'Ahmad Fauzi', null),
    ).toBe('-')
  })
})

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [900, '900 B'],
    [1024, '1 KB'],
    [204800, '200 KB'],
    [1048576, '1 MB'],
    [1572864, '1,5 MB'],
    [5242880, '5 MB'],
  ])('formats %i bytes as %s', (bytes, text) => {
    expect(formatFileSize(bytes)).toBe(text)
  })
})

describe('pdfFileError', () => {
  const file = (name: string, type: string, size: number) => {
    const picked = new File(['x'], name, { type })
    Object.defineProperty(picked, 'size', { value: size })
    return picked
  }

  it('accepts a PDF up to the limit', () => {
    expect(pdfFileError(file('a.pdf', 'application/pdf', 10))).toBeNull()
    expect(
      pdfFileError(file('a.pdf', 'application/pdf', MAX_DOWNLOAD_BYTES)),
    ).toBeNull()
  })

  it('accepts a PDF whose browser type is empty', () => {
    expect(pdfFileError(file('A.PDF', '', 10))).toBeNull()
  })

  it('refuses other types, empty files and files over the limit', () => {
    expect(pdfFileError(file('a.docx', 'application/msword', 10))).toBe(
      'Berkas harus PDF.',
    )
    expect(pdfFileError(file('a.pdf', 'application/pdf', 0))).toBe(
      'Berkas kosong.',
    )
    expect(
      pdfFileError(file('a.pdf', 'application/pdf', MAX_DOWNLOAD_BYTES + 1)),
    ).toBe('Ukuran berkas maksimal 5 MB.')
  })
})

describe('imageFileError', () => {
  const file = (name: string, type: string, size: number) => {
    const picked = new File(['x'], name, { type })
    Object.defineProperty(picked, 'size', { value: size })
    return picked
  }

  it('accepts JPG, PNG and WebP up to the limit', () => {
    expect(imageFileError(file('a.jpg', 'image/jpeg', 10))).toBeNull()
    expect(imageFileError(file('a.png', 'image/png', 10))).toBeNull()
    expect(imageFileError(file('A.WEBP', '', MAX_DOWNLOAD_BYTES))).toBeNull()
  })

  it('refuses other types, empty files and files over the limit', () => {
    expect(imageFileError(file('a.gif', 'image/gif', 10))).toBe(
      'Gambar harus JPG, PNG, atau WebP.',
    )
    expect(imageFileError(file('a.pdf', 'application/pdf', 10))).toBe(
      'Gambar harus JPG, PNG, atau WebP.',
    )
    expect(imageFileError(file('a.png', 'image/png', 0))).toBe('Berkas kosong.')
    expect(
      imageFileError(file('a.png', 'image/png', MAX_DOWNLOAD_BYTES + 1)),
    ).toBe('Ukuran gambar maksimal 5 MB.')
  })
})
