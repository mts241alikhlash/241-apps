import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { parseWordSheet } from '../parsers/word-sheet.parser.js'
import { buildDocxTemplate } from './docx-template.js'

async function documentXml(buffer: Buffer): Promise<string> {
  return JSZip.loadAsync(buffer).then((zip) =>
    zip.file('word/document.xml')!.async('string'),
  )
}

describe('buildDocxTemplate', () => {
  it('has two bordered Word tables and the identity fields', async () => {
    const xml = await documentXml(await buildDocxTemplate())

    expect(xml.match(/<w:tbl>/gu)).toHaveLength(2)
    expect(xml).toContain('<w:tblBorders>')
    expect(xml).toContain('Versi Template')
  })

  it('imports its own examples without errors', async () => {
    const sheet = await parseWordSheet(await buildDocxTemplate(), () =>
      Promise.resolve('unused'),
    )

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
