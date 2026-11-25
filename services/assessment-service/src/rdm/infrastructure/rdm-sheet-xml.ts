export interface XmlElementSpan {
  start: number
  end: number
  attrs: string
  openTagPrefix: string
  innerXml: string
  raw: string
}

export interface ParsedCell extends XmlElementSpan {
  ref: string
  colNum: number
}

export interface ParsedRow extends XmlElementSpan {
  rowNumber: number
}

export type CellWriteValue =
  { kind: 'string'; value: string } | { kind: 'number'; value: number }

export interface CellWriteTarget {
  ref: string
  colNum: number
  payload: CellWriteValue
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function unescapeXml(text: string): string {
  return text.replace(
    /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g,
    (entity, body: string) => {
      switch (body) {
        case 'amp':
          return '&'
        case 'lt':
          return '<'
        case 'gt':
          return '>'
        case 'quot':
          return '"'
        case 'apos':
          return "'"
        default: {
          const codePoint = body.startsWith('#x')
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10)
          return Number.isFinite(codePoint)
            ? String.fromCodePoint(codePoint)
            : entity
        }
      }
    },
  )
}

function colToNumber(col: string): number {
  let total = 0
  for (const ch of col) {
    total = total * 26 + (ch.charCodeAt(0) - 64)
  }
  return total
}

function parseCellRef(
  ref: string,
): { colNum: number; rowNumber: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(ref)
  if (!match?.[1] || !match[2]) return null
  return {
    colNum: colToNumber(match[1]),
    rowNumber: Number.parseInt(match[2], 10),
  }
}

export function readAttr(
  attrs: string,
  namePattern: string,
): string | undefined {
  return new RegExp(`(?:^|\\s)(?:${namePattern})="([^"]*)"`).exec(attrs)?.[1]
}

function scanElements(xml: string, tagName: 'row' | 'c'): XmlElementSpan[] {
  const spans: XmlElementSpan[] = []
  const startRegex = new RegExp(`<${tagName}\\b`, 'g')
  const openLen = 1 + tagName.length
  const closeTag = `</${tagName}>`
  let match: RegExpExecArray | null

  while ((match = startRegex.exec(xml)) !== null) {
    const start = match.index
    const gtIndex = xml.indexOf('>', start)
    if (gtIndex === -1) break

    const selfClosing = xml[gtIndex - 1] === '/'
    const attrs = xml.slice(
      start + openLen,
      selfClosing ? gtIndex - 1 : gtIndex,
    )

    if (selfClosing) {
      const end = gtIndex + 1
      spans.push({
        start,
        end,
        attrs,
        openTagPrefix: `<${tagName}${attrs}>`,
        innerXml: '',
        raw: xml.slice(start, end),
      })
      startRegex.lastIndex = end
      continue
    }

    const closeIndex = xml.indexOf(closeTag, gtIndex + 1)
    if (closeIndex === -1) break
    const end = closeIndex + closeTag.length
    spans.push({
      start,
      end,
      attrs,
      openTagPrefix: xml.slice(start, gtIndex + 1),
      innerXml: xml.slice(gtIndex + 1, closeIndex),
      raw: xml.slice(start, end),
    })
    startRegex.lastIndex = end
  }

  return spans
}

export function findRows(sheetXml: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  for (const span of scanElements(sheetXml, 'row')) {
    const rAttr = readAttr(span.attrs, 'r')
    const rowNumber = rAttr ? Number.parseInt(rAttr, 10) : Number.NaN
    if (Number.isInteger(rowNumber) && rowNumber > 0) {
      rows.push({ ...span, rowNumber })
    }
  }
  return rows
}

export function parseCells(rowBody: string): ParsedCell[] {
  const cells: ParsedCell[] = []
  for (const span of scanElements(rowBody, 'c')) {
    const ref = readAttr(span.attrs, 'r')
    const parsedRef = ref ? parseCellRef(ref) : null
    if (ref && parsedRef) {
      cells.push({ ...span, ref, colNum: parsedRef.colNum })
    }
  }
  return cells
}

function formatCellXml(
  ref: string,
  styleValue: string | undefined,
  payload: CellWriteValue,
): string {
  const styleAttr = styleValue !== undefined ? ` s="${styleValue}"` : ''
  if (payload.kind === 'string') {
    return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(payload.value)}</t></is></c>`
  }
  return `<c r="${ref}"${styleAttr}><v>${payload.value}</v></c>`
}

export function patchRowBody(
  rowBody: string,
  targets: CellWriteTarget[],
): string {
  const existingCells = parseCells(rowBody)
  const targetByRef = new Map(targets.map((target) => [target.ref, target]))
  const inserts = targets
    .filter((target) => !existingCells.some((cell) => cell.ref === target.ref))
    .sort((a, b) => a.colNum - b.colNum)

  let insertCursor = 0
  let cursor = 0
  const chunks: string[] = []

  for (const cell of existingCells) {
    chunks.push(rowBody.slice(cursor, cell.start))

    while (insertCursor < inserts.length) {
      const nextInsert = inserts[insertCursor]
      if (!nextInsert || nextInsert.colNum >= cell.colNum) break
      chunks.push(formatCellXml(nextInsert.ref, undefined, nextInsert.payload))
      insertCursor += 1
    }

    const replacement = targetByRef.get(cell.ref)
    if (replacement) {
      chunks.push(
        formatCellXml(cell.ref, readAttr(cell.attrs, 's'), replacement.payload),
      )
    } else {
      chunks.push(cell.raw)
    }
    cursor = cell.end
  }

  chunks.push(rowBody.slice(cursor))
  for (; insertCursor < inserts.length; insertCursor += 1) {
    const item = inserts[insertCursor]
    if (item) chunks.push(formatCellXml(item.ref, undefined, item.payload))
  }

  return chunks.join('')
}

function extractTextRuns(xmlFragment: string): string {
  let result = ''
  for (const match of xmlFragment.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
    result += unescapeXml(match[1] ?? '')
  }
  return result
}

function stripPhoneticRuns(xmlFragment: string): string {
  return xmlFragment
    .replace(/<rPh\b[^>]*>[\s\S]*?<\/rPh>/g, '')
    .replace(/<phoneticPr\b[^>]*\/>/g, '')
    .replace(/<phoneticPr\b[^>]*>[\s\S]*?<\/phoneticPr>/g, '')
}

export function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)].map(
    (match) => extractTextRuns(stripPhoneticRuns(match[1] ?? '')),
  )
}

function extractTagContent(xml: string, tagName: string): string | null {
  return (
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`).exec(
      xml,
    )?.[1] ?? null
  )
}

export function readCellRawValue(
  cell: ParsedCell,
  sharedStrings: string[],
): string | number | bigint | boolean {
  const cellType = readAttr(cell.attrs, 't')
  if (cellType === 's') {
    const indexText = extractTagContent(cell.innerXml, 'v')
    if (indexText === null) return ''
    const index = Number.parseInt(indexText, 10)
    return Number.isInteger(index) && index >= 0
      ? (sharedStrings[index] ?? '')
      : ''
  }
  if (cellType === 'inlineStr') {
    const isContent = extractTagContent(cell.innerXml, 'is')
    return isContent !== null ? extractTextRuns(isContent) : ''
  }
  if (cellType === 'str') {
    const valueText = extractTagContent(cell.innerXml, 'v')
    return valueText !== null ? unescapeXml(valueText) : ''
  }
  if (cellType === 'b') {
    return extractTagContent(cell.innerXml, 'v')?.trim() === '1'
  }
  if (cellType === 'e') {
    return extractTagContent(cell.innerXml, 'v') ?? '#ERROR!'
  }
  const valueText = extractTagContent(cell.innerXml, 'v')
  if (valueText === null) return ''
  const trimmed = valueText.trim()
  if (!trimmed) return ''
  if (/^\d+$/.test(trimmed)) return BigInt(trimmed)
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : trimmed
}

export function readCellText(
  cell: ParsedCell,
  sharedStrings: string[],
): string | null {
  const raw = readCellRawValue(cell, sharedStrings)
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return typeof raw === 'number' || typeof raw === 'bigint'
    ? raw.toString()
    : null
}
