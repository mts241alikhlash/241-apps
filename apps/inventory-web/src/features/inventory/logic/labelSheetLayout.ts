export interface PaperSize {
  id: string
  label: string
  widthMm: number
  heightMm: number
}

export const PAPER_SIZES: PaperSize[] = [
  { id: 'a4', label: 'A4 (210 × 297)', widthMm: 210, heightMm: 297 },
  { id: 'f4', label: 'F4 / Folio (215 × 330)', widthMm: 215, heightMm: 330 },
  { id: 'a3', label: 'A3 (297 × 420)', widthMm: 297, heightMm: 420 },
  { id: 'a5', label: 'A5 (148 × 210)', widthMm: 148, heightMm: 210 },
  { id: 'letter', label: 'Letter (216 × 279)', widthMm: 216, heightMm: 279 },
  { id: 'legal', label: 'Legal (216 × 356)', widthMm: 216, heightMm: 356 },
]

export const DEFAULT_PAPER_ID = 'a4'

export const LABEL_WIDTH_MM = 58
export const LOGO_SIDE_MM = 16
export const LABEL_HEIGHT_MM = LOGO_SIDE_MM

export const PAGE_MARGIN_MM = 8

export const CELL_PADDING_MM = 3

export const SAFETY_MM = 2

const TEXT_INSET_MM = 3

const NUMBER_CHAR_BUDGET = 24

const CHAR_WIDTH_RATIO = 0.62
const LINE_HEIGHT = 1.15

const NAME_CHAR_WIDTH_RATIO = 0.5

const NAME_LINES = 2

const NAME_CHAR_BUDGET = 24

const NAME_MIN_FONT_MM = 1.8

export const LOGO_MM = LOGO_SIDE_MM
export const TEXT_WIDTH_MM = LABEL_WIDTH_MM - LOGO_MM - TEXT_INSET_MM

const ROW_HEIGHT_MM = LABEL_HEIGHT_MM / 2 - 1

const NUMBER_BY_WIDTH = TEXT_WIDTH_MM / (NUMBER_CHAR_BUDGET * CHAR_WIDTH_RATIO)
const NUMBER_BY_HEIGHT = ROW_HEIGHT_MM / LINE_HEIGHT

export const NUMBER_FONT_MM = Math.min(NUMBER_BY_WIDTH, NUMBER_BY_HEIGHT)

export function nameFontMm(name: string): number {
  const characters = Math.max(1, name.trim().length)
  const budget = characters * NAME_CHAR_WIDTH_RATIO

  const onOneLine = Math.min(
    TEXT_WIDTH_MM / budget,
    ROW_HEIGHT_MM / LINE_HEIGHT,
  )
  const onTwoLines = Math.min(
    (TEXT_WIDTH_MM * NAME_LINES) / budget,
    ROW_HEIGHT_MM / (LINE_HEIGHT * NAME_LINES),
  )

  const ceiling = TEXT_WIDTH_MM / (NAME_CHAR_BUDGET * NAME_CHAR_WIDTH_RATIO)
  const wanted = Math.min(ceiling, Math.max(onOneLine, onTwoLines))

  return Math.max(NAME_MIN_FONT_MM, wanted)
}

export interface LabelSheetLayout {
  paper: PaperSize
  cellWidthMm: number
  cellHeightMm: number
  columns: number
  rowsPerPage: number
  labelsPerPage: number
}

export function paperById(id: string | undefined): PaperSize {
  return (
    PAPER_SIZES.find((paper) => paper.id === id) ??
    PAPER_SIZES.find((paper) => paper.id === DEFAULT_PAPER_ID)!
  )
}

export function labelSheetLayout(
  paperId: string | undefined,
): LabelSheetLayout {
  const paper = paperById(paperId)

  const cellWidthMm = LABEL_WIDTH_MM + CELL_PADDING_MM * 2
  const cellHeightMm = LABEL_HEIGHT_MM + CELL_PADDING_MM * 2

  const printableWidth = paper.widthMm - PAGE_MARGIN_MM * 2
  const printableHeight = paper.heightMm - PAGE_MARGIN_MM * 2

  const columns = Math.max(1, Math.floor(printableWidth / cellWidthMm))
  const rowsPerPage = Math.max(
    1,
    Math.floor((printableHeight - SAFETY_MM) / cellHeightMm),
  )

  return {
    paper,
    cellWidthMm,
    cellHeightMm,
    columns,
    rowsPerPage,
    labelsPerPage: columns * rowsPerPage,
  }
}

export function paginateLabels<T>(units: T[], size: number): T[][] {
  if (size < 1) return units.length > 0 ? [units] : []

  const pages: T[][] = []
  for (let i = 0; i < units.length; i += size) {
    pages.push(units.slice(i, i + size))
  }
  return pages
}
