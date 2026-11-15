import { BadRequestException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import type { ImportSheet, SheetIdentity } from '../../domain/import-sheet.js'
import { IMPORT_MAX_QUESTIONS } from '../../domain/import-limits.js'
import { ImportRowError } from '../../domain/policies/import-content.policy.js'
import { parseGradeLevel } from '../../domain/policies/validate-sheet.policy.js'
import { parseRow, readColumns } from './excel-question.parser.js'

function readIdentity(book: ExcelJS.Workbook): SheetIdentity {
  const sheet = book.getWorksheet('Identitas')
  const values = new Map<string, string>()
  sheet?.eachRow((row) => {
    values.set(
      row.getCell(1).text.trim().toLowerCase(),
      row.getCell(2).text.trim(),
    )
  })
  const version = values.get('versi template') ?? ''
  return {
    version: /^\d+$/.test(version) ? Number(version) : null,
    teacherName: values.get('nama guru') ?? '',
    nik: values.get('nik') ?? '',
    subjectName: values.get('mapel') ?? '',
    gradeLevel: parseGradeLevel(values.get('tingkat') ?? ''),
  }
}

export async function parseExcelSheet(buffer: Buffer): Promise<ImportSheet> {
  const book = new ExcelJS.Workbook()
  try {
    await book.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  } catch {
    throw new BadRequestException('Berkas Excel tidak bisa dibaca')
  }

  const result: ImportSheet = {
    identity: readIdentity(book),
    questions: [],
    errors: [],
    warnings: [],
  }
  const sheet = book.getWorksheet('Soal')
  if (sheet === undefined) {
    result.errors.push({ row: 0, reason: 'Lembar Soal tidak ditemukan' })
    return result
  }

  const columns = readColumns(sheet.getRow(1))
  if (!columns.has('jenis') || !columns.has('soal')) {
    throw new BadRequestException('Kolom Jenis dan Soal tidak ditemukan')
  }

  let counted = 0
  for (let number = 2; number <= sheet.rowCount; number += 1) {
    const row = sheet.getRow(number)
    try {
      const question = parseRow(row, columns)
      if (question === null) continue
      counted += 1
      result.questions.push(question)
    } catch (error) {
      if (!(error instanceof ImportRowError)) throw error
      counted += 1
      result.errors.push({ row: row.number, reason: error.message })
    }
    if (counted > IMPORT_MAX_QUESTIONS) {
      throw new BadRequestException('Maksimal 500 soal per berkas')
    }
  }
  return result
}
