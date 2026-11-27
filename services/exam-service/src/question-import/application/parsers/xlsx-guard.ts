import { BadRequestException } from '@nestjs/common'
import parseSax from 'exceljs/lib/utils/parse-sax.js'
import {
  inflateArchive,
  rebuildArchive,
  type XmlBudget,
} from './archive-guard.js'

const MB = 1024 * 1024
const MAX_WORKSHEETS = 8
const SAX_CHUNK = 64 * 1024
const UNREADABLE = 'Berkas Excel tidak bisa dibaca'

const XLSX_XML: XmlBudget = {
  isXml: (name) => /\.(xml|rels|vml)$/iu.test(name),
  partLimit: (name) => (/sharedStrings\.xml$/iu.test(name) ? 4 * MB : MB),
  total: 8 * MB,
}

const WORKSHEET = /xl\/worksheets\/sheet\d+[.]xml/iu
const WORKBOOK = /^\/*xl\/workbook[.]xml$/iu

const SHEET_LAYOUT = new Set([
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
])
const SHEET_LEFTOVERS = [
  ...SHEET_LAYOUT,
  'mergeCell',
  'col',
  'dataValidation',
  'cfRule',
  'hyperlink',
  'tablePart',
]
const BOOK_LAYOUT = new Set(['definedNames'])
const BOOK_LEFTOVERS = [...BOOK_LAYOUT, 'definedName']

const SKIPPED = [
  ['<!--', '-->'],
  ['<![CDATA[', ']]>'],
  ['<?', '?>'],
] as const

const TAG = /^<(\/?)([^\s/>]+)[\s\S]*?(\/?)>$/u

const unreadable = () => new BadRequestException(UNREADABLE)

function* textChunks(part: Buffer): Generator<string> {
  const decoder = new TextDecoder('utf-8')
  for (let at = 0; at < part.length; at += SAX_CHUNK) {
    yield decoder.decode(part.subarray(at, at + SAX_CHUNK), { stream: true })
  }
  yield decoder.decode()
}

async function assertWellFormed(part: Buffer): Promise<void> {
  let depth = 0
  let roots = 0
  try {
    for await (const events of parseSax(textChunks(part))) {
      for (const event of events) {
        if (event.eventType === 'opentag') {
          if (depth === 0) roots += 1
          depth += 1
        } else if (event.eventType === 'closetag') {
          depth -= 1
        }
      }
    }
  } catch {
    throw unreadable()
  }
  if (depth !== 0 || roots !== 1) throw unreadable()
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
  const files = await inflateArchive(buffer, XLSX_XML)
  const sheets = [...files.keys()].filter((name) => WORKSHEET.test(name))
  if (sheets.length > MAX_WORKSHEETS) {
    throw new BadRequestException('Berkas berisi terlalu banyak lembar')
  }
  const books = [...files.keys()].filter((name) => WORKBOOK.test(name))
  for (const name of [...books, ...sheets]) {
    await assertWellFormed(files.get(name)!)
  }
  for (const name of sheets) {
    files.set(name, sanitize(files.get(name)!, SHEET_LAYOUT, SHEET_LEFTOVERS))
  }
  for (const name of books) {
    files.set(name, sanitize(files.get(name)!, BOOK_LAYOUT, BOOK_LEFTOVERS))
  }
  return rebuildArchive(files)
}
