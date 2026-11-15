import JSZip from 'jszip'
import {
  QUESTION_HEADERS,
  TEMPLATE_IDENTITY,
  TEMPLATE_NOTES,
  TEMPLATE_QUESTIONS,
} from './template-examples.js'

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const BORDERS = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
  .map(
    (side) =>
      `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`,
  )
  .join('')
const TABLE_PROPERTIES = `<w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${BORDERS}</w:tblBorders></w:tblPr>`

function escapeXml(text: string): string {
  return text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
}

function paragraph(text: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
}

function cell(text: string | number | null): string {
  const content = text === null ? '' : String(text)
  return `<w:tc><w:p><w:r><w:t xml:space="preserve">${escapeXml(content)}</w:t></w:r></w:p></w:tc>`
}

function table(rows: (string | number | null)[][]): string {
  const body = rows
    .map((row) => `<w:tr>${row.map(cell).join('')}</w:tr>`)
    .join('')
  return `<w:tbl>${TABLE_PROPERTIES}${body}</w:tbl>`
}

function documentBody(): string {
  const identity = table(TEMPLATE_IDENTITY)
  const questions = table([
    QUESTION_HEADERS,
    ...TEMPLATE_QUESTIONS.map((question) => [
      question.no,
      question.jenis,
      question.soal,
      ...question.choices,
      question.kunci,
      question.abaikanHarakat,
      question.poin,
    ]),
  ])
  return [
    paragraph('Isi tabel identitas di bawah, lalu tabel soal.'),
    identity,
    paragraph('Tabel soal: satu baris satu soal. Jangan ubah judul kolom.'),
    questions,
    ...TEMPLATE_NOTES.map(paragraph),
  ].join('')
}

export async function buildDocxTemplate(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  )
  zip.file(
    '_rels/.rels',
    `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  )
  zip.file(
    'word/document.xml',
    `${XML_HEADER}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${documentBody()}</w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
