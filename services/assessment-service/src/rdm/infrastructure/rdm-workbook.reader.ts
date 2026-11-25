import { BadRequestException } from '@nestjs/common'
import {
  detectRdmKind,
  normalizeStudentId,
  type RdmKind,
} from '../domain/rdm-rules.js'
import {
  findRows,
  parseCells,
  readCellRawValue,
  readCellText,
  type ParsedCell,
} from './rdm-sheet-xml.js'
import {
  INVALID_TEMPLATE_MESSAGE,
  loadSharedStrings,
  loadWorkbookZip,
  resolveWorkbookSheets,
} from './rdm-template-patcher.js'

export type RdmParsedCellValue =
  | { status: 'empty' }
  | { status: 'valid'; value: number }
  | { status: 'invalid' }

export interface RdmWorkbookRow {
  row: number
  nis: string
  nisn: string
  score: RdmParsedCellValue
}

export interface RdmWorkbookSheet {
  sheetName: string
  e2: string | null
  name: string | null
  material: string | null
  kktp: RdmParsedCellValue
  rows: RdmWorkbookRow[]
}

export interface RdmWorkbookReadResult {
  kind: RdmKind
  sheetNames: string[]
  e2: string | null
  sheets: RdmWorkbookSheet[]
}

const FIRST_STUDENT_ROW = 7

function parseRdmIntCell(
  cell: ParsedCell | undefined,
  sharedStrings: string[],
): RdmParsedCellValue {
  if (!cell) return { status: 'empty' }
  const raw = readCellRawValue(cell, sharedStrings)
  if (typeof raw === 'string') {
    return raw.trim() === '' ? { status: 'empty' } : { status: 'invalid' }
  }
  if (typeof raw === 'bigint') {
    if (raw < 0n || raw > 100n) return { status: 'invalid' }
    return { status: 'valid', value: Number(raw) }
  }
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw) || raw < 0 || raw > 100) {
      return { status: 'invalid' }
    }
    return { status: 'valid', value: raw }
  }
  return { status: 'invalid' }
}

function parseSheetXml(
  sheetName: string,
  sheetXml: string,
  sharedStrings: string[],
): RdmWorkbookSheet {
  const parsedRows = findRows(sheetXml)

  let e2: string | null = null
  let name: string | null = null
  let material: string | null = null
  let kktp: RdmParsedCellValue = { status: 'empty' }
  const rows: RdmWorkbookRow[] = []

  for (const parsedRow of parsedRows) {
    if (parsedRow.rowNumber === 2) {
      const cells = parseCells(parsedRow.innerXml)
      const b2Cell = cells.find((cell) => cell.colNum === 2)
      const e2Cell = cells.find((cell) => cell.colNum === 5)
      if (b2Cell) name = readCellText(b2Cell, sharedStrings)
      if (e2Cell) e2 = readCellText(e2Cell, sharedStrings)
      continue
    }
    if (parsedRow.rowNumber === 3) {
      const b3Cell = parseCells(parsedRow.innerXml).find(
        (cell) => cell.colNum === 2,
      )
      if (b3Cell) material = readCellText(b3Cell, sharedStrings)
      continue
    }
    if (parsedRow.rowNumber === 5) {
      const c5Cell = parseCells(parsedRow.innerXml).find(
        (cell) => cell.colNum === 3,
      )
      kktp = parseRdmIntCell(c5Cell, sharedStrings)
      continue
    }
    if (parsedRow.rowNumber < FIRST_STUDENT_ROW) continue

    const cells = parseCells(parsedRow.innerXml)
    const nisCell = cells.find((cell) => cell.colNum === 3)
    const nisnCell = cells.find((cell) => cell.colNum === 4)
    const scoreCell = cells.find((cell) => cell.colNum === 6)

    const nis = nisCell
      ? normalizeStudentId(readCellRawValue(nisCell, sharedStrings))
      : ''
    const nisn = nisnCell
      ? normalizeStudentId(readCellRawValue(nisnCell, sharedStrings))
      : ''
    const score = parseRdmIntCell(scoreCell, sharedStrings)

    if (nis !== '' || nisn !== '' || score.status !== 'empty') {
      rows.push({ row: parsedRow.rowNumber, nis, nisn, score })
    }
  }

  rows.sort((a, b) => a.row - b.row)
  return { sheetName, e2, name, material, kktp, rows }
}

export async function readRdmWorkbook(
  file: Buffer,
): Promise<RdmWorkbookReadResult> {
  const zip = await loadWorkbookZip(file)
  const sheetParts = await resolveWorkbookSheets(zip)
  const sheetNames = sheetParts.map((sheet) => sheet.name)
  const kind = detectRdmKind(sheetNames)
  const sharedStrings = await loadSharedStrings(zip)

  const sheets: RdmWorkbookSheet[] = []
  for (const part of sheetParts) {
    const entry = zip.file(part.partPath)
    if (!entry) {
      throw new BadRequestException(INVALID_TEMPLATE_MESSAGE)
    }
    const sheetXml = await entry.async('string')
    sheets.push(parseSheetXml(part.name, sheetXml, sharedStrings))
  }

  return {
    kind,
    sheetNames,
    e2: sheets[0]?.e2 ?? null,
    sheets,
  }
}
