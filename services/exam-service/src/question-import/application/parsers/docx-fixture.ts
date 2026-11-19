import JSZip from 'jszip'

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const NUMBERING = `${XML_HEADER}<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="multilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%2."/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`

const run = (lines: string[]): string =>
  `<w:r>${lines.map((line) => `<w:t xml:space="preserve">${line}</w:t>`).join('<w:br/>')}</w:r>`

export const para = (...lines: string[]): string => `<w:p>${run(lines)}</w:p>`

export const item = (level: number, ...lines: string[]): string =>
  `<w:p><w:pPr><w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="1"/></w:numPr></w:pPr>${run(lines)}</w:p>`

export async function buildDocx(body: string): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
  )
  zip.file(
    '_rels/.rels',
    `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/></Relationships>`,
  )
  zip.file(
    'word/_rels/document.xml.rels',
    `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/numbering" Target="numbering.xml"/></Relationships>`,
  )
  zip.file('word/numbering.xml', NUMBERING)
  zip.file(
    'word/document.xml',
    `${XML_HEADER}<w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
