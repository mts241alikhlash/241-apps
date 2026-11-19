import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { STANDARD_COUNTS } from '../../domain/import-standard.js'
import { parseWordSheet } from '../parsers/word-sheet.parser.js'
import { buildVerticalDocxTemplate } from './vertical-docx-template.js'

const noImages = () => Promise.resolve('unused')

const SLOT = '&lt;tulis soal di sini&gt;'

async function documentXml(buffer: Buffer): Promise<string> {
  return JSZip.loadAsync(buffer).then((zip) =>
    zip.file('word/document.xml')!.async('string'),
  )
}

function fillSlots(
  xml: string,
  answers: {
    bodies: string[]
    choices: string[]
    keys: string[]
    points: string[]
  },
): string {
  const bodies = [...answers.bodies]
  const choices = [...answers.choices]
  const keys = [...answers.keys]
  const points = [...answers.points]
  return xml.replace(
    /<w:t xml:space="preserve">([^<]*)<\/w:t>/gu,
    (_whole, text: string) => {
      let next = text
      if (text.includes(SLOT)) next = text.replace(SLOT, bodies.shift() ?? '')
      else if (/^[A-E]\.$/u.test(text))
        next = `${text} ${choices.shift() ?? ''}`
      else if (text === 'Kunci:') next = `Kunci: ${keys.shift() ?? ''}`
      else if (text === 'Poin:') next = `Poin: ${points.shift() ?? ''}`
      return `<w:t xml:space="preserve">${next}</w:t>`
    },
  )
}

async function withDocumentXml(buffer: Buffer, xml: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  zip.file('word/document.xml', xml)
  return zip.generateAsync({ type: 'nodebuffer' })
}

describe('buildVerticalDocxTemplate', () => {
  it('lists one numbered slot per counted question and omits empty sections', async () => {
    const xml = await documentXml(
      await buildVerticalDocxTemplate(STANDARD_COUNTS),
    )

    expect(xml).toContain('BAGIAN PG')
    expect(xml).toContain('BAGIAN PG KOMPLEKS')
    expect(xml).toContain('BAGIAN BENAR/SALAH')
    expect(xml).toContain('BAGIAN URAIAN')
    expect(xml).not.toContain('BAGIAN ISIAN')
    expect(xml).toContain(`1. ${SLOT}`)
    expect(xml).toContain(`20. ${SLOT}`)
    expect(xml.match(/tulis soal di sini/gu)).toHaveLength(45)
    expect(xml.match(/<w:tbl>/gu)).toHaveLength(1)
    expect(xml).toContain('Versi Template')
  })

  it('parses the blank template to identity version 2 and only question errors', async () => {
    const sheet = await parseWordSheet(
      await buildVerticalDocxTemplate(STANDARD_COUNTS),
      noImages,
    )

    expect(sheet.identity.version).toBe(2)
    expect(sheet.questions).toEqual([])
    expect(sheet.errors.length).toBeGreaterThan(0)
    for (const issue of sheet.errors) {
      expect(issue.reason).toMatch(/^Bagian /u)
    }
  })

  it('round-trips a filled copy into the expected questions', async () => {
    const counts = {
      MULTIPLE_CHOICE: 1,
      MULTIPLE_RESPONSE: 1,
      TRUE_FALSE: 1,
      SHORT_ANSWER: 1,
      ESSAY: 1,
    }
    const template = await buildVerticalDocxTemplate(counts)
    const filled = fillSlots(await documentXml(template), {
      bodies: [
        'Berapa 2+3?',
        'Pilih bilangan genap.',
        'Bumi berbentuk bulat.',
        'Ibu kota Indonesia?',
        'Jelaskan gotong royong.',
      ],
      choices: ['4', '5', '6', '7', '2', '3', '4', '5', '6'],
      keys: ['B', 'A, C', 'Benar', 'Jakarta|DKI Jakarta', 'Kerja sama'],
      points: ['1', '2', '1', '1', '5'],
    })

    const sheet = await parseWordSheet(
      await withDocumentXml(template, filled),
      noImages,
    )

    expect(sheet.errors).toEqual([])
    expect(sheet.questions.map((question) => question.type)).toEqual([
      'MULTIPLE_CHOICE',
      'MULTIPLE_RESPONSE',
      'TRUE_FALSE',
      'SHORT_ANSWER',
      'ESSAY',
    ])
    expect(sheet.questions.map((question) => question.points)).toEqual([
      1, 2, 1, 1, 5,
    ])
    expect(sheet.questions[0]?.content).toMatchObject({
      answer: { key: 'B' },
    })
    expect(sheet.questions[1]?.content).toMatchObject({
      answer: { keys: ['A', 'C'] },
    })
    expect(sheet.questions[2]?.content).toMatchObject({
      answer: { value: true },
    })
    expect(sheet.questions[3]?.content).toMatchObject({
      answer: { accepted: ['Jakarta', 'DKI Jakarta'] },
    })
  })
})
