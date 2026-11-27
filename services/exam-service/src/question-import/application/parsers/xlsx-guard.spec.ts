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
      'a merge over C2:Z50000',
      '<mergeCells count="1"><mergeCell ref="C2:Z50000"/></mergeCells>',
      'mergeCell',
    ],
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
      'a prefixed merge',
      '<x:mergeCells xmlns:x="urn:x"><x:mergeCell ref="C2:Z50000"/></x:mergeCells>',
      'mergeCell',
    ],
    [
      'a merge hiding its end tag in a comment',
      '<mergeCells><!-- </mergeCells> --><mergeCell ref="C2:Z50000"/></mergeCells>',
      'mergeCell',
    ],
    [
      'hyperlinks, drawings and table parts',
      '<hyperlinks><hyperlink ref="A1:XFD1048576" r:id="rId9" xmlns:r="urn:r"/></hyperlinks><drawing r:id="rId8" xmlns:r="urn:r"/><legacyDrawing r:id="rId7" xmlns:r="urn:r"/><tableParts count="1"><tablePart r:id="rId6" xmlns:r="urn:r"/></tableParts><extLst><ext uri="x"><mergeCells/></ext></extLst>',
      'hyperlink',
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
})
