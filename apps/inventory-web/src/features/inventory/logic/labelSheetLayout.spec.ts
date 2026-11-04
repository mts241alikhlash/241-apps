import { describe, expect, it } from 'vitest'
import {
  CELL_PADDING_MM,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  LOGO_MM,
  NUMBER_FONT_MM,
  PAGE_MARGIN_MM,
  PAPER_SIZES,
  SAFETY_MM,
  TEXT_WIDTH_MM,
  labelSheetLayout,
  nameFontMm,
  paginateLabels,
  paperById,
} from './labelSheetLayout'

const EVERY_PAPER = PAPER_SIZES.map((paper) => paper.id)

const printable = (paperId: string) => {
  const paper = paperById(paperId)
  return {
    widthMm: paper.widthMm - PAGE_MARGIN_MM * 2,
    heightMm: paper.heightMm - PAGE_MARGIN_MM * 2,
  }
}

describe('the label is one size', () => {
  it.each(EVERY_PAPER)(
    'measures the same on %s as anywhere else',
    (paperId) => {
      const layout = labelSheetLayout(paperId)

      expect(layout.cellWidthMm).toBe(LABEL_WIDTH_MM + CELL_PADDING_MM * 2)
      expect(layout.cellHeightMm).toBe(LABEL_HEIGHT_MM + CELL_PADDING_MM * 2)
    },
  )

  it('fits more on A3 than on A4, and more on A4 than on A5', () => {
    expect(labelSheetLayout('a3').labelsPerPage).toBeGreaterThan(
      labelSheetLayout('a4').labelsPerPage,
    )
    expect(labelSheetLayout('a4').labelsPerPage).toBeGreaterThan(
      labelSheetLayout('a5').labelsPerPage,
    )
  })

  it('lays A4 out three across and twelve down', () => {
    const layout = labelSheetLayout('a4')

    expect(layout.columns).toBe(3)
    expect(layout.rowsPerPage).toBe(12)
    expect(layout.labelsPerPage).toBe(36)
  })
})

describe('nothing overflows the page', () => {
  it.each(EVERY_PAPER)('%s stays inside the width', (paperId) => {
    const layout = labelSheetLayout(paperId)

    expect(layout.columns * layout.cellWidthMm).toBeLessThanOrEqual(
      printable(paperId).widthMm,
    )
  })

  it.each(EVERY_PAPER)('%s stays inside the height', (paperId) => {
    const layout = labelSheetLayout(paperId)

    expect(layout.rowsPerPage * layout.cellHeightMm).toBeLessThanOrEqual(
      printable(paperId).heightMm,
    )
  })

  it.each(EVERY_PAPER)('%s wastes neither a row nor a column', (paperId) => {
    const layout = labelSheetLayout(paperId)
    const { widthMm, heightMm } = printable(paperId)

    expect(widthMm - layout.columns * layout.cellWidthMm).toBeLessThan(
      layout.cellWidthMm,
    )
    expect(
      heightMm - SAFETY_MM - layout.rowsPerPage * layout.cellHeightMm,
    ).toBeLessThan(layout.cellHeightMm)
  })

  it.each(EVERY_PAPER)('%s fits at least one label', (paperId) => {
    const layout = labelSheetLayout(paperId)

    expect(layout.cellWidthMm).toBeLessThanOrEqual(printable(paperId).widthMm)
    expect(layout.cellHeightMm).toBeLessThanOrEqual(printable(paperId).heightMm)
  })
})

describe('the three parts of the label', () => {
  it('makes the logo square and the label as tall as it', () => {
    expect(LOGO_MM).toBe(LABEL_HEIGHT_MM)
    expect(TEXT_WIDTH_MM).toBeGreaterThan(LABEL_WIDTH_MM * 0.6)
  })

  it('keeps the logo square and inside the label', () => {
    expect(LOGO_MM).toBeLessThanOrEqual(LABEL_HEIGHT_MM)
    expect(LOGO_MM).toBeGreaterThan(0)
  })

  it('gives a short name more type than a long one', () => {
    const ordinary = nameFontMm('Lemari Arsip Besi')
    const long = nameFontMm('Lemari Penyimpanan Arsip Besi Dua Pintu Warna Abu')

    expect(ordinary).toBeGreaterThan(long)
  })

  it('does not let a short name tower over the number', () => {
    const short = nameFontMm('Kursi')

    expect(short).toBe(nameFontMm('Lemari Arsip Besi'))
    expect(short).toBeLessThan(NUMBER_FONT_MM * 1.5)
  })

  it('never lets a name outgrow its half of the label', () => {
    for (const name of ['A', 'Kursi', 'Meja Guru Kayu Jati']) {
      const half = LABEL_HEIGHT_MM / 2 - 1
      expect(nameFontMm(name) * 1.15).toBeLessThanOrEqual(half)
    }
  })

  it('floors the name rather than shrinking it away', () => {
    const absurd = nameFontMm('x'.repeat(400))

    expect(absurd).toBeGreaterThanOrEqual(1.8)
  })

  it('does not divide by an empty name', () => {
    expect(Number.isFinite(nameFontMm(''))).toBe(true)
    expect(Number.isFinite(nameFontMm('   '))).toBe(true)
  })

  it('sets type large enough to read at arm’s length', () => {
    expect(NUMBER_FONT_MM).toBeGreaterThanOrEqual(2.5)
    expect(nameFontMm('Lemari Arsip Besi')).toBeGreaterThanOrEqual(2)
  })

  it('fits each line inside its own half', () => {
    const half = LABEL_HEIGHT_MM / 2 - 1
    const wrapped = nameFontMm('Lemari Penyimpanan Arsip Besi Dua Pintu Abu')

    expect(NUMBER_FONT_MM * 1.15).toBeLessThanOrEqual(half)
    expect(wrapped * 1.15 * 2).toBeLessThanOrEqual(half)
  })

  it.each([
    ['AST-ELEK/2026/001-05', 'the format in use today'],
    ['AST-MEUBEL/2026/001-05', 'a six-character category code'],
    ['AST-OLAHRAGA/2026/001-05', 'an eight-character one, the budget'],
  ])('fits %s – %s', (unitNumber) => {
    const measured = NUMBER_FONT_MM * unitNumber.length * 0.62

    expect(measured).toBeLessThanOrEqual(TEXT_WIDTH_MM + 1e-6)
  })

  it('leaves the text most of the label', () => {
    expect(TEXT_WIDTH_MM).toBeGreaterThan(LABEL_WIDTH_MM * 0.6)
  })
})

describe('paperById', () => {
  it('finds a paper by its id', () => {
    expect(paperById('a3')).toMatchObject({ widthMm: 297, heightMm: 420 })
  })

  it('falls back to A4 for anything it does not know', () => {
    expect(paperById('foolscap').id).toBe('a4')
    expect(paperById(undefined).id).toBe('a4')
    expect(labelSheetLayout('tidak-ada').paper.id).toBe('a4')
  })

  it('has no duplicate ids to be ambiguous about', () => {
    const ids = PAPER_SIZES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('paginateLabels', () => {
  const units = Array.from({ length: 7 }, (_, i) => i + 1)

  it('cuts into pages of exactly the size given', () => {
    expect(paginateLabels(units, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('leaves the remainder on the last page', () => {
    const pages = paginateLabels(units, 3)

    expect(pages.slice(0, -1).every((p) => p.length === 3)).toBe(true)
    expect(pages.at(-1)).toHaveLength(1)
  })

  it('makes one page when everything fits', () => {
    expect(paginateLabels(units, 10)).toEqual([units])
  })

  it('has no pages for no units', () => {
    expect(paginateLabels([], 12)).toEqual([])
  })

  it('does not spin on a size of zero', () => {
    expect(paginateLabels(units, 0)).toEqual([units])
    expect(paginateLabels([], 0)).toEqual([])
  })
})
