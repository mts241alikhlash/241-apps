import { BadRequestException } from '@nestjs/common'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { parseWordSheet } from './word-sheet.parser.js'

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const cell = (text: string) =>
  `<w:tc><w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:tc>`

const table = (rows: string[][]) =>
  `<w:tbl>${rows.map((row) => `<w:tr>${row.map(cell).join('')}</w:tr>`).join('')}</w:tbl>`

const IMAGE_CELL =
  '<w:tc><w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:embed="rId1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:tc>'

async function docx(body: string): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  )
  zip.file(
    '_rels/.rels',
    `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  )
  zip.file(
    'word/_rels/document.xml.rels',
    `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>`,
  )
  zip.file('word/media/image1.png', PNG)
  zip.file(
    'word/document.xml',
    `${XML_HEADER}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

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
  ['Versi Template', '2'],
  ['Nama Guru', 'Budi'],
  ['NIK', '3204000000000001'],
  ['Mapel', 'Matematika'],
  ['Tingkat', 'VIII'],
]

const PG_ROW = ['1', 'PG', 'Berapa $2+3$?', '4', '5', '6', '', '', 'B', '', '2']

const noImages = () => Promise.resolve('unused')

describe('parseWordSheet', () => {
  it('reads the identity table and the questions table', async () => {
    const sheet = await parseWordSheet(
      await docx(table(IDENTITY) + table([HEADERS, PG_ROW])),
      noImages,
    )

    expect(sheet.identity).toEqual({
      version: 2,
      teacherName: 'Budi',
      nik: '3204000000000001',
      subjectName: 'Matematika',
      gradeLevel: 8,
    })
    expect(sheet.errors).toEqual([])
    expect(sheet.warnings).toEqual([])
    expect(sheet.questions).toEqual([
      {
        row: 2,
        type: 'MULTIPLE_CHOICE',
        bodyHtml: '<p>Berapa <span data-latex="2+3">2+3</span>?</p>',
        content: {
          choices: [
            { key: 'A', html: '<p>4</p>' },
            { key: 'B', html: '<p>5</p>' },
            { key: 'C', html: '<p>6</p>' },
          ],
          answer: { key: 'B' },
        },
        points: 2,
      },
    ])
  })

  it('matches column names case-insensitively in any order', async () => {
    const reordered = [
      'poin',
      'KUNCI',
      'soal',
      'jenis',
      'A',
      'B',
      'C',
      'D',
      'E',
      'abaikan harakat',
      'no',
    ]
    const row = [
      '',
      'Jakarta|DKI',
      'Ibu kota?',
      'Isian',
      '',
      '',
      '',
      '',
      '',
      '',
      '2',
    ]
    const sheet = await parseWordSheet(
      await docx(table(IDENTITY) + table([reordered, row])),
      noImages,
    )

    expect(sheet.errors).toEqual([])
    expect(sheet.questions[0]).toMatchObject({
      row: 2,
      type: 'SHORT_ANSWER',
      points: 1,
      content: { answer: { accepted: ['Jakarta', 'DKI'] } },
    })
  })

  it('ignores a further table and reports it as a warning', async () => {
    const sheet = await parseWordSheet(
      await docx(
        table(IDENTITY) +
          table([HEADERS, PG_ROW]) +
          table([['catatan', 'tidak dibaca']]),
      ),
      noImages,
    )

    expect(sheet.questions).toHaveLength(1)
    expect(sheet.warnings).toHaveLength(1)
  })

  it('keeps math in the question body', async () => {
    const sheet = await parseWordSheet(
      await docx(table(IDENTITY) + table([HEADERS, PG_ROW])),
      noImages,
    )

    expect(sheet.questions[0].bodyHtml).toContain(
      '<span data-latex="2+3">2+3</span>',
    )
  })

  it('stores an embedded image once and references it by file id', async () => {
    const saved: { size: number; contentType: string }[] = []
    const sheet = await parseWordSheet(
      await docx(
        table(IDENTITY) +
          `<w:tbl><w:tr>${HEADERS.map(cell).join('')}</w:tr><w:tr>${cell('1')}${cell('Uraian')}${IMAGE_CELL}</w:tr></w:tbl>`,
      ),
      (content, contentType) => {
        saved.push({ size: content.length, contentType })
        return Promise.resolve('file-1')
      },
    )

    expect(saved).toHaveLength(1)
    expect(saved[0].contentType).toBe('image/png')
    expect(sheet.questions[0].bodyHtml).toContain('data-file-id="file-1"')
  })

  it('keeps Arabic harakat and reads several accepted answers', async () => {
    const sheet = await parseWordSheet(
      await docx(
        table(IDENTITY) +
          table([
            HEADERS,
            [
              '1',
              'Isian',
              'مَا مَعْنَى كِتَابٌ؟',
              '',
              '',
              '',
              '',
              '',
              'كِتَابٌ|buku',
              'Ya',
              '1',
            ],
          ]),
      ),
      noImages,
    )

    expect(sheet.questions[0].bodyHtml).toBe('<p>مَا مَعْنَى كِتَابٌ؟</p>')
    expect(sheet.questions[0].content).toMatchObject({
      answer: { accepted: ['كِتَابٌ', 'buku'], ignoreHarakat: true },
    })
  })

  it('reports a document without a table', async () => {
    const sheet = await parseWordSheet(
      await docx('<w:p><w:r><w:t>Tanpa tabel</w:t></w:r></w:p>'),
      noImages,
    )

    expect(sheet.identity).toEqual({
      version: null,
      teacherName: '',
      nik: '',
      subjectName: '',
      gradeLevel: null,
    })
    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toEqual([
      { row: 0, reason: 'Tabel soal tidak ditemukan' },
    ])
  })

  it('reports an unknown Jenis on its row', async () => {
    const sheet = await parseWordSheet(
      await docx(
        table(IDENTITY) +
          table([
            HEADERS,
            ['1', 'Esai', 'Soal', '', '', '', '', '', '', '', ''],
          ]),
      ),
      noImages,
    )

    expect(sheet.questions).toEqual([])
    expect(sheet.errors).toEqual([
      { row: 2, reason: 'Jenis soal tidak dikenal' },
    ])
  })

  it('rejects more than 500 questions', async () => {
    const rows = Array.from({ length: 501 }, () => PG_ROW)
    await expect(
      parseWordSheet(
        await docx(table(IDENTITY) + table([HEADERS, ...rows])),
        noImages,
      ),
    ).rejects.toThrow(new BadRequestException('Maksimal 500 soal per berkas'))
  })

  it('reports an unreadable document', async () => {
    await expect(
      parseWordSheet(Buffer.from('bukan docx'), noImages),
    ).rejects.toThrow('Berkas Word tidak bisa dibaca')
  })
})
