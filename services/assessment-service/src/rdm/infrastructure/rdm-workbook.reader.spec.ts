import { BadRequestException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { buildRdmTemplateFixture } from '../testing/rdm-template.fixture.js'
import { patchRdmTemplate } from './rdm-template-patcher.js'
import { buildRdmWorkbook } from './rdm-workbook.builder.js'
import { readRdmWorkbook } from './rdm-workbook.reader.js'

describe('rdm-workbook.reader', () => {
  const students = [
    { nis: '260001', nisn: '0143909888', name: 'Ahmad' },
    { nis: '', nisn: '0143909889', name: 'Budi' },
  ]

  it('reads workbooks produced by rdm-workbook.builder', async () => {
    const buffer = await buildRdmWorkbook({
      kind: 'sumatif',
      classSubject: 'IX.A/Informatika',
      students,
      sheets: [
        {
          name: 'UH 1',
          material: 'Algoritma & Logika',
          kktp: 75,
          scores: new Map([[0, 88]]),
        },
      ],
    })

    const result = await readRdmWorkbook(buffer)

    expect(result.kind).toBe('sumatif')
    expect(result.e2).toBe('IX.A/Informatika')
    expect(result.sheetNames).toHaveLength(15)
    expect(result.sheets[0]).toEqual({
      sheetName: 'SUM 1',
      e2: 'IX.A/Informatika',
      name: 'UH 1',
      material: 'Algoritma & Logika',
      kktp: { status: 'valid', value: 75 },
      rows: [
        {
          row: 7,
          nis: '260001',
          nisn: '0143909888',
          score: { status: 'valid', value: 88 },
        },
        {
          row: 8,
          nis: '',
          nisn: '0143909889',
          score: { status: 'empty' },
        },
      ],
    })
    expect(result.sheets[1]?.name).toBeNull()
    expect(result.sheets[1]?.kktp).toEqual({ status: 'empty' })
  })

  it('reads patched Task 4 RDM template fixtures', async () => {
    const template = await buildRdmTemplateFixture('sas', students)
    const filled = await patchRdmTemplate(template, [
      {
        sheetName: 'SAS 1',
        name: 'UAS Ganjil',
        material: 'Semua Bab',
        kktp: 70,
        scores: new Map([
          [7, 90],
          [8, 82],
        ]),
      },
    ])

    const result = await readRdmWorkbook(filled)

    expect(result.kind).toBe('sas')
    expect(result.sheetNames).toEqual(['SAS 1'])
    expect(result.sheets[0]).toEqual({
      sheetName: 'SAS 1',
      e2: 'IX.A/Informatika',
      name: 'UAS Ganjil',
      material: 'Semua Bab',
      kktp: { status: 'valid', value: 70 },
      rows: [
        {
          row: 7,
          nis: '260001',
          nisn: '0143909888',
          score: { status: 'valid', value: 90 },
        },
        {
          row: 8,
          nis: '',
          nisn: '0143909889',
          score: { status: 'valid', value: 82 },
        },
      ],
    })
  })

  it('marks text, decimals, and out-of-range values in C5 and F as invalid', async () => {
    const template = await buildRdmTemplateFixture('sumatif', students)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(
      template as unknown as Parameters<typeof wb.xlsx.load>[0],
    )
    const sum1 = wb.getWorksheet('SUM 1')!
    sum1.getCell('B2').value = 'UH 1'
    sum1.getCell('C5').value = 105
    sum1.getCell('F7').value = 'abc'
    sum1.getCell('F8').value = 85.5

    const sum2 = wb.getWorksheet('SUM 2')!
    sum2.getCell('B2').value = 'UH 2'
    sum2.getCell('C5').value = 'tujuh puluh'
    sum2.getCell('F7').value = -1
    sum2.getCell('F8').value = 101

    const buffer = Buffer.from(await wb.xlsx.writeBuffer())
    const result = await readRdmWorkbook(buffer)

    expect(result.sheets[0]?.kktp).toEqual({ status: 'invalid' })
    expect(result.sheets[0]?.rows[0]?.score).toEqual({ status: 'invalid' })
    expect(result.sheets[0]?.rows[1]?.score).toEqual({ status: 'invalid' })

    expect(result.sheets[1]?.kktp).toEqual({ status: 'invalid' })
    expect(result.sheets[1]?.rows[0]?.score).toEqual({ status: 'invalid' })
    expect(result.sheets[1]?.rows[1]?.score).toEqual({ status: 'invalid' })
  })

  it('refuses a non-RDM workbook', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('Sheet1')
    const buffer = Buffer.from(await wb.xlsx.writeBuffer())

    await expect(readRdmWorkbook(buffer)).rejects.toThrow(
      new BadRequestException('File ini bukan template RDM'),
    )
  })

  it('refuses a zip whose sheet entry decompresses past the byte budget', async () => {
    const template = await buildRdmTemplateFixture('sas', students)
    const zip = await JSZip.loadAsync(template)
    const bigPayload = 'A'.repeat(20_000)
    zip.file(
      'xl/worksheets/sheet1.xml',
      `<worksheet><sheetData><row r="2"><c r="B2" t="inlineStr"><is><t>${bigPayload}</t></is></c></row></sheetData></worksheet>`,
    )
    const bomb = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    await expect(readRdmWorkbook(bomb, 4096)).rejects.toThrow(
      new BadRequestException('File terlalu besar setelah diekstrak'),
    )
  })
})
