import { BadRequestException } from '@nestjs/common'
import parseSax from 'exceljs/lib/utils/parse-sax.js'
import {
  inflateArchive,
  rebuildArchive,
  TOO_BIG,
  type XmlBudget,
} from './archive-guard.js'

const MB = 1024 * 1024
const MAX_WORKSHEETS = 8
const MAX_WORKSHEET_BYTES = 2 * MB
const MAX_CELLS = 20_000
const MAX_ROWS = 2_000
const MAX_SHEET_ELEMENTS = 60_000
const MAX_STRING_ELEMENTS = 150_000
const MAX_MERGED_CELLS = 5_000
const MAX_MERGE_ROW = 2_000
const SAX_CHUNK = 64 * 1024
const UNREADABLE = 'Berkas Excel tidak bisa dibaca'
const WIDE_MERGE =
  'Sel gabungan di berkas Excel terlalu luas. Pisahkan sel gabungan lalu unggah lagi'
const TOO_MANY_CELLS = 'Berkas Excel berisi terlalu banyak sel atau baris'
const TOO_MANY_STRINGS = 'Berkas Excel berisi terlalu banyak teks'

const READ_AS_WORKSHEET = /xl\/worksheets\/sheet\d+[.]xml/iu
const WORKSHEET = /^\/?xl\/worksheets\/sheet\d+\.xml$/u
const WORKBOOK = /^\/?xl\/workbook\.xml$/u
const SHARED_STRINGS = /^\/?xl\/sharedStrings\.xml$/u
const FLAT_MEDIA = /^\/?xl\/media\/[^/]+$/u
const KEPT = [
  /^\/?\[Content_Types\]\.xml$/u,
  /^\/?_rels\/\.rels$/u,
  /^\/?docProps\/(?:app|core)\.xml$/u,
  /^\/?xl\/_rels\/workbook\.xml\.rels$/u,
  /^\/?xl\/styles\.xml$/u,
  /^\/?xl\/theme\/theme\d+\.xml$/u,
  WORKBOOK,
  SHARED_STRINGS,
  WORKSHEET,
]
const MERGE_REF = /^([A-Z])(\d{1,4})(?::([A-Z])(\d{1,4}))?$/u

const XLSX_XML: XmlBudget = {
  isXml: (name) => !FLAT_MEDIA.test(name),
  partLimit: (name) => (SHARED_STRINGS.test(name) ? 4 * MB : MB),
  total: 8 * MB,
}

const SHEET_LAYOUT = new Set([
  'cols',
  'rowBreaks',
  'colBreaks',
  'sheetViews',
  'customSheetViews',
  'autoFilter',
  'sortState',
  'protectedRanges',
  'scenarios',
  'ignoredErrors',
  'headerFooter',
  'dataValidations',
  'conditionalFormatting',
  'hyperlinks',
  'drawing',
  'legacyDrawing',
  'legacyDrawingHF',
  'picture',
  'tableParts',
  'extLst',
])
const SHEET_LEFTOVERS = [
  ...SHEET_LAYOUT,
  'col',
  'brk',
  'sheetView',
  'filterColumn',
  'dataValidation',
  'cfRule',
  'hyperlink',
  'tablePart',
]
const BOOK_LAYOUT = new Set(['definedNames'])
const BOOK_LEFTOVERS = [...BOOK_LAYOUT, 'definedName']

interface OpenTag {
  name: string
  attributes: Record<string, string | undefined>
}

interface SheetTally {
  elements: number
  cells: number
  rows: number
  merged: number
}

const SKIPPED = [
  ['<!--', '-->'],
  ['<![CDATA[', ']]>'],
  ['<?', '?>'],
] as const

const TAG = /^<(\/?)([^\s/>]+)[\s\S]*?(\/?)>$/u

const unreadable = () => new BadRequestException(UNREADABLE)
const wideMerge = () => new BadRequestException(WIDE_MERGE)

function* textChunks(part: Buffer): Generator<string> {
  const decoder = new TextDecoder('utf-8')
  for (let at = 0; at < part.length; at += SAX_CHUNK) {
    yield decoder.decode(part.subarray(at, at + SAX_CHUNK), { stream: true })
  }
  yield decoder.decode()
}

async function assertWellFormed(
  part: Buffer,
  onOpen?: (tag: OpenTag) => void,
): Promise<void> {
  let depth = 0
  let roots = 0
  try {
    for await (const events of parseSax(textChunks(part))) {
      for (const event of events) {
        if (event.eventType === 'opentag') {
          if (depth === 0) roots += 1
          depth += 1
          onOpen?.(event.value)
        } else if (event.eventType === 'closetag') {
          depth -= 1
        }
      }
    }
  } catch (error) {
    if (error instanceof BadRequestException) throw error
    throw unreadable()
  }
  if (depth !== 0 || roots !== 1) throw unreadable()
}

function mergedArea(ref: string): number {
  const match = MERGE_REF.exec(ref)
  if (match === null) throw wideMerge()
  const [, fromColumn, fromRow, toColumn = fromColumn, toRow = fromRow] = match
  const rows = [Number(fromRow), Number(toRow)]
  if (Math.min(...rows) < 1 || Math.max(...rows) > MAX_MERGE_ROW) {
    throw wideMerge()
  }
  const columns = Math.abs(toColumn.charCodeAt(0) - fromColumn.charCodeAt(0))
  return (columns + 1) * (Math.abs(rows[1] - rows[0]) + 1)
}

function tallyOpen(tag: OpenTag, tally: SheetTally): void {
  const local = tag.name.slice(tag.name.indexOf(':') + 1)
  tally.elements += 1
  if (local === 'c') tally.cells += 1
  else if (local === 'row') tally.rows += 1
  else if (local === 'mergeCell') {
    tally.merged += mergedArea(tag.attributes.ref ?? '')
  }
  if (
    tally.elements > MAX_SHEET_ELEMENTS ||
    tally.cells > MAX_CELLS ||
    tally.rows > MAX_ROWS
  ) {
    throw new BadRequestException(TOO_MANY_CELLS)
  }
  if (tally.merged > MAX_MERGED_CELLS) throw wideMerge()
}

function markupEnd(xml: string, from: number): number {
  for (const [open, close] of SKIPPED) {
    if (xml.startsWith(open, from)) {
      const end = xml.indexOf(close, from + open.length)
      return end === -1 ? -1 : end + close.length
    }
  }
  let quote: string | null = null
  for (let at = from + 1; at < xml.length; at += 1) {
    const char = xml[at]
    if (quote !== null) {
      if (char === quote) quote = null
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === '>') {
      return at + 1
    }
  }
  return -1
}

function stripElements(xml: string, names: ReadonlySet<string>): string {
  const kept: string[] = []
  let from = 0
  let open: { name: string; start: number; depth: number } | null = null
  let at = xml.indexOf('<')
  while (at !== -1) {
    const end = markupEnd(xml, at)
    if (end === -1) throw unreadable()
    const tag = TAG.exec(xml.slice(at, end))
    if (tag !== null) {
      const [, closing, name, selfClosing] = tag
      if (open === null) {
        if (closing === '' && names.has(name.slice(name.indexOf(':') + 1))) {
          if (selfClosing === '/') {
            kept.push(xml.slice(from, at), ' ')
            from = end
          } else {
            open = { name, start: at, depth: 1 }
          }
        }
      } else if (name === open.name) {
        if (closing === '/') open.depth -= 1
        else if (selfClosing !== '/') open.depth += 1
        if (open.depth === 0) {
          kept.push(xml.slice(from, open.start), ' ')
          from = end
          open = null
        }
      }
    }
    at = xml.indexOf('<', end)
  }
  if (open !== null) throw unreadable()
  kept.push(xml.slice(from))
  return kept.join('')
}

function assertStripped(xml: string, names: readonly string[]): void {
  const leftover = new RegExp(
    `<\\s*(?:[^\\s<>/:]+:)?(?:${names.join('|')})(?=[\\s/>])`,
    'iu',
  )
  if (leftover.test(xml)) throw unreadable()
}

function sanitize(
  part: Buffer,
  names: ReadonlySet<string>,
  leftovers: readonly string[],
): Buffer {
  const stripped = stripElements(part.toString('utf8'), names)
  assertStripped(stripped, leftovers)
  return Buffer.from(stripped, 'utf8')
}

export async function prepareXlsx(buffer: Buffer): Promise<Buffer> {
  const files = await inflateArchive(
    buffer,
    XLSX_XML,
    (name) =>
      READ_AS_WORKSHEET.test(name) || KEPT.some((kept) => kept.test(name)),
  )
  const names = [...files.keys()]
  if (
    names.some((name) => READ_AS_WORKSHEET.test(name) && !WORKSHEET.test(name))
  ) {
    throw unreadable()
  }
  const sheets = names.filter((name) => WORKSHEET.test(name))
  if (sheets.length > MAX_WORKSHEETS) {
    throw new BadRequestException('Berkas berisi terlalu banyak lembar')
  }
  const sheetBytes = sheets.reduce(
    (total, name) => total + files.get(name)!.length,
    0,
  )
  if (sheetBytes > MAX_WORKSHEET_BYTES) throw new BadRequestException(TOO_BIG)
  const books = names.filter((name) => WORKBOOK.test(name))
  for (const name of books) await assertWellFormed(files.get(name)!)
  let strings = 0
  for (const name of names.filter((name) => SHARED_STRINGS.test(name))) {
    await assertWellFormed(files.get(name)!, () => {
      strings += 1
      if (strings > MAX_STRING_ELEMENTS) {
        throw new BadRequestException(TOO_MANY_STRINGS)
      }
    })
  }
  const tally: SheetTally = { elements: 0, cells: 0, rows: 0, merged: 0 }
  for (const name of sheets) {
    await assertWellFormed(files.get(name)!, (tag) => tallyOpen(tag, tally))
  }
  for (const name of sheets) {
    files.set(name, sanitize(files.get(name)!, SHEET_LAYOUT, SHEET_LEFTOVERS))
  }
  for (const name of books) {
    files.set(name, sanitize(files.get(name)!, BOOK_LAYOUT, BOOK_LEFTOVERS))
  }
  return rebuildArchive(files)
}
