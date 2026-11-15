import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { parseExcelSheet } from '../parsers/excel-sheet.parser.js'
import { buildXlsxTemplate } from './xlsx-template.js'

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

async function load(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  return book
}

describe('buildXlsxTemplate', () => {
  it('has the Identitas, Soal and Petunjuk sheets with version 2', async () => {
    const book = await load(await buildXlsxTemplate())

    expect(book.worksheets.map((sheet) => sheet.name)).toEqual([
      'Identitas',
      'Soal',
      'Petunjuk',
    ])
    expect(book.getWorksheet('Identitas')?.getCell('B1').value).toBe(2)
  })

  it('has the eleven question columns and one example per jenis', async () => {
    const sheet = (await load(await buildXlsxTemplate())).getWorksheet('Soal')

    expect((sheet?.getRow(1).values as unknown[]).slice(1)).toEqual(HEADERS)
    expect(
      [2, 3, 4, 5, 6].map((number) => sheet?.getRow(number).getCell(2).value),
    ).toEqual(['PG', 'PG Kompleks', 'Benar/Salah', 'Isian', 'Uraian'])
  })

  it('explains the identity rules in Petunjuk', async () => {
    const notes = (await load(await buildXlsxTemplate()))
      .getWorksheet('Petunjuk')
      ?.getColumn(1)
      .values.filter((value): value is string => typeof value === 'string')
      .join('\n')

    expect(notes).toContain('Tingkat')
    expect(notes).toContain('NIK')
    expect(notes).toContain('Versi Template')
  })

  it('imports its own examples without errors', async () => {
    const sheet = await parseExcelSheet(await buildXlsxTemplate())

    expect(sheet.identity.version).toBe(2)
    expect(sheet.errors).toEqual([])
    expect(sheet.questions.map((question) => question.type)).toEqual([
      'MULTIPLE_CHOICE',
      'MULTIPLE_RESPONSE',
      'TRUE_FALSE',
      'SHORT_ANSWER',
      'ESSAY',
    ])
  })
})
