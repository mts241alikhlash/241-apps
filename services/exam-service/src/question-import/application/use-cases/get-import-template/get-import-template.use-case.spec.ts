import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { parseExcelSheet } from '../../parsers/excel-sheet.parser.js'
import { parseWordSheet } from '../../parsers/word-sheet.parser.js'
import { GetImportTemplateUseCase } from './get-import-template.use-case.js'

const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_RESPONSE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
]

describe('GetImportTemplateUseCase', () => {
  it('gives an Excel template whose examples all import cleanly', async () => {
    const template = await new GetImportTemplateUseCase().execute('xlsx')

    const sheet = await parseExcelSheet(template.buffer)

    expect(template.fileName).toBe('template-soal.xlsx')
    expect(template.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(sheet.identity.version).toBe(2)
    expect(sheet.errors).toEqual([])
    expect(sheet.questions.map((q) => q.type)).toEqual(QUESTION_TYPES)
  })

  it('gives a Word template with two tables whose examples all import cleanly', async () => {
    const template = await new GetImportTemplateUseCase().execute('docx')

    const xml = await JSZip.loadAsync(template.buffer).then((zip) =>
      zip.file('word/document.xml')!.async('string'),
    )
    const sheet = await parseWordSheet(template.buffer, () =>
      Promise.resolve('unused'),
    )

    expect(template.fileName).toBe('template-soal.docx')
    expect(template.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(xml.match(/<w:tbl>/gu)).toHaveLength(2)
    expect(xml).toContain('Versi Template')
    expect(sheet.identity.version).toBe(2)
    expect(sheet.errors).toEqual([])
    expect(sheet.questions.map((q) => q.type)).toEqual(QUESTION_TYPES)
  })
})
