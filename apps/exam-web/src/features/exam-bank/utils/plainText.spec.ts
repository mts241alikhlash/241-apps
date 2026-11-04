import { describe, expect, it } from 'vitest'
import { plainExcerpt } from './plainText'

describe('plainExcerpt', () => {
  it('drops markup and decodes the few entities the editor writes', () => {
    expect(plainExcerpt('<p dir="auto">A &amp; B &lt; C</p><p>Dua</p>')).toBe(
      'A & B < C Dua',
    )
  })

  it('keeps math as $...$ and marks an image', () => {
    expect(
      plainExcerpt(
        '<p>Hitung <span data-latex="x^2">x^2</span> pada <img data-file-id="f1"></p>',
      ),
    ).toBe('Hitung $x^2$ pada [gambar]')
  })

  it('cuts a long text with an ellipsis and collapses spaces', () => {
    const text = plainExcerpt(`<p>${'kata '.repeat(60)}</p>`, 20)

    expect(text).toHaveLength(21)
    expect(text.endsWith('…')).toBe(true)
    expect(plainExcerpt('<p>  a   b </p>')).toBe('a b')
  })

  it('keeps Arabic with harakat as it is', () => {
    expect(plainExcerpt('<p dir="auto">مَا مَعْنَى كِتَابٌ؟</p>')).toBe(
      'مَا مَعْنَى كِتَابٌ؟',
    )
  })
})
