import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import {
  CLASSROOM_7A,
  CLASSROOM_7B,
  NOW,
  OTHER_SUBJECT,
  SCHEDULE_ID,
  STUDENTS,
  SUBJECT_ID,
  TEACHER,
  buildOffline,
  offlineSchedule,
  seatAll,
} from '../../exam-offline.test-support.js'
import { BuildScoreSheetUseCase } from '../build-score-sheet/build-score-sheet.use-case.js'
import { ImportOfflineScoresUseCase } from './import-offline-scores.use-case.js'

function setup(options: Parameters<typeof buildOffline>[0] = {}) {
  const world = buildOffline(options)
  seatAll(world)
  return {
    world,
    useCase: new ImportOfflineScoresUseCase(world.reader, world.results),
    sheet: new BuildScoreSheetUseCase(world.reader, world.academic),
  }
}

const csv = (text: string, originalName = 'nilai.csv') => ({
  buffer: Buffer.from(text, 'utf8'),
  originalName,
})

const run = (
  useCase: ImportOfflineScoresUseCase,
  file: { buffer: Buffer; originalName: string },
) => useCase.execute(TEACHER, { scheduleId: SCHEDULE_ID, file }, NOW)

async function xlsx(rows: (string | number | null)[][]): Promise<Buffer> {
  const book = new ExcelJS.Workbook()
  const sheet = book.addWorksheet('Lembar')
  for (const row of rows) sheet.addRow(row)
  return Buffer.from(await book.xlsx.writeBuffer())
}

describe('ImportOfflineScoresUseCase', () => {
  it('round-trips the generated score sheet once it is filled in', async () => {
    const { world, useCase, sheet } = setup()
    world.markAbsent(STUDENTS.budi)
    const built = await sheet.execute(TEACHER, SCHEDULE_ID)
    const layout = await (
      await JSZip.loadAsync(built.buffer)
    )
      .file('xl/worksheets/sheet1.xml')!
      .async('string')
    expect(layout).toContain('<col ')
    const book = new ExcelJS.Workbook()
    await book.xlsx.load(built.buffer as unknown as ExcelJS.Buffer)
    const page = book.getWorksheet('Score Sheet')!
    page.getCell('C5').value = 45
    page.getCell('D5').value = 'baik'
    page.getCell('C7').value = 38.5
    const filled = Buffer.from(await book.xlsx.writeBuffer())

    const result = await run(useCase, {
      buffer: filled,
      originalName: built.filename,
    })

    expect(result.saved).toBe(2)
    expect(result.rejected).toEqual([])
    expect(result.skipped).toEqual([
      { row: 6, participantNumber: '7-002', reason: 'TIDAK_HADIR' },
    ])
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)).toMatchObject({
      rawScore: 45,
      note: 'baik',
      enteredById: TEACHER.id,
    })
    expect(world.results.find(SCHEDULE_ID, STUDENTS.citra)?.rawScore).toBe(38.5)
    expect(world.results.find(SCHEDULE_ID, STUDENTS.budi)).toBeUndefined()
  })

  it('lists every bad row with its spreadsheet row and saves the good ones', async () => {
    const { world, useCase } = setup()
    world.markAbsent(STUDENTS.citra)
    const buffer = await xlsx([
      ['No. Peserta', 'Nama', 'Nilai', 'Catatan'],
      ['7-001', 'Ani', 40, ''],
      ['7-002', 'Budi', null, ''],
      ['9-999', 'Asing', 30, ''],
      ['7-003', 'Citra', 20, ''],
      ['7-004', 'Ganda', 10, ''],
      ['7-004', 'Ganda', 12, ''],
      ['7-001x', 'Typo', 'empat', ''],
    ])

    const result = await run(useCase, { buffer, originalName: 'nilai.xlsx' })

    expect(result.saved).toBe(1)
    expect(result.skipped).toEqual([
      { row: 3, participantNumber: '7-002', reason: 'KOSONG' },
    ])
    expect(result.rejected).toEqual([
      {
        row: 4,
        participantNumber: '9-999',
        reason: 'No. Peserta tidak terdaftar di kelas ini',
      },
      { row: 5, participantNumber: '7-003', reason: 'Siswa tidak hadir' },
      {
        row: 6,
        participantNumber: '7-004',
        reason: 'No. Peserta ganda di berkas',
      },
      {
        row: 7,
        participantNumber: '7-004',
        reason: 'No. Peserta ganda di berkas',
      },
      {
        row: 8,
        participantNumber: '7-001x',
        reason: 'No. Peserta tidak terdaftar di kelas ini',
      },
    ])
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)?.rawScore).toBe(40)
    expect(world.results.find(SCHEDULE_ID, STUDENTS.budi)).toBeUndefined()
  })

  it('refuses a score above the maximum, a negative one and a non-numeric one', async () => {
    const { world, useCase } = setup()

    const result = await run(
      useCase,
      csv('No. Peserta,Score,Note\n7-001,51,\n7-002,-1,\n7-003,empat puluh,\n'),
    )

    expect(result.saved).toBe(0)
    expect(result.rejected).toEqual([
      {
        row: 2,
        participantNumber: '7-001',
        reason: 'Nilai harus antara 0 dan 50',
      },
      {
        row: 3,
        participantNumber: '7-002',
        reason: 'Nilai harus antara 0 dan 50',
      },
      { row: 4, participantNumber: '7-003', reason: 'Nilai bukan angka' },
    ])
    expect(world.results.rows.size).toBe(0)
  })

  it('reads a semicolon csv with a comma decimal, quotes and a BOM', async () => {
    const { world, useCase } = setup()

    const result = await run(
      useCase,
      csv(
        '﻿No. Peserta;Nama;Score;Note\r\n7-001;"Ani; A";42,5;"kata ""bagus"""\r\n',
      ),
    )

    expect(result).toEqual({ saved: 1, rejected: [], skipped: [] })
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)).toMatchObject({
      rawScore: 42.5,
      note: 'kata "bagus"',
    })
  })

  it('takes back the formula guard of a note', async () => {
    const { world, useCase } = setup()

    await run(useCase, csv("No. Peserta,Score,Note\n7-001,40,'=1+1\n"))

    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)?.note).toBe('=1+1')
  })

  it('refuses a file over 1 MB', async () => {
    const { useCase } = setup()
    await expect(
      run(useCase, {
        buffer: Buffer.alloc(1024 * 1024 + 1, 0x41),
        originalName: 'nilai.csv',
      }),
    ).rejects.toThrow(
      new PayloadTooLargeException('Ukuran berkas maksimal 1 MB'),
    )
  })

  const KB = 1024
  const MB = 1024 * KB
  const range = (from: number, count: number, size: number, name: string) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, index) => [
        name.replace('N', String(from + index)),
        size,
      ]),
    )

  it.each([
    ['sheet1.xml past 1 MB', { 'xl/worksheets/sheet1.xml': MB + 1 }],
    ['sharedStrings.xml past 1 MB', { 'xl/sharedStrings.xml': MB + 1 }],
    ['comments1.xml past 1 MB', { 'xl/comments1.xml': MB + 1 }],
    ['a 19 MB styles.xml', { 'xl/styles.xml': 19 * MB }],
    [
      '59 extra sheets of about 1 MB',
      range(2, 59, 1000 * KB, 'xl/worksheets/sheetN.xml'),
    ],
    [
      'five parts under 1 MB but past 4 MB together',
      range(1, 5, 900 * KB, 'xl/custom/partN.xml'),
    ],
    ['four worksheet parts', range(2, 3, KB, 'xl/worksheets/sheetN.xml')],
  ])(
    'refuses a workbook with %s before reading it',
    async (_, parts: Record<string, number>) => {
      const { world, useCase } = setup()
      const zip = await JSZip.loadAsync(
        await xlsx([
          ['No. Peserta', 'Score'],
          ['7-001', 40],
        ]),
      )
      for (const [part, size] of Object.entries(parts)) {
        zip.file(part, `<?xml version="1.0"?><x>${' '.repeat(size)}</x>`)
      }
      const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      })
      expect(buffer.length).toBeLessThan(MB)
      const workbookRead = vi.spyOn(ExcelJS.Workbook.prototype, 'xlsx', 'get')

      try {
        await expect(
          run(useCase, { buffer, originalName: 'nilai.xlsx' }),
        ).rejects.toThrow(
          new BadRequestException('Berkas terlalu besar untuk diimpor'),
        )
        expect(workbookRead).not.toHaveBeenCalled()
      } finally {
        workbookRead.mockRestore()
      }
      expect(world.results.rows.size).toBe(0)
    },
  )

  const SHEET = 'xl/worksheets/sheet1.xml'
  const BOOK = 'xl/workbook.xml'
  const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

  async function handedToExcel(
    edit: (zip: JSZip) => Promise<void> | void,
  ): Promise<{ result: Awaited<ReturnType<typeof run>>; handed: JSZip }> {
    const { useCase } = setup()
    const zip = await JSZip.loadAsync(
      await xlsx([
        ['No. Peserta', 'Score'],
        ['7-001', 40],
      ]),
    )
    await edit(zip)
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })
    const load = vi.spyOn(
      Object.getPrototypeOf(new ExcelJS.Workbook().xlsx) as ExcelJS.Xlsx,
      'load',
    )
    try {
      const result = await run(useCase, { buffer, originalName: 'nilai.xlsx' })
      const handed = await JSZip.loadAsync(load.mock.calls[0][0])
      return { result, handed }
    } finally {
      load.mockRestore()
    }
  }

  const insert =
    (part: string, find: string, add: string) => async (zip: JSZip) => {
      const text = await zip.file(part)!.async('string')
      zip.file(part, text.replace(find, add))
    }

  it.each([
    [
      'a merge over C2:Z50000',
      SHEET,
      '</sheetData>',
      '</sheetData><mergeCells count="1"><mergeCell ref="C2:Z50000"/></mergeCells>',
      'mergeCell',
    ],
    [
      'a prefixed merge',
      SHEET,
      '</sheetData>',
      `</sheetData><x:mergeCells xmlns:x="${MAIN}" count="1"><x:mergeCell ref="C2:Z50000"/></x:mergeCells>`,
      'mergeCell',
    ],
    [
      'a column run to 3000000',
      SHEET,
      '<sheetData>',
      '<cols><col min="1" max="3000000" width="9" customWidth="1"/></cols><sheetData>',
      '<col',
    ],
    [
      'a validation over the whole sheet',
      SHEET,
      '</sheetData>',
      '</sheetData><dataValidations count="1"><dataValidation type="whole" sqref="A1:XFD1048576"><formula1>0</formula1></dataValidation></dataValidations>',
      'dataValidation',
    ],
    [
      'a conditional format over the whole sheet',
      SHEET,
      '</sheetData>',
      '</sheetData><conditionalFormatting sqref="A1:XFD1048576"><cfRule type="expression" priority="1"><formula>TRUE</formula></cfRule></conditionalFormatting>',
      'conditionalFormatting',
    ],
    [
      'a defined name over a million rows',
      BOOK,
      '</sheets>',
      '</sheets><definedNames><definedName name="besar">Lembar!$A$1:$Z$1000000</definedName></definedNames>',
      'definedName',
    ],
  ])(
    'reads only the cell data of a workbook with %s',
    async (_, part, find, add, marker) => {
      const { result, handed } = await handedToExcel(insert(part, find, add))

      expect(result).toEqual({ saved: 1, rejected: [], skipped: [] })
      expect(await handed.file(part)!.async('string')).not.toContain(marker)
      expect(await handed.file(SHEET)!.async('string')).toContain('<sheetData>')
    },
  )

  it.each([
    [
      'mergeCells split by cols',
      SHEET,
      '</sheetData>',
      '</sheetData><merge<cols></cols>Cells count="1"><mergeCell ref="C2:C3"/></mergeCells>',
      /<mergeCells[\s>]/u,
    ],
    [
      'mergeCells split by drawing',
      SHEET,
      '</sheetData>',
      '</sheetData><merge<drawing/>Cells count="1"><mergeCell ref="C2:C3"/></mergeCells>',
      /<mergeCells[\s>]/u,
    ],
    [
      'cols split by mergeCells',
      SHEET,
      '<sheetData>',
      '<co<mergeCells/>ls><col min="1" max="3" width="9"/></cols><sheetData>',
      /<cols[\s>]/u,
    ],
    [
      'dataValidations split by cols',
      SHEET,
      '</sheetData>',
      '</sheetData><data<cols/>Validations count="1"><dataValidation type="whole" sqref="A1:A2"><formula1>0</formula1></dataValidation></dataValidations>',
      /<dataValidations[\s>]/u,
    ],
    [
      'definedNames split by definedNames',
      BOOK,
      '</sheets>',
      '</sheets><defined<definedNames/>Names><definedName name="kecil">Lembar!$A$1:$A$2</definedName></definedNames>',
      /<definedNames[\s>]/u,
    ],
  ])(
    'never joins the text around a stripped element into %s',
    async (_, part, find, add, tag) => {
      const { useCase } = setup()
      const zip = await JSZip.loadAsync(
        await xlsx([
          ['No. Peserta', 'Score'],
          ['7-001', 40],
        ]),
      )
      await insert(part, find, add)(zip)
      const buffer = await zip.generateAsync({ type: 'nodebuffer' })
      const load = vi.spyOn(
        Object.getPrototypeOf(new ExcelJS.Workbook().xlsx) as ExcelJS.Xlsx,
        'load',
      )
      try {
        await run(useCase, { buffer, originalName: 'nilai.xlsx' }).catch(
          (error: unknown) => {
            expect(error).toBeInstanceOf(BadRequestException)
          },
        )
        for (const [handed] of load.mock.calls) {
          const xml = await (
            await JSZip.loadAsync(handed)
          )
            .file(part)!
            .async('string')
          expect(xml).not.toMatch(tag)
        }
      } finally {
        load.mockRestore()
      }
    },
  )

  it('drops comments, drawings, tables and sheet relationships before ExcelJS reads the workbook', async () => {
    const { result, handed } = await handedToExcel((zip) => {
      zip.file(
        'xl/worksheets/_rels/sheet1.xml.rels',
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments1.xml"/></Relationships>',
      )
      zip.file(
        'xl/comments1.xml',
        `<?xml version="1.0"?><comments xmlns="${MAIN}"><authors><author>a</author></authors><commentList><comment ref="A1" authorId="0"><text><t>x</t></text></comment></commentList></comments>`,
      )
      zip.file('xl/drawings/drawing1.xml', '<?xml version="1.0"?><x/>')
      zip.file('xl/tables/table1.xml', '<?xml version="1.0"?><x/>')
    })

    expect(result.saved).toBe(1)
    expect(
      Object.keys(handed.files).filter((name) =>
        /xl\/(worksheets\/_rels|comments|drawings|tables)/u.test(name),
      ),
    ).toEqual([])
  })

  it('keeps a filled sheet of 500 rows under the part limit', async () => {
    const { useCase } = setup()
    const rows = Array.from({ length: 500 }, (_, index) => [
      `7-${String(index + 1).padStart(3, '0')}`,
      `Nama Lengkap Peserta Ujian Nomor ${index + 1} Bin Fulan Al-Ikhlash`,
      87.5,
      `Catatan guru untuk peserta ${index + 1}: jawaban rapi, perlu latihan lagi`,
    ])
    const buffer = await xlsx([
      ['No. Peserta', 'Nama', 'Score', 'Note'],
      ...rows,
    ])
    const zip = await JSZip.loadAsync(buffer)
    for (const part of ['xl/worksheets/sheet1.xml', 'xl/sharedStrings.xml']) {
      const size = (await zip.file(part)!.async('nodebuffer')).length
      expect(size).toBeLessThan(1024 * 1024)
    }

    const result = await run(useCase, { buffer, originalName: 'nilai.xlsx' })

    expect(result.saved + result.rejected.length + result.skipped.length).toBe(
      500,
    )
  })

  it('refuses more than 500 rows', async () => {
    const { useCase } = setup()
    const body = Array.from({ length: 501 }, () => '7-001,40').join('\n')
    await expect(
      run(useCase, csv(`No. Peserta,Score\n${body}\n`)),
    ).rejects.toThrow('Maksimal 500 baris per berkas')
  })

  it.each([
    ['a wrong extension', csv('No. Peserta,Score\n7-001,40\n', 'nilai.pdf')],
    ['a csv named xlsx', csv('No. Peserta,Score\n7-001,40\n', 'nilai.xlsx')],
    [
      'a broken xlsx',
      {
        buffer: Buffer.concat([
          Buffer.from('PK\u0003\u0004'),
          Buffer.alloc(64),
        ]),
        originalName: 'nilai.xlsx',
      },
    ],
    ['binary content', csv('\u0000\u0001\u0002', 'nilai.csv')],
    ['no header', csv('Nama,Nilai\nAni,40\n')],
  ])('refuses %s with 400', async (_label, file) => {
    const { useCase } = setup()
    await expect(run(useCase, file)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('refuses an xlsx that is named csv', async () => {
    const { useCase } = setup()
    const buffer = await xlsx([
      ['No. Peserta', 'Score'],
      ['7-001', 40],
    ])
    await expect(
      run(useCase, { buffer, originalName: 'nilai.csv' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('refuses a teacher of another subject before reading the file', async () => {
    const { world, useCase } = setup({
      taught: [{ subjectId: OTHER_SUBJECT, classroomId: CLASSROOM_7A.id }],
    })
    await expect(
      run(useCase, csv('No. Peserta,Score\n7-001,40\n')),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(world.results.rows.size).toBe(0)
  })

  it('refuses an online schedule', async () => {
    const { world, useCase } = setup()
    world.schedules.schedules.set(
      SCHEDULE_ID,
      offlineSchedule({ deliveryMode: 'ONLINE', packageId: 'p' }),
    )
    await expect(
      run(useCase, csv('No. Peserta,Score\n7-001,40\n')),
    ).rejects.toMatchObject({ code: 'SCHEDULE_NOT_OFFLINE' })
  })

  it('still rejects a real number for an absent student', async () => {
    const { world, useCase } = setup()
    world.markAbsent(STUDENTS.budi)

    const result = await run(
      useCase,
      csv('No. Peserta,Score\n7-002,TIDAK HADIR\n'),
    )
    const again = await run(useCase, csv('No. Peserta,Score\n7-002,30\n'))

    expect(result.skipped).toEqual([
      { row: 2, participantNumber: '7-002', reason: 'TIDAK_HADIR' },
    ])
    expect(again.rejected).toEqual([
      { row: 2, participantNumber: '7-002', reason: 'Siswa tidak hadir' },
    ])
    expect(world.results.find(SCHEDULE_ID, STUDENTS.budi)).toBeUndefined()
  })

  it('treats the absent marker of a present student as not a number', async () => {
    const { useCase } = setup()

    const result = await run(
      useCase,
      csv('No. Peserta,Score\n7-001,TIDAK HADIR\n'),
    )

    expect(result.rejected).toEqual([
      { row: 2, participantNumber: '7-001', reason: 'Nilai bukan angka' },
    ])
  })

  it('never clears a sent score through a blank cell', async () => {
    const { world, useCase } = setup()
    const sent = await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 40,
      note: 'lama',
      enteredById: 't',
      enteredAt: NOW,
    })
    world.results.rows.set(sent.id, { ...sent, publicationStatus: 'SENT' })

    const result = await run(useCase, csv('No. Peserta,Score,Note\n7-001,,\n'))

    expect(result.skipped).toEqual([
      { row: 2, participantNumber: '7-001', reason: 'KOSONG' },
    ])
    expect(world.results.rows.get(sent.id)).toMatchObject({
      rawScore: 40,
      note: 'lama',
      publicationStatus: 'SENT',
    })
  })

  it('keeps the stored note when the file has no note column', async () => {
    const { world, useCase } = setup()
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 40,
      note: 'jangan hilang',
      enteredById: 't',
      enteredAt: NOW,
    })

    await run(useCase, csv('No. Peserta,Score\n7-001,45\n7-002,30\n'))

    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)).toMatchObject({
      rawScore: 45,
      note: 'jangan hilang',
    })
    expect(world.results.find(SCHEDULE_ID, STUDENTS.budi)?.note).toBe('')
  })

  it('refuses an archive the guard rejects before the workbook is read', async () => {
    const { world, useCase } = setup()
    const zip = new JSZip()
    for (let index = 0; index < 1001; index += 1) {
      zip.file(`part-${index}.txt`, 'x')
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    await expect(
      run(useCase, { buffer, originalName: 'nilai.xlsx' }),
    ).rejects.toThrow('Berkas berisi terlalu banyak bagian')
    expect(world.results.rows.size).toBe(0)
  })

  it('refuses a teacher of the same subject in another classroom', async () => {
    const { useCase } = setup({
      taught: [{ subjectId: SUBJECT_ID, classroomId: CLASSROOM_7B.id }],
    })
    await expect(
      run(useCase, csv('No. Peserta,Score\n7-001,40\n')),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
