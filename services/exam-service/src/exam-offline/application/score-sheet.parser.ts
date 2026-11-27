import { BadRequestException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { normalizeArchive } from '../../question-import/application/parsers/archive-guard.js'
import {
  OFFLINE_IMPORT_MAX_BYTES,
  OFFLINE_IMPORT_MAX_ROWS,
  SCORE_SHEET_NAME,
} from '../domain/score-sheet.js'

export interface ScoreSheetRow {
  row: number
  participantNumber: string
  score: string
  note: string | null
}

interface Table {
  rowCount: number
  cell(row: number, column: number): string
}

const HEADER_SCAN = 10
const RAW_ROW_LIMIT = 10_000
const BOM = 0xfeff
const TAB = 9
const CARRIAGE_RETURN = 13
const SPACE = 32
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04])
const TOO_MANY = `Maksimal ${OFFLINE_IMPORT_MAX_ROWS} baris per berkas`
const MISMATCH = 'Isi berkas tidak sesuai dengan jenisnya'
const ARCHIVE_LIMITS = {
  partBytes: OFFLINE_IMPORT_MAX_BYTES,
  totalBytes: 4 * OFFLINE_IMPORT_MAX_BYTES,
  maxSheets: 3,
  message: 'Berkas terlalu besar untuk diimpor',
}
const LAYOUT_TAGS = [
  'mergeCells',
  'cols',
  'dataValidations',
  'conditionalFormatting',
  'hyperlinks',
  'drawing',
  'legacyDrawing',
  'legacyDrawingHF',
  'picture',
  'tableParts',
  'extLst',
]
const WORKSHEET_PART = /xl\/worksheets\/sheet\d+\.xml/iu
const WORKBOOK_PART = /^\/?xl\/workbook\.xml$/iu
const DROPPED_PART =
  /xl\/(worksheets\/_rels\/|drawings\/|tables\/|comments\d+\.xml)/iu
const COLUMNS = {
  number: ['nopeserta'],
  score: ['score', 'nilai'],
  note: ['note', 'catatan'],
}

function headerKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/gu, '')
}

function withoutElements(xml: string, names: string[]): string {
  const open = new RegExp(
    `<(?:[\\w.-]+:)?(${names.join('|')})(?=[\\s/>])[^<>]*>`,
    'gu',
  )
  let kept = ''
  let from = 0
  for (let found = open.exec(xml); found !== null; found = open.exec(xml)) {
    kept += xml.slice(from, found.index) + ' '
    from = open.lastIndex
    if (found[0].endsWith('/>')) continue
    const close = new RegExp(`</(?:[\\w.-]+:)?${found[1]}\\s*>`, 'gu')
    close.lastIndex = from
    if (close.exec(xml) === null) {
      throw new BadRequestException('Berkas Excel tidak bisa dibaca')
    }
    from = close.lastIndex
    open.lastIndex = from
  }
  return kept + xml.slice(from)
}

async function cellDataOnly(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue
    if (DROPPED_PART.test(entry.name)) {
      zip.remove(entry.name)
    } else if (WORKSHEET_PART.test(entry.name)) {
      const xml = await entry.async('string')
      zip.file(entry.name, withoutElements(xml, LAYOUT_TAGS))
    } else if (WORKBOOK_PART.test(entry.name)) {
      const xml = await entry.async('string')
      zip.file(entry.name, withoutElements(xml, ['definedNames']))
    }
  }
  return zip.generateAsync({ type: 'nodebuffer' })
}

async function readXlsx(buffer: Buffer): Promise<Table> {
  const checked = await cellDataOnly(
    await normalizeArchive(buffer, ARCHIVE_LIMITS),
  )
  const book = new ExcelJS.Workbook()
  try {
    await book.xlsx.load(checked as unknown as ExcelJS.Buffer)
  } catch {
    throw new BadRequestException('Berkas Excel tidak bisa dibaca')
  }
  const sheet = book.getWorksheet(SCORE_SHEET_NAME) ?? book.worksheets.at(0)
  if (sheet === undefined) {
    throw new BadRequestException('Berkas Excel tidak berisi lembar')
  }
  if (sheet.rowCount > RAW_ROW_LIMIT) throw new BadRequestException(TOO_MANY)
  return {
    rowCount: sheet.rowCount,
    cell: (row, column) => {
      const cell = sheet.getRow(row).getCell(column)
      return typeof cell.value === 'number'
        ? String(cell.value)
        : cell.text.trim()
    },
  }
}

function splitCsv(text: string, delimiter: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }
    if (char === '"' && field === '') {
      quoted = true
    } else if (char === delimiter) {
      record.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      record.push(field)
      records.push(record)
      if (records.length > RAW_ROW_LIMIT) {
        throw new BadRequestException(TOO_MANY)
      }
      record = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field)
    records.push(record)
  }
  return records
}

function hasControlCharacters(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    if (code < TAB || (code > CARRIAGE_RETURN && code < SPACE)) return true
  }
  return false
}

function readCsv(buffer: Buffer): Table {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    throw new BadRequestException('Berkas CSV tidak bisa dibaca')
  }
  if (hasControlCharacters(text)) {
    throw new BadRequestException('Berkas CSV tidak bisa dibaca')
  }
  if (text.charCodeAt(0) === BOM) text = text.slice(1)
  const firstLine = text.split(/\r?\n/u, 1)[0] ?? ''
  const delimiter =
    (firstLine.match(/;/gu)?.length ?? 0) >
    (firstLine.match(/,/gu)?.length ?? 0)
      ? ';'
      : ','
  const records = splitCsv(text, delimiter)
  return {
    rowCount: records.length,
    cell: (row, column) => (records[row - 1]?.[column - 1] ?? '').trim(),
  }
}

function findHeader(table: Table) {
  for (let row = 1; row <= Math.min(HEADER_SCAN, table.rowCount); row += 1) {
    const found: { number?: number; score?: number; note?: number } = {}
    for (let column = 1; column <= 30; column += 1) {
      const key = headerKey(table.cell(row, column))
      if (COLUMNS.number.includes(key)) found.number ??= column
      if (COLUMNS.score.includes(key)) found.score ??= column
      if (COLUMNS.note.includes(key)) found.note ??= column
    }
    if (found.number !== undefined && found.score !== undefined) {
      return { row, number: found.number, score: found.score, note: found.note }
    }
  }
  throw new BadRequestException('Kolom No. Peserta dan Score tidak ditemukan')
}

export async function parseScoreSheet(
  buffer: Buffer,
  originalName: string,
): Promise<ScoreSheetRow[]> {
  const extension = /\.(xlsx|csv)$/iu.exec(originalName)?.[1]?.toLowerCase()
  if (extension === undefined) {
    throw new BadRequestException('Berkas harus .xlsx atau .csv')
  }
  const zipped = buffer.subarray(0, 4).equals(ZIP_SIGNATURE)
  if (zipped !== (extension === 'xlsx')) {
    throw new BadRequestException(MISMATCH)
  }
  const table = zipped ? await readXlsx(buffer) : readCsv(buffer)
  const header = findHeader(table)

  const rows: ScoreSheetRow[] = []
  for (let row = header.row + 1; row <= table.rowCount; row += 1) {
    const line = {
      row,
      participantNumber: table.cell(row, header.number),
      score: table.cell(row, header.score),
      note: header.note === undefined ? null : table.cell(row, header.note),
    }
    if (line.participantNumber === '' && line.score === '' && !line.note)
      continue
    rows.push(line)
    if (rows.length > OFFLINE_IMPORT_MAX_ROWS) {
      throw new BadRequestException(TOO_MANY)
    }
  }
  return rows
}
