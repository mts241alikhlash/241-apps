import { BadRequestException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { describe, expect, it, vi } from 'vitest'
import { parseExcelSheet } from './excel-sheet.parser.js'

const HEADERS = [
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

const IDENTITY = [
  ['Versi Template', 2],
  ['Nama Guru', 'Budi'],
  ['NIK', '3204000000000001'],
  ['Mapel', 'Matematika'],
  ['Tingkat', 8],
]

async function workbook(options: {
  identity?: (string | number)[][] | null
  headers?: string[]
  rows?: (string | number | null)[][]
}) {
  const book = new ExcelJS.Workbook()
  if (options.identity !== null) {
    const identity = book.addWorksheet('Identitas')
    ;(options.identity ?? IDENTITY).forEach((row) => identity.addRow(row))
  }
  const sheet = book.addWorksheet('Soal')
  sheet.addRow(options.headers ?? HEADERS)
  ;(options.rows ?? []).forEach((row) => sheet.addRow(row))
  return Buffer.from(await book.xlsx.writeBuffer())
}

const PG_ROW = [
  1,
  'PG',
  'Berapa $2+3$?',
  '4',
  '5',
  '6',
  null,
  null,
  'B',
  null,
  2,
]

describe('parseExcelSheet', () => {
  it('reads the identity sheet and the questions sheet', async () => {
    const sheet = await parseExcelSheet(await workbook({ rows: [PG_ROW] }))

    expect(sheet.identity).toEqual({
      version: 2,
      teacherName: 'Budi',
      nik: '3204000000000001',
      subjectName: 'Matematika',
      gradeLevel: 8,
    })
    expect(sheet.errors).toEqual([])
    expect(sheet.questions).toHaveLength(1)
    expect(sheet.questions[0]).toMatchObject({
      row: 2,
      type: 'MULTIPLE_CHOICE',
      points: 2,
    })
  })

  it('matches identity labels case-insensitively', async () => {
    const sheet = await parseExcelSheet(
      await workbook({
        identity: [
          ['versi template', '2'],
          ['NAMA GURU', 'Budi'],
          ['nik', '1'],
          ['mapel', 'IPA'],
          ['TINGKAT', 'VII'],
        ],
        rows: [PG_ROW],
      }),
    )

    expect(sheet.identity).toMatchObject({
      version: 2,
      teacherName: 'Budi',
      nik: '1',
      subjectName: 'IPA',
      gradeLevel: 7,
    })
  })

  it('reads a null version when the value is not an integer', async () => {
    const sheet = await parseExcelSheet(
      await workbook({
        identity: [['Versi Template', 'dua']],
        rows: [PG_ROW],
      }),
    )

    expect(sheet.identity.version).toBeNull()
  })

  it('gives an empty identity when the sheet Identitas is missing', async () => {
    const sheet = await parseExcelSheet(
      await workbook({ identity: null, rows: [PG_ROW] }),
    )

    expect(sheet.identity).toEqual({
      version: null,
      teacherName: '',
      nik: '',
      subjectName: '',
      gradeLevel: null,
    })
    expect(sheet.questions).toHaveLength(1)
  })

  it('reports a missing Soal sheet as a row 0 error', async () => {
    const book = new ExcelJS.Workbook()
    book.addWorksheet('Identitas').addRow(['Versi Template', 2])
    const sheet = await parseExcelSheet(
      Buffer.from(await book.xlsx.writeBuffer()),
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toEqual([
      { row: 0, reason: 'Lembar Soal tidak ditemukan' },
    ])
  })

  it('reports an unknown Jenis as a row error', async () => {
    const sheet = await parseExcelSheet(
      await workbook({
        rows: [
          [
            1,
            'Pilgan',
            'Berapa $2+3$?',
            '4',
            '5',
            null,
            null,
            null,
            'B',
            null,
            null,
          ],
        ],
      }),
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toEqual([
      { row: 2, reason: 'Jenis soal tidak dikenal' },
    ])
  })

  it('finds columns by header name in any order', async () => {
    const sheet = await parseExcelSheet(
      await workbook({
        headers: ['Poin', 'Kunci', 'Soal', 'Jenis', 'A', 'B'],
        rows: [[2, 'B', 'Berapa $2+3$?', 'PG', '4', '5']],
      }),
    )

    expect(sheet.errors).toEqual([])
    expect(sheet.questions[0]).toMatchObject({
      type: 'MULTIPLE_CHOICE',
      points: 2,
    })
  })

  it('keeps Arabic harakat byte for byte and reads Abaikan harakat', async () => {
    const arabic = 'مَا مَعْنَى كِتَابٌ؟'
    const sheet = await parseExcelSheet(
      await workbook({
        rows: [
          [
            1,
            'Isian',
            arabic,
            null,
            null,
            null,
            null,
            null,
            'كِتَابٌ',
            'Ya',
            null,
          ],
        ],
      }),
    )

    expect(sheet.questions[0].bodyHtml).toBe(`<p dir="auto">${arabic}</p>`)
    expect(sheet.questions[0].content).toMatchObject({
      answer: { accepted: ['كِتَابٌ'], ignoreHarakat: true },
    })
  })

  it('skips blank rows, asks for Jenis and Soal, and refuses a non-workbook', async () => {
    const sheet = await parseExcelSheet(
      await workbook({
        rows: [
          [null, null, null, null, null, null, null, null, null, null, null],
          [
            1,
            'Uraian',
            'Jelaskan',
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
        ],
      }),
    )
    expect(sheet.questions.map((q) => q.row)).toEqual([3])

    const book = new ExcelJS.Workbook()
    book.addWorksheet('Soal').addRow(['No', 'Pertanyaan'])
    await expect(
      parseExcelSheet(Buffer.from(await book.xlsx.writeBuffer())),
    ).rejects.toThrow(
      new BadRequestException('Kolom Jenis dan Soal tidak ditemukan'),
    )
    await expect(parseExcelSheet(Buffer.from('bukan xlsx'))).rejects.toThrow(
      new BadRequestException('Berkas Excel tidak bisa dibaca'),
    )
  })

  it('throws when more than 500 questions are present', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => [
      index + 1,
      'PG',
      `Soal ${index + 1}`,
      '4',
      '5',
      null,
      null,
      null,
      'A',
      null,
      null,
    ])

    await expect(parseExcelSheet(await workbook({ rows }))).rejects.toThrow(
      new BadRequestException('Maksimal 500 soal per berkas'),
    )
  })

  it('reads a row far down the sheet without creating the rows above it', async () => {
    const book = new ExcelJS.Workbook()
    const identity = book.addWorksheet('Identitas')
    IDENTITY.forEach((row) => identity.addRow(row))
    const sheet = book.addWorksheet('Soal')
    sheet.addRow(HEADERS)
    sheet.getRow(200_000).values = PG_ROW
    const buffer = Buffer.from(await book.xlsx.writeBuffer())
    const worksheetProto = Object.getPrototypeOf(sheet) as ExcelJS.Worksheet
    const getRow = vi.spyOn(worksheetProto, 'getRow')

    const parsed = await parseExcelSheet(buffer)
    const calls = getRow.mock.calls.length
    getRow.mockRestore()

    expect(parsed.questions.map((question) => question.row)).toEqual([200_000])
    expect(calls).toBeLessThan(100)
  })

  it('reads an empty merged header as blank instead of failing', async () => {
    const book = new ExcelJS.Workbook()
    const identity = book.addWorksheet('Identitas')
    IDENTITY.forEach((row) => identity.addRow(row))
    const sheet = book.addWorksheet('Soal')
    sheet.addRow(HEADERS)
    sheet.addRow(PG_ROW)
    sheet.mergeCells('L1:M1')

    const parsed = await parseExcelSheet(
      Buffer.from(await book.xlsx.writeBuffer()),
    )

    expect(parsed.questions).toHaveLength(1)
    expect(parsed.errors).toEqual([])
  })

  it('reports a row error for an empty merge over data rows', async () => {
    const book = new ExcelJS.Workbook()
    const identity = book.addWorksheet('Identitas')
    IDENTITY.forEach((row) => identity.addRow(row))
    const sheet = book.addWorksheet('Soal')
    sheet.addRow(HEADERS)
    sheet.addRow(PG_ROW)
    sheet.addRow([3, null, 'Soal tiga', '4', '5', null, null, null, 'A'])
    sheet.addRow([4, null, 'Soal empat', '4', '5', null, null, null, 'A'])
    sheet.mergeCells('B3:B4')

    const parsed = await parseExcelSheet(
      Buffer.from(await book.xlsx.writeBuffer()),
    )

    expect(parsed.questions).toHaveLength(1)
    expect(parsed.errors).toEqual([
      { row: 3, reason: 'Jenis soal tidak dikenal' },
      { row: 4, reason: 'Jenis soal tidak dikenal' },
    ])
  })
})
