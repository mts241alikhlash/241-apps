import { BadRequestException } from '@nestjs/common'
import JSZip from 'jszip'
import { buildXlsxTemplate } from '../templates/xlsx-template.js'
import { prepareXlsx } from './xlsx-guard.js'

const SHEET = 'xl/worksheets/sheet2.xml'
const BOOK = 'xl/workbook.xml'
const UNREADABLE = new BadRequestException('Berkas Excel tidak bisa dibaca')
const TOO_BIG = new BadRequestException(
  'Isi berkas terlalu besar setelah diekstrak',
)
const WIDE_MERGE = new BadRequestException(
  'Sel gabungan di berkas Excel terlalu luas. Pisahkan sel gabungan lalu unggah lagi',
)
const TOO_MANY_CELLS = new BadRequestException(
  'Berkas Excel berisi terlalu banyak sel atau baris',
)

async function withParts(
  buffer: Buffer,
  parts: Record<string, string | Buffer>,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  for (const [name, content] of Object.entries(parts)) zip.file(name, content)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

const sheetOf = (body: string) =>
  `<worksheet><sheetData>${body}</sheetData></worksheet>`

async function edit(
  buffer: Buffer,
  name: string,
  change: (xml: string) => string,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  zip.file(name, change(await zip.file(name)!.async('string')))
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

async function partOf(buffer: Buffer, name: string): Promise<string> {
  return (await JSZip.loadAsync(buffer)).file(name)!.async('string')
}

const afterSheetData = (inserted: string) => (xml: string) =>
  xml.replace('</sheetData>', `</sheetData>${inserted}`)

describe('prepareXlsx', () => {
  let template: Buffer

  beforeAll(async () => {
    template = await buildXlsxTemplate()
  })

  it('keeps the cells of an ordinary file', async () => {
    const prepared = await prepareXlsx(template)
    const cells = (xml: string) =>
      /<sheetData>[\s\S]*<\/sheetData>/u.exec(xml)?.[0]

    expect(cells(await partOf(prepared, SHEET))).toBe(
      cells(await partOf(template, SHEET)),
    )
    expect(cells(await partOf(template, SHEET))).toContain('<row')
  })

  it.each([
    [
      'a data validation over the whole sheet',
      '<dataValidations count="1"><dataValidation type="list" sqref="A1:XFD1048576"><formula1>"a,b"</formula1></dataValidation></dataValidations>',
      'dataValidation',
    ],
    [
      'a conditional format over the whole sheet',
      '<conditionalFormatting sqref="A1:XFD1048576"><cfRule type="expression" priority="1"><formula>TRUE</formula></cfRule></conditionalFormatting>',
      'cfRule',
    ],
    [
      'hyperlinks, drawings and table parts',
      '<hyperlinks><hyperlink ref="A1:XFD1048576" r:id="rId9" xmlns:r="urn:r"/></hyperlinks><drawing r:id="rId8" xmlns:r="urn:r"/><legacyDrawing r:id="rId7" xmlns:r="urn:r"/><tableParts count="1"><tablePart r:id="rId6" xmlns:r="urn:r"/></tableParts><extLst><ext uri="x"><mergeCells/></ext></extLst>',
      'hyperlink',
    ],
    [
      'row and column breaks, views and filters',
      '<rowBreaks count="2"><brk id="1"/><brk id="2"/></rowBreaks><colBreaks><brk id="3"/></colBreaks><autoFilter ref="A1:K1"><filterColumn colId="0"/></autoFilter>',
      'brk',
    ],
  ])('strips %s from a worksheet', async (_, bomb, child) => {
    const prepared = await prepareXlsx(
      await edit(template, SHEET, afterSheetData(bomb)),
    )
    const xml = await partOf(prepared, SHEET)

    expect(xml).not.toContain(`<${child}`)
    expect(xml).not.toContain(':mergeCell')
    expect(xml).toContain('<sheetData>')
    expect(xml).toContain('</worksheet>')
  })

  it('strips a column range up to 3000000', async () => {
    const prepared = await prepareXlsx(
      await edit(template, SHEET, (xml) =>
        xml.replace(
          '<sheetData>',
          '<cols><col min="1" max="3000000" width="9"/></cols><sheetData>',
        ),
      ),
    )

    expect(await partOf(prepared, SHEET)).not.toMatch(/<cols?[\s/>]/u)
  })

  it('strips defined names from the workbook', async () => {
    const prepared = await prepareXlsx(
      await edit(template, BOOK, (xml) =>
        xml.replace(
          '</sheets>',
          '</sheets><definedNames><definedName name="x">Soal!$A$1:$XFD$1048576</definedName></definedNames>',
        ),
      ),
    )
    const xml = await partOf(prepared, BOOK)

    expect(xml).not.toContain('definedName')
    expect(xml).toContain('<sheets>')
  })

  it.each([
    ['a split name', '<merge<cols></cols>Cells><mergeCell ref="C2:Z50000"/>'],
    ['a tag inside a tag', '<mergeCells<cols/>><mergeCell ref="C2:Z50000"/>'],
    ['an unclosed element', '<mergeCells>'],
  ])('refuses %s', async (_, broken) => {
    await expect(
      prepareXlsx(await edit(template, SHEET, afterSheetData(broken))),
    ).rejects.toThrow(UNREADABLE)
  })

  it('refuses a truncated workbook', async () => {
    await expect(
      prepareXlsx(
        await edit(template, BOOK, (xml) => xml.slice(0, xml.length - 20)),
      ),
    ).rejects.toThrow(UNREADABLE)
  })

  it('refuses 59 worksheet parts', async () => {
    const zip = await JSZip.loadAsync(template)
    for (let index = 4; index <= 59; index += 1) {
      zip.file(
        `xl/worksheets/sheet${index}.xml`,
        '<worksheet><sheetData/></worksheet>',
      )
    }

    await expect(
      prepareXlsx(await zip.generateAsync({ type: 'nodebuffer' })),
    ).rejects.toThrow(
      new BadRequestException('Berkas berisi terlalu banyak lembar'),
    )
  })

  it('refuses one XML part over 1 MB', async () => {
    const padded = await edit(template, SHEET, (xml) =>
      xml.replace('<sheetData>', `${' '.repeat(1024 * 1024)}<sheetData>`),
    )

    await expect(prepareXlsx(padded)).rejects.toThrow(TOO_BIG)
  })

  it('refuses XML parts over 8 MB together', async () => {
    const zip = await JSZip.loadAsync(template)
    for (let index = 0; index < 9; index += 1) {
      zip.file(`xl/extra${index}.xml`, `<a>${' '.repeat(1000 * 1000)}</a>`)
    }

    await expect(
      prepareXlsx(
        await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
      ),
    ).rejects.toThrow(TOO_BIG)
  })

  it('keeps a small merge that ExcelJS needs to read merged text', async () => {
    const merge = '<mergeCells count="1"><mergeCell ref="B2:B3"/></mergeCells>'
    const prepared = await prepareXlsx(
      await edit(template, SHEET, afterSheetData(merge)),
    )

    expect(await partOf(prepared, SHEET)).toContain(merge)
  })

  it.each([
    ['a merge over C2:Z50000', '<mergeCell ref="C2:Z50000"/>'],
    ['a merge past column Z', '<mergeCell ref="A2:AA3"/>'],
    ['a merge past row 2000', '<mergeCell ref="B1999:B2001"/>'],
    [
      'merges over 5000 cells together',
      Array.from(
        { length: 26 },
        (_, index) =>
          `<mergeCell ref="${String.fromCharCode(65 + index)}1:${String.fromCharCode(65 + index)}200"/>`,
      ).join(''),
    ],
    ['an unreadable merge range', '<mergeCell ref="B$2:B3"/>'],
  ])('refuses %s', async (_, refs) => {
    await expect(
      prepareXlsx(
        await edit(
          template,
          SHEET,
          afterSheetData(`<mergeCells>${refs}</mergeCells>`),
        ),
      ),
    ).rejects.toThrow(WIDE_MERGE)
  })

  it.each([
    [
      'a prefixed merge',
      '<x:mergeCells xmlns:x="urn:x"><x:mergeCell ref="C2:Z50000"/></x:mergeCells>',
    ],
    [
      'a merge hiding its end tag in a comment',
      '<mergeCells><!-- </mergeCells> --><mergeCell ref="C2:Z50000"/></mergeCells>',
    ],
  ])('refuses %s over C2:Z50000', async (_, bomb) => {
    await expect(
      prepareXlsx(await edit(template, SHEET, afterSheetData(bomb))),
    ).rejects.toThrow(WIDE_MERGE)
  })

  it.each([
    ['a worksheet name with a suffix', 'xl/worksheets/sheet9.xml.bak'],
    ['a worksheet name inside media', 'xl/media/xl/worksheets/sheet9.xml.png'],
    ['a worksheet name in another folder', 'other/xl/worksheets/sheet9.xml'],
  ])('refuses %s that ExcelJS would read as a sheet', async (_, name) => {
    await expect(
      prepareXlsx(await withParts(template, { [name]: sheetOf('') })),
    ).rejects.toThrow(UNREADABLE)
  })

  it('counts every part that is not a flat media file against the XML limits', async () => {
    await expect(
      prepareXlsx(
        await withParts(template, {
          'xl/printerSettings/settings.bin': Buffer.alloc(1024 * 1024 + 1),
        }),
      ),
    ).rejects.toThrow(TOO_BIG)
    await expect(
      prepareXlsx(
        await withParts(template, {
          'xl/media/image1.png': Buffer.alloc(2 * 1024 * 1024),
        }),
      ),
    ).resolves.toBeInstanceOf(Buffer)
  })

  it('allows a larger shared strings part only at xl/sharedStrings.xml', async () => {
    const strings = `<sst>${' '.repeat(2 * 1024 * 1024)}</sst>`

    await expect(
      prepareXlsx(
        await withParts(template, { 'xl/sharedStrings.xml': strings }),
      ),
    ).resolves.toBeInstanceOf(Buffer)
    await expect(
      prepareXlsx(
        await withParts(template, { 'other/xl/sharedStrings.xml': strings }),
      ),
    ).rejects.toThrow(TOO_BIG)
  })

  it('hands ExcelJS only the parts that carry cell values', async () => {
    const prepared = await prepareXlsx(
      await withParts(template, {
        'xl/comments1.xml': '<comments/>',
        'xl/drawings/vmlDrawing1.vml': '<xml/>',
        'xl/drawings/drawing1.xml': '<wsDr/>',
        'xl/tables/table1.xml': '<table/>',
        'xl/worksheets/_rels/sheet2.xml.rels': '<Relationships/>',
        'xl/media/image1.png': Buffer.from('png'),
        'customXml/item1.xml': '<a/>',
      }),
    )

    expect(Object.keys((await JSZip.loadAsync(prepared)).files).sort()).toEqual(
      [
        '[Content_Types].xml',
        '_rels/.rels',
        'docProps/app.xml',
        'docProps/core.xml',
        'xl/_rels/workbook.xml.rels',
        'xl/sharedStrings.xml',
        'xl/styles.xml',
        'xl/theme/theme1.xml',
        'xl/workbook.xml',
        'xl/worksheets/sheet1.xml',
        'xl/worksheets/sheet2.xml',
        'xl/worksheets/sheet3.xml',
      ],
    )
  })

  it('refuses worksheets over 2 MB together', async () => {
    const padded = sheetOf(' '.repeat(700 * 1024))

    await expect(
      prepareXlsx(
        await withParts(template, {
          'xl/worksheets/sheet4.xml': padded,
          'xl/worksheets/sheet5.xml': padded,
          'xl/worksheets/sheet6.xml': padded,
        }),
      ),
    ).rejects.toThrow(TOO_BIG)
  })

  it.each([
    ['more than 20000 cells', '<row r="1">' + '<c/>'.repeat(20_001) + '</row>'],
    ['more than 2000 rows', '<row/>'.repeat(2_001)],
    [
      'prefixed cells',
      '<x:row xmlns:x="urn:x">' + '<x:c/>'.repeat(20_001) + '</x:row>',
    ],
  ])('refuses %s across the worksheets', async (_, body) => {
    await expect(
      prepareXlsx(
        await withParts(template, {
          'xl/worksheets/sheet4.xml': sheetOf(body),
        }),
      ),
    ).rejects.toThrow(TOO_MANY_CELLS)
  })

  it('refuses more than 60000 elements across the worksheets', async () => {
    await expect(
      prepareXlsx(
        await withParts(template, {
          'xl/worksheets/sheet4.xml': sheetOf(
            `<row r="1"><c r="A1">${'<x/>'.repeat(60_001)}</c></row>`,
          ),
        }),
      ),
    ).rejects.toThrow(TOO_MANY_CELLS)
  })

  it('refuses shared strings with more than 150000 elements', async () => {
    await expect(
      prepareXlsx(
        await withParts(template, {
          'xl/sharedStrings.xml': `<sst>${'<si/>'.repeat(150_001)}</sst>`,
        }),
      ),
    ).rejects.toThrow(
      new BadRequestException('Berkas Excel berisi terlalu banyak teks'),
    )
  })

  it('refuses malformed shared strings', async () => {
    await expect(
      prepareXlsx(
        await withParts(template, { 'xl/sharedStrings.xml': '<sst><si>' }),
      ),
    ).rejects.toThrow(UNREADABLE)
  })

  it('refuses styles with more than 20000 elements', async () => {
    const zip = await JSZip.loadAsync(template)
    const styles = await zip.file('xl/styles.xml')!.async('string')
    zip.file(
      'xl/styles.xml',
      styles.replace('</cellXfs>', `${'<xf/>'.repeat(20_001)}</cellXfs>`),
    )

    await expect(
      prepareXlsx(await zip.generateAsync({ type: 'nodebuffer' })),
    ).rejects.toThrow(
      new BadRequestException('Berkas Excel berisi terlalu banyak gaya sel'),
    )
  })
})
