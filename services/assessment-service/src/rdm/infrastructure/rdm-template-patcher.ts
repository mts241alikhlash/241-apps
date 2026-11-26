import { BadRequestException } from '@nestjs/common'
import JSZip from 'jszip'
import { normalizeStudentId } from '../domain/rdm-rules.js'
import {
  findRows,
  parseCells,
  parseSharedStrings,
  patchRowBody,
  readAttr,
  readCellRawValue,
  readCellText,
  unescapeXml,
  type CellWriteTarget,
} from './rdm-sheet-xml.js'
import {
  createDecompressionBudget,
  readEntryText,
  type DecompressionBudget,
} from './rdm-zip.js'

export interface RdmSheetPatch {
  sheetName: string
  name: string
  material: string | null
  kktp: number | null
  scores: Map<number, number>
}

export interface RdmTemplateRow {
  row: number
  nis: string
  nisn: string
}

export interface RdmTemplateReadResult {
  sheetNames: string[]
  e2: string | null
  rows: RdmTemplateRow[]
}

export interface SheetPart {
  name: string
  partPath: string
}

export const INVALID_TEMPLATE_MESSAGE = 'File ini bukan template RDM'

function normalizeTargetPath(target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  return target.startsWith('xl/') ? target : `xl/${target}`
}

export async function loadWorkbookZip(file: Buffer): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(file)
  } catch {
    throw new BadRequestException(INVALID_TEMPLATE_MESSAGE)
  }
}

export async function resolveWorkbookSheets(
  zip: JSZip,
  budget: DecompressionBudget,
): Promise<SheetPart[]> {
  const workbookEntry = zip.file('xl/workbook.xml')
  const relsEntry = zip.file('xl/_rels/workbook.xml.rels')
  if (!workbookEntry || !relsEntry) {
    throw new BadRequestException(INVALID_TEMPLATE_MESSAGE)
  }

  const workbookXml = await readEntryText(workbookEntry, budget)
  const relsXml = await readEntryText(relsEntry, budget)

  const targetByRelId = new Map<string, string>()
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = match[1] ?? ''
    const id = readAttr(attrs, 'Id')
    const target = readAttr(attrs, 'Target')
    if (id && target) targetByRelId.set(id, normalizeTargetPath(target))
  }

  const sheets: SheetPart[] = []
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attrs = match[1] ?? ''
    const rawName = readAttr(attrs, 'name')
    const relId = readAttr(attrs, '[A-Za-z_][\\w.-]*:id')
    if (!rawName || !relId) continue
    const partPath = targetByRelId.get(relId)
    if (!partPath || !zip.file(partPath)) {
      throw new BadRequestException(INVALID_TEMPLATE_MESSAGE)
    }
    sheets.push({ name: unescapeXml(rawName), partPath })
  }

  if (sheets.length === 0) {
    throw new BadRequestException(INVALID_TEMPLATE_MESSAGE)
  }
  return sheets
}

function buildRowTargets(patch: RdmSheetPatch): Map<number, CellWriteTarget[]> {
  const byRow = new Map<number, CellWriteTarget[]>()
  const addTarget = (rowNumber: number, target: CellWriteTarget) => {
    const list = byRow.get(rowNumber)
    if (list) list.push(target)
    else byRow.set(rowNumber, [target])
  }

  addTarget(2, {
    ref: 'B2',
    colNum: 2,
    payload: { kind: 'string', value: patch.name },
  })
  if (patch.material !== null) {
    addTarget(3, {
      ref: 'B3',
      colNum: 2,
      payload: { kind: 'string', value: patch.material },
    })
  }
  if (patch.kktp !== null) {
    addTarget(5, {
      ref: 'C5',
      colNum: 3,
      payload: { kind: 'number', value: patch.kktp },
    })
  }
  for (const [rowNumber, value] of patch.scores.entries()) {
    addTarget(rowNumber, {
      ref: `F${rowNumber}`,
      colNum: 6,
      payload: { kind: 'number', value },
    })
  }
  return byRow
}

function patchSheetXml(sheetXml: string, patch: RdmSheetPatch): string {
  const rowTargets = buildRowTargets(patch)
  const parsedRows = findRows(sheetXml)
  const existingRowNumbers = new Set(parsedRows.map((row) => row.rowNumber))

  for (const rowNumber of rowTargets.keys()) {
    if (!existingRowNumbers.has(rowNumber)) {
      throw new BadRequestException(
        `Baris ${rowNumber} tidak ditemukan pada sheet "${patch.sheetName}"`,
      )
    }
  }

  let cursor = 0
  const chunks: string[] = []
  for (const row of parsedRows) {
    const targets = rowTargets.get(row.rowNumber)
    if (!targets) continue
    chunks.push(sheetXml.slice(cursor, row.start))
    chunks.push(
      `${row.openTagPrefix}${patchRowBody(row.innerXml, targets)}</row>`,
    )
    cursor = row.end
  }
  chunks.push(sheetXml.slice(cursor))
  return chunks.join('')
}

export async function patchRdmTemplate(
  file: Buffer,
  patches: RdmSheetPatch[],
  maxUncompressedBytes?: number,
): Promise<Buffer> {
  const budget = createDecompressionBudget(maxUncompressedBytes)
  const zip = await loadWorkbookZip(file)
  const sheets = await resolveWorkbookSheets(zip, budget)
  const partBySheetName = new Map(
    sheets.map((sheet) => [sheet.name, sheet.partPath]),
  )

  for (const patch of patches) {
    const partPath = partBySheetName.get(patch.sheetName)
    const entry = partPath ? zip.file(partPath) : null
    if (!partPath || !entry) {
      throw new BadRequestException(
        `Sheet "${patch.sheetName}" tidak ditemukan di template RDM`,
      )
    }
    const sheetXml = await readEntryText(entry, budget)
    zip.file(partPath, patchSheetXml(sheetXml, patch))
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export async function loadSharedStrings(
  zip: JSZip,
  budget: DecompressionBudget,
): Promise<string[]> {
  const sharedStringsEntry = zip.file('xl/sharedStrings.xml')
  return sharedStringsEntry
    ? parseSharedStrings(await readEntryText(sharedStringsEntry, budget))
    : []
}

export async function readRdmTemplateRows(
  file: Buffer,
  maxUncompressedBytes?: number,
): Promise<RdmTemplateReadResult> {
  const budget = createDecompressionBudget(maxUncompressedBytes)
  const zip = await loadWorkbookZip(file)
  const sheets = await resolveWorkbookSheets(zip, budget)
  const firstSheet = sheets[0]
  if (!firstSheet) {
    throw new BadRequestException(INVALID_TEMPLATE_MESSAGE)
  }

  const sharedStrings = await loadSharedStrings(zip, budget)

  const firstSheetEntry = zip.file(firstSheet.partPath)
  if (!firstSheetEntry) {
    throw new BadRequestException(INVALID_TEMPLATE_MESSAGE)
  }

  const firstSheetXml = await readEntryText(firstSheetEntry, budget)
  const parsedRows = findRows(firstSheetXml)

  let e2: string | null = null
  const rows: RdmTemplateRow[] = []

  for (const parsedRow of parsedRows) {
    if (parsedRow.rowNumber === 2) {
      const e2Cell = parseCells(parsedRow.innerXml).find(
        (cell) => cell.ref === 'E2',
      )
      if (e2Cell) e2 = readCellText(e2Cell, sharedStrings)
      continue
    }
    if (parsedRow.rowNumber < 7) continue

    const cells = parseCells(parsedRow.innerXml)
    const nisCell = cells.find((cell) => cell.colNum === 3)
    const nisnCell = cells.find((cell) => cell.colNum === 4)
    const nis = nisCell
      ? normalizeStudentId(readCellRawValue(nisCell, sharedStrings))
      : ''
    const nisn = nisnCell
      ? normalizeStudentId(readCellRawValue(nisnCell, sharedStrings))
      : ''

    if (nis !== '' || nisn !== '') {
      rows.push({ row: parsedRow.rowNumber, nis, nisn })
    }
  }

  rows.sort((a, b) => a.row - b.row)
  return { sheetNames: sheets.map((sheet) => sheet.name), e2, rows }
}
