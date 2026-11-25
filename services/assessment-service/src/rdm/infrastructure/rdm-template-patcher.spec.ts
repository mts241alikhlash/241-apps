import { BadRequestException } from '@nestjs/common'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { buildRdmTemplateFixture } from '../testing/rdm-template.fixture.js'
import {
  patchRdmTemplate,
  readRdmTemplateRows,
  type RdmSheetPatch,
} from './rdm-template-patcher.js'

const STUDENTS = [
  { nis: '260001', nisn: '0143909888', name: 'Aisyah' },
  { nis: '260002', nisn: '0143909889', name: 'Budi' },
  { nis: '', nisn: '0143909890', name: 'Citra' },
]

function extractElement(xml: string, tagName: string): string {
  const match = new RegExp(
    `<${tagName}\\b[^>]*(?:\\/>|>[\\s\\S]*?<\\/${tagName}>)`,
  ).exec(xml)
  if (!match) {
    throw new Error(`Missing <${tagName}> in worksheet XML`)
  }
  return match[0]
}

async function resolveSheetParts(zip: JSZip): Promise<Map<string, string>> {
  const workbookXml = await zip.file('xl/workbook.xml')!.async('string')
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string')

  const targetByRelId = new Map<string, string>()
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = match[1] ?? ''
    const id = /\bId="([^"]+)"/.exec(attrs)?.[1]
    const target = /\bTarget="([^"]+)"/.exec(attrs)?.[1]
    if (!id || !target) continue
    const normalized = target.startsWith('/')
      ? target.slice(1)
      : target.startsWith('xl/')
        ? target
        : `xl/${target}`
    targetByRelId.set(id, normalized)
  }

  const partByName = new Map<string, string>()
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attrs = match[1] ?? ''
    const name = /\bname="([^"]+)"/.exec(attrs)?.[1]
    const rId = /\br:id="([^"]+)"/.exec(attrs)?.[1]
    if (!name || !rId) continue
    const part = targetByRelId.get(rId)
    if (part) partByName.set(name, part)
  }

  return partByName
}

describe('rdm-template-patcher', () => {
  let sumatifTemplate: Buffer
  let sasTemplate: Buffer

  beforeAll(async () => {
    ;[sumatifTemplate, sasTemplate] = await Promise.all([
      buildRdmTemplateFixture('sumatif', STUDENTS),
      buildRdmTemplateFixture('sas', STUDENTS),
    ])
  })

  it('patches B2, B3, C5, and F scores so ExcelJS reads back exact input values', async () => {
    const patch: RdmSheetPatch = {
      sheetName: 'SUM 1',
      name: "Tugas & Praktik <1> 'a'",
      material: 'Bilangan Bulat & Pecahan "Dasar"',
      kktp: 72,
      scores: new Map([
        [7, 85],
        [8, 90],
        [9, 100],
      ]),
    }

    const patched = await patchRdmTemplate(sumatifTemplate, [patch])

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(
      patched as unknown as Parameters<typeof workbook.xlsx.load>[0],
    )
    const sheet = workbook.getWorksheet('SUM 1')!

    expect(sheet.getCell('B2').text).toBe("Tugas & Praktik <1> 'a'")
    expect(sheet.getCell('B3').text).toBe('Bilangan Bulat & Pecahan "Dasar"')
    expect(sheet.getCell('C5').value).toBe(72)
    expect(sheet.getCell('F7').value).toBe(85)
    expect(sheet.getCell('F8').value).toBe(90)
    expect(sheet.getCell('F9').value).toBe(100)
    expect(sheet.getCell('F10').value).toBeNull()
  })

  it('patches SAS 1 template without touching other entries', async () => {
    const patched = await patchRdmTemplate(sasTemplate, [
      {
        sheetName: 'SAS 1',
        name: 'SAS Ganjil',
        material: null,
        kktp: null,
        scores: new Map([
          [7, 78],
          [9, 92],
        ]),
      },
    ])

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(
      patched as unknown as Parameters<typeof workbook.xlsx.load>[0],
    )
    const sheet = workbook.getWorksheet('SAS 1')!
    expect(sheet.getCell('B2').text).toBe('SAS Ganjil')
    expect(sheet.getCell('F7').value).toBe(78)
    expect(sheet.getCell('F8').value).toBeNull()
    expect(sheet.getCell('F9').value).toBe(92)
  })

  it('replaces an already-filled F7 keeping a single <c r="F7" element and its s attribute', async () => {
    const first = await patchRdmTemplate(sumatifTemplate, [
      {
        sheetName: 'SUM 1',
        name: 'PH 1',
        material: 'Materi 1',
        kktp: 70,
        scores: new Map([[7, 71]]),
      },
    ])

    const second = await patchRdmTemplate(first, [
      {
        sheetName: 'SUM 1',
        name: 'PH 1 Baru',
        material: 'Materi 1 Baru',
        kktp: 75,
        scores: new Map([[7, 88]]),
      },
    ])

    const inputZip = await JSZip.loadAsync(sumatifTemplate)
    const outputZip = await JSZip.loadAsync(second)
    const parts = await resolveSheetParts(outputZip)
    const sum1Part = parts.get('SUM 1')!

    const originalXml = await inputZip.file(sum1Part)!.async('string')
    const patchedXml = await outputZip.file(sum1Part)!.async('string')

    const originalF7Style = /<c\b[^>]*\br="F7"[^>]*\bs="([^"]+)"/.exec(
      originalXml,
    )?.[1]
    const f7Matches = patchedXml.match(/<c\b[^>]*\br="F7"/g) ?? []
    expect(f7Matches).toHaveLength(1)
    expect(
      new RegExp(`<c\\b[^>]*\\br="F7"[^>]*\\bs="${originalF7Style}"`).test(
        patchedXml,
      ),
    ).toBe(true)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(
      second as unknown as Parameters<typeof workbook.xlsx.load>[0],
    )
    const sheet = workbook.getWorksheet('SUM 1')!
    expect(sheet.getCell('B2').text).toBe('PH 1 Baru')
    expect(sheet.getCell('B3').text).toBe('Materi 1 Baru')
    expect(sheet.getCell('C5').value).toBe(75)
    expect(sheet.getCell('F7').value).toBe(88)
  })

  it('keeps every unpatched zip entry, unpatched sheet, and protected structural XML byte-identical', async () => {
    const patched = await patchRdmTemplate(sumatifTemplate, [
      {
        sheetName: 'SUM 1',
        name: 'UH 1',
        material: 'Aljabar',
        kktp: 70,
        scores: new Map([[7, 80]]),
      },
    ])

    const inputZip = await JSZip.loadAsync(sumatifTemplate)
    const outputZip = await JSZip.loadAsync(patched)
    const parts = await resolveSheetParts(inputZip)
    const sum1Part = parts.get('SUM 1')!

    const inputNames = Object.keys(inputZip.files).sort()
    const outputNames = Object.keys(outputZip.files).sort()
    expect(outputNames).toEqual(inputNames)

    for (const name of inputNames) {
      if (name === sum1Part) continue
      const entry = inputZip.file(name)
      if (!entry || entry.dir) continue
      const inBytes = await entry.async('nodebuffer')
      const outBytes = await outputZip.file(name)!.async('nodebuffer')
      expect(outBytes.equals(inBytes)).toBe(true)
    }

    const originalSum1 = await inputZip.file(sum1Part)!.async('string')
    const patchedSum1 = await outputZip.file(sum1Part)!.async('string')
    expect(patchedSum1).not.toBe(originalSum1)

    for (const tag of [
      'sheetProtection',
      'cols',
      'dataValidations',
      'mergeCells',
    ]) {
      expect(extractElement(patchedSum1, tag)).toBe(
        extractElement(originalSum1, tag),
      )
    }
  })

  it('leaves B3 and C5 untouched when material or kktp is null', async () => {
    const seeded = await patchRdmTemplate(sumatifTemplate, [
      {
        sheetName: 'SUM 1',
        name: 'UH 1',
        material: 'Materi Awal',
        kktp: 70,
        scores: new Map(),
      },
    ])

    const updated = await patchRdmTemplate(seeded, [
      {
        sheetName: 'SUM 1',
        name: 'UH 1 Revisi',
        material: null,
        kktp: null,
        scores: new Map([[7, 91]]),
      },
    ])

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(
      updated as unknown as Parameters<typeof workbook.xlsx.load>[0],
    )
    const sheet = workbook.getWorksheet('SUM 1')!
    expect(sheet.getCell('B2').text).toBe('UH 1 Revisi')
    expect(sheet.getCell('B3').text).toBe('Materi Awal')
    expect(sheet.getCell('C5').value).toBe(70)
    expect(sheet.getCell('F7').value).toBe(91)
  })

  it('inserts missing cells in column order and throws when a target row is missing', async () => {
    const zip = await JSZip.loadAsync(sumatifTemplate)
    const parts = await resolveSheetParts(zip)
    const sum1Part = parts.get('SUM 1')!
    const sheetXml = await zip.file(sum1Part)!.async('string')

    const withMissingF7AndExtraG7 = sheetXml.replace(
      /<c\b[^>]*\br="F7"[^>]*\/>/,
      '<c r="G7"><v>1</v></c>',
    )
    expect(withMissingF7AndExtraG7).not.toBe(sheetXml)

    zip.file(sum1Part, withMissingF7AndExtraG7)
    const missingCellBuf = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    const patched = await patchRdmTemplate(missingCellBuf, [
      {
        sheetName: 'SUM 1',
        name: 'UH 1',
        material: null,
        kktp: null,
        scores: new Map([[7, 84]]),
      },
    ])

    const patchedZip = await JSZip.loadAsync(patched)
    const patchedXml = await patchedZip.file(sum1Part)!.async('string')
    const row7 =
      /<row\b[^>]*\br="7"[^>]*>([\s\S]*?)<\/row>/.exec(patchedXml)?.[1] ?? ''
    const cellRefs = [...row7.matchAll(/<c\b[^>]*\br="([A-Z]+\d+)"/g)].map(
      (m) => m[1],
    )
    expect(cellRefs).toEqual(['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7'])

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(
      patched as unknown as Parameters<typeof workbook.xlsx.load>[0],
    )
    expect(workbook.getWorksheet('SUM 1')!.getCell('F7').value).toBe(84)

    await expect(
      patchRdmTemplate(sumatifTemplate, [
        {
          sheetName: 'SUM 1',
          name: 'UH 1',
          material: null,
          kktp: null,
          scores: new Map([[108, 80]]),
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('resolves sheet names through workbook.xml and workbook.xml.rels rather than assuming sheetN order', async () => {
    const zip = await JSZip.loadAsync(sumatifTemplate)
    const workbookXml = await zip.file('xl/workbook.xml')!.async('string')
    const swappedWorkbook = workbookXml
      .replace('name="SUM 1"', 'name="TEMP_SUM"')
      .replace('name="SUM 2"', 'name="SUM 1"')
      .replace('name="TEMP_SUM"', 'name="SUM 2"')
    zip.file('xl/workbook.xml', swappedWorkbook)
    const swappedBuf = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    const patched = await patchRdmTemplate(swappedBuf, [
      {
        sheetName: 'SUM 1',
        name: 'Swapped Target',
        material: null,
        kktp: null,
        scores: new Map([[7, 95]]),
      },
    ])

    const outZip = await JSZip.loadAsync(patched)
    const sheet2Xml = await outZip
      .file('xl/worksheets/sheet2.xml')!
      .async('string')
    const sheet1Xml = await outZip
      .file('xl/worksheets/sheet1.xml')!
      .async('string')
    expect(sheet2Xml).toContain('Swapped Target')
    expect(sheet1Xml).not.toContain('Swapped Target')
  })

  it('readRdmTemplateRows reads sheetNames, E2, and normalized NIS/NISN rows in row order', async () => {
    const result = await readRdmTemplateRows(sumatifTemplate)

    expect(result.sheetNames).toEqual(
      Array.from({ length: 15 }, (_, i) => `SUM ${i + 1}`),
    )
    expect(result.e2).toBe('IX.A/Informatika')
    expect(result.rows).toEqual([
      { row: 7, nis: '260001', nisn: '0143909888' },
      { row: 8, nis: '260002', nisn: '0143909889' },
      { row: 9, nis: '', nisn: '0143909890' },
    ])
  })

  it('readRdmTemplateRows reads inline strings, numeric student IDs, and null E2 when empty', async () => {
    const emptySasTemplate = await buildRdmTemplateFixture('sas', [])
    const zip = await JSZip.loadAsync(emptySasTemplate)
    const parts = await resolveSheetParts(zip)
    const sasPart = parts.get('SAS 1')!
    const xml = await zip.file(sasPart)!.async('string')

    const updatedXml = xml
      .replace(
        /<c\b[^>]*\br="E2"[^>]*(?:\/>|>[\s\S]*?<\/c>)/,
        '<c r="E2" t="inlineStr"><is><t xml:space="preserve">VIII.B &amp; IPA</t></is></c>',
      )
      .replace(
        /<row\b([^>]*\br="7"[^>]*)>([\s\S]*?)<\/row>/,
        '<row $1><c r="C7"><v>260010</v></c><c r="D7" t="inlineStr"><is><t>0155500001</t></is></c>$2</row>',
      )
    zip.file(sasPart, updatedXml)
    const buf = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    const result = await readRdmTemplateRows(buf)
    expect(result.sheetNames).toEqual(['SAS 1'])
    expect(result.e2).toBe('VIII.B & IPA')
    expect(result.rows).toEqual([{ row: 7, nis: '260010', nisn: '0155500001' }])

    const blankE2Xml = xml.replace(
      /<c\b[^>]*\br="E2"[^>]*(?:\/>|>[\s\S]*?<\/c>)/,
      '<c r="E2"/>',
    )
    zip.file(sasPart, blankE2Xml)
    const blankE2Buf = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })
    const blankResult = await readRdmTemplateRows(blankE2Buf)
    expect(blankResult.e2).toBeNull()
    expect(blankResult.rows).toEqual([])
  })

  it('rejects when patching a sheet name missing from workbook', async () => {
    await expect(
      patchRdmTemplate(sasTemplate, [
        {
          sheetName: 'SUM 1',
          name: 'UH 1',
          material: null,
          kktp: null,
          scores: new Map(),
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('refuses a zip whose sheet entry decompresses past the byte budget on read and patch', async () => {
    const zip = await JSZip.loadAsync(sasTemplate)
    const bigPayload = 'A'.repeat(20_000)
    zip.file(
      'xl/worksheets/sheet1.xml',
      `<worksheet><sheetData><row r="2"><c r="B2" t="inlineStr"><is><t>${bigPayload}</t></is></c></row></sheetData></worksheet>`,
    )
    const bomb = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    await expect(readRdmTemplateRows(bomb, 4096)).rejects.toThrow(
      new BadRequestException('File terlalu besar setelah diekstrak'),
    )

    await expect(
      patchRdmTemplate(
        bomb,
        [
          {
            sheetName: 'SAS 1',
            name: 'UAS',
            material: null,
            kktp: null,
            scores: new Map(),
          },
        ],
        4096,
      ),
    ).rejects.toThrow(
      new BadRequestException('File terlalu besar setelah diekstrak'),
    )
  })
})
