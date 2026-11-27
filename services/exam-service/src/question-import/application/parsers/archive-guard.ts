import { BadRequestException } from '@nestjs/common'
import JSZip from 'jszip'

const MAX_ENTRIES = 1000
const MAX_EXPANDED_BYTES = 60 * 1024 * 1024
const MAX_XML_BYTES = 20 * 1024 * 1024

export const TOO_BIG = 'Isi berkas terlalu besar setelah diekstrak'

export interface PartLimit {
  parts: RegExp
  maxBytes: number
  message: string
}

interface DeclaredEntry {
  _data?: { uncompressedSize?: number }
}

function isXml(name: string): boolean {
  return /\.(xml|rels)$/iu.test(name)
}

function inflateWithin(
  entry: JSZip.JSZipObject,
  limit: number,
  collect?: Buffer[],
  message: string = TOO_BIG,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = entry.nodeStream()
    let seen = 0
    stream.on('data', (chunk: Buffer) => {
      seen += chunk.length
      if (seen > limit) {
        stream.pause()
        reject(new BadRequestException(message))
        return
      }
      collect?.push(chunk)
    })
    stream.on('end', () => resolve(seen))
    stream.on('error', () =>
      reject(
        new BadRequestException('Isi berkas tidak sesuai dengan jenisnya'),
      ),
    )
  })
}

async function openChecked(buffer: Buffer): Promise<JSZip.JSZipObject[]> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new BadRequestException('Isi berkas tidak sesuai dengan jenisnya')
  }

  const entries = Object.values(zip.files)
  if (entries.length > MAX_ENTRIES) {
    throw new BadRequestException('Berkas berisi terlalu banyak bagian')
  }

  const declared = (entries as unknown as DeclaredEntry[]).reduce(
    (total, entry) => total + (entry._data?.uncompressedSize ?? 0),
    0,
  )
  if (declared > MAX_EXPANDED_BYTES) throw new BadRequestException(TOO_BIG)
  return entries
}

export interface XmlBudget {
  isXml: (name: string) => boolean
  partLimit: (name: string) => number
  total: number
}

const DEFAULT_XML: XmlBudget = {
  isXml,
  partLimit: () => MAX_XML_BYTES,
  total: MAX_EXPANDED_BYTES,
}

async function inflateEntries(
  buffer: Buffer,
  xml: XmlBudget,
  keep: (name: string) => boolean,
  partLimit?: PartLimit,
): Promise<Map<string, Buffer>> {
  const entries = await openChecked(buffer)
  const files = new Map<string, Buffer>()
  let expanded = 0
  let xmlExpanded = 0
  for (const entry of entries) {
    if (entry.dir) continue
    const counted = xml.isXml(entry.name)
    const remaining = MAX_EXPANDED_BYTES - expanded
    const budget = counted
      ? Math.min(remaining, xml.partLimit(entry.name), xml.total - xmlExpanded)
      : remaining
    const tight = partLimit?.parts.test(entry.name) === true
    const limit = tight ? Math.min(budget, partLimit.maxBytes) : budget
    const chunks: Buffer[] | undefined = keep(entry.name) ? [] : undefined
    const seen = await inflateWithin(
      entry,
      limit,
      chunks,
      tight ? partLimit.message : TOO_BIG,
    )
    expanded += seen
    if (counted) xmlExpanded += seen
    if (chunks !== undefined) files.set(entry.name, Buffer.concat(chunks))
  }
  return files
}

export function inflateArchive(
  buffer: Buffer,
  xml: XmlBudget = DEFAULT_XML,
  keep: (name: string) => boolean = () => true,
): Promise<Map<string, Buffer>> {
  return inflateEntries(buffer, xml, keep)
}

export function rebuildArchive(files: Map<string, Buffer>): Promise<Buffer> {
  const rebuilt = new JSZip()
  for (const [name, content] of files) {
    rebuilt.file(name, content, { createFolders: false })
  }
  return rebuilt.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export async function assertSafeArchive(buffer: Buffer): Promise<void> {
  await inflateEntries(buffer, DEFAULT_XML, () => false)
}

export async function normalizeArchive(
  buffer: Buffer,
  partLimit?: PartLimit,
): Promise<Buffer> {
  return rebuildArchive(
    await inflateEntries(buffer, DEFAULT_XML, () => true, partLimit),
  )
}
