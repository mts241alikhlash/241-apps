import ExcelJS from 'exceljs'
import {
  QUESTION_HEADERS,
  TEMPLATE_IDENTITY,
  TEMPLATE_NOTES,
  TEMPLATE_QUESTIONS,
} from './template-examples.js'

export async function buildXlsxTemplate(): Promise<Buffer> {
  const book = new ExcelJS.Workbook()
  const identity = book.addWorksheet('Identitas')
  TEMPLATE_IDENTITY.forEach((row) => identity.addRow(row))
  identity.getColumn(1).width = 18
  identity.getColumn(2).width = 40
  const sheet = book.addWorksheet('Soal')
  sheet.addRow(QUESTION_HEADERS).font = { bold: true }
  TEMPLATE_QUESTIONS.forEach((question) =>
    sheet.addRow([
      question.no,
      question.jenis,
      question.soal,
      ...question.choices,
      question.kunci,
      question.abaikanHarakat,
      question.poin,
    ]),
  )
  sheet.getColumn(3).width = 48
  const notes = book.addWorksheet('Petunjuk')
  TEMPLATE_NOTES.forEach((line) => notes.addRow([line]))
  notes.getColumn(1).width = 110
  return Buffer.from(await book.xlsx.writeBuffer())
}
