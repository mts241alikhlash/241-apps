import { BadRequestException, HttpException } from '@nestjs/common'
import mammoth from 'mammoth'
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
import { inlineToHtml } from '../../domain/policies/inline-latex.policy.js'
import { parseGradeLevel } from '../../domain/policies/validate-sheet.policy.js'
import type { ImageSaver } from './word-question.parser.js'

const TABLE = /<table\b[^>]*>([\s\S]*?)<\/table>/gu
const ROW = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gu
const CELL = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gu
const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E'] as const
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

function plain(html: string): string {
  return html
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/gu, (entity) => ENTITIES[entity] ?? '')
    .replace(/\s+/gu, ' ')
    .trim()
}

function isBlank(html: string): boolean {
  return plain(html) === '' && !/<img\b/u.test(html)
}

function rowsOf(table: string): string[][] {
  return [...table.matchAll(ROW)].map((row) =>
    [...(row[1] ?? '').matchAll(CELL)].map((cell) => cell[1] ?? ''),
  )
}

function readIdentity(rows: string[][]): SheetIdentity {
  const values = new Map<string, string>()
  for (const [label = '', value = ''] of rows) {
    values.set(plain(label).toLowerCase(), plain(value))
  }
  const version = values.get('versi template') ?? ''
  return {
    version: /^\d+$/u.test(version) ? Number(version) : null,
    teacherName: values.get('nama guru') ?? '',
    nik: values.get('nik') ?? '',
    subjectName: values.get('mapel') ?? '',
    gradeLevel: parseGradeLevel(values.get('tingkat') ?? ''),
  }
}

function readColumns(header: string[]): Map<string, number> {
  const columns = new Map<string, number>()
  header.forEach((cell, index) => columns.set(plain(cell).toLowerCase(), index))
  return columns
}

function toQuestion(
  row: number,
  cells: string[],
  columns: Map<string, number>,
): ParsedQuestion | null {
  const cell = (name: string): string => {
    const index = columns.get(name)
    return index === undefined ? '' : (cells[index] ?? '')
  }

  const typeName = plain(cell('jenis'))
  const body = cell('soal')
  if (typeName === '' && plain(body) === '') return null

  const type = Object.hasOwn(JENIS_TYPES, typeName.toLowerCase())
    ? JENIS_TYPES[typeName.toLowerCase() as keyof typeof JENIS_TYPES]
    : undefined
  if (type === undefined) throw new ImportRowError('Jenis soal tidak dikenal')

  const choices: Choice[] = CHOICE_KEYS.flatMap((key) => {
    const html = cell(key.toLowerCase())
    return isBlank(html) ? [] : [{ key, html: inlineToHtml(html) }]
  })
  return {
    row,
    type,
    bodyHtml: inlineToHtml(body),
    content: buildImportContent(type, {
      choices,
      key: plain(cell('kunci')),
      ignoreHarakat: plain(cell('abaikan harakat')).toLowerCase() === 'ya',
    }),
    points: parsePoints(plain(cell('poin'))),
  }
}

async function convert(buffer: Buffer, saveImage: ImageSaver): Promise<string> {
  try {
    const converted = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const id = await saveImage(
            await image.readAsBuffer(),
            image.contentType,
          )
          return { 'data-file-id': id } as unknown as { src: string }
        }),
      },
    )
    return converted.value
  } catch (error) {
    if (error instanceof HttpException) throw error
    throw new BadRequestException('Berkas Word tidak bisa dibaca')
  }
}

export async function parseWordSheet(
  buffer: Buffer,
  saveImage: ImageSaver,
): Promise<ImportSheet> {
  const html = await convert(buffer, saveImage)
  const tables = [...html.matchAll(TABLE)].map((match) =>
    rowsOf(match[1] ?? ''),
  )

  const result: ImportSheet = {
    identity: readIdentity(tables[0] ?? []),
    questions: [],
    errors: [],
    warnings: tables.slice(2).map(() => 'Tabel tambahan diabaikan'),
  }
  const questionRows = tables[1]
  if (questionRows === undefined) {
    result.errors.push({ row: 0, reason: 'Tabel soal tidak ditemukan' })
    return result
  }

  const [header = [], ...data] = questionRows
  const columns = readColumns(header)
  if (!columns.has('jenis') || !columns.has('soal')) {
    throw new BadRequestException('Kolom Jenis dan Soal tidak ditemukan')
  }

  let counted = 0
  for (const [index, cells] of data.entries()) {
    const row = index + 2
    try {
      const question = toQuestion(row, cells, columns)
      if (question === null) continue
      counted += 1
      result.questions.push(question)
    } catch (error) {
      if (!(error instanceof ImportRowError)) throw error
      counted += 1
      result.errors.push({ row, reason: error.message })
    }
    if (counted > IMPORT_MAX_QUESTIONS) {
      throw new BadRequestException('Maksimal 500 soal per berkas')
    }
  }
  return result
}
