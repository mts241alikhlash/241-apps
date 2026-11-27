import { BadRequestException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import type { Choice } from '../../../question/domain/value-objects/question-content.js'
import type { ImportSheet, SheetIdentity } from '../../domain/import-sheet.js'
import { IMPORT_MAX_QUESTIONS } from '../../domain/import-limits.js'
import {
  JENIS_TYPES,
  type ParsedQuestion,
} from '../../domain/parsed-question.js'
import {
  buildImportContent,
  ImportRowError,
  parsePoints,
} from '../../domain/policies/import-content.policy.js'
import { textToHtml } from '../../domain/policies/inline-latex.policy.js'
import { parseGradeLevel } from '../../domain/policies/validate-sheet.policy.js'

const CHOICE_COLUMNS = ['A', 'B', 'C', 'D', 'E'] as const

function readColumns(row: ExcelJS.Row): Map<string, number> {
  const columns = new Map<string, number>()
  row.eachCell((cell, column) => {
    columns.set(cell.text.trim().toLowerCase(), column)
  })
  return columns
}

function parseRow(
  row: ExcelJS.Row,
  columns: Map<string, number>,
): ParsedQuestion | null {
  const text = (column: string): string => {
    const index = columns.get(column)
    return index === undefined ? '' : row.getCell(index).text.trim()
  }

  const typeName = text('jenis')
  const body = text('soal')
  if (typeName === '' && body === '') return null

  const type = Object.hasOwn(JENIS_TYPES, typeName.toLowerCase())
    ? JENIS_TYPES[typeName.toLowerCase() as keyof typeof JENIS_TYPES]
    : undefined
  if (type === undefined) throw new ImportRowError('Jenis soal tidak dikenal')

  const choices: Choice[] = CHOICE_COLUMNS.flatMap((key) => {
    const value = text(key.toLowerCase())
    return value === '' ? [] : [{ key, html: textToHtml(value) }]
  })
  return {
    row: row.number,
    type,
    bodyHtml: textToHtml(body),
    content: buildImportContent(type, {
      choices,
      key: text('kunci'),
      ignoreHarakat: text('abaikan harakat').toLowerCase() === 'ya',
    }),
    points: parsePoints(text('poin')),
  }
}

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
    const row = sheet.findRow(number)
    if (row === undefined) continue
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
