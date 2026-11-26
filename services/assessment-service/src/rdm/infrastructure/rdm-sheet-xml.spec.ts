import { parseSharedStrings } from './rdm-sheet-xml.js'

describe('rdm-sheet-xml parseSharedStrings', () => {
  it('treats self-closing <si/> as empty string without shifting subsequent indices', () => {
    const xml =
      '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">' +
      '<si><t>Pertama</t></si>' +
      '<si/>' +
      '<si xml:space="preserve" />' +
      '<si><t>Keempat</t></si>' +
      '</sst>'

    const result = parseSharedStrings(xml)

    expect(result).toEqual(['Pertama', '', '', 'Keempat'])
    expect(result[3]).toBe('Keempat')
  })

  it('strips <rPh> and <phoneticPr> runs before collecting <t> text', () => {
    const xml =
      '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<si><r><t>Ab</t></r><rPh sb="0" eb="2"><t>x</t></rPh><phoneticPr fontId="1"/></si>' +
      '<si><r><t>Cd</t></r><rPh><t>y</t></rPh><r><t>Ef</t></r><phoneticPr fontId="0">z</phoneticPr></si>' +
      '</sst>'

    expect(parseSharedStrings(xml)).toEqual(['Ab', 'CdEf'])
  })
})
