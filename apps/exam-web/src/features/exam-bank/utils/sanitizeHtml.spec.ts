// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeQuestionHtml } from './sanitizeHtml'

const ID = '3d2a9b2e-6a4f-4b1c-9d0e-1f2a3b4c5d6e'

describe('sanitizeQuestionHtml', () => {
  it('removes scripts, event handlers, links and foreign images', () => {
    const clean = sanitizeQuestionHtml(
      '<p onclick="x()">Halo<script>alert(1)</script></p>' +
        '<a href="javascript:alert(1)">klik</a>' +
        '<img src="x" onerror="x()">' +
        '<form action="x"><input name="y"></form>',
    )

    expect(clean).not.toMatch(
      /script|onclick|onerror|javascript|<form|<input|<a|src=/i,
    )
    expect(clean).toContain('Halo')
    expect(clean).toContain('klik')
  })

  it('keeps what the editor writes: blocks, formulas, pictures and direction', () => {
    const html =
      `<p dir="auto">Hitung <span data-latex="\\frac{1}{2}">\\frac{1}{2}</span> ` +
      `<img data-file-id="${ID}"></p><ul dir="auto"><li dir="auto"><strong>a</strong></li></ul>`

    const clean = sanitizeQuestionHtml(html)

    expect(clean).toContain('dir="auto"')
    expect(clean).toContain('data-latex="\\frac{1}{2}"')
    expect(clean).toContain(`data-file-id="${ID}"`)
    expect(clean).toContain('<strong>a</strong>')
  })

  it('drops a picture whose file id is not a UUID', () => {
    expect(
      sanitizeQuestionHtml('<p>a<img data-file-id="../../users/me">b</p>'),
    ).toBe('<p>ab</p>')
    expect(sanitizeQuestionHtml('<p><img alt="x"></p>')).toBe('<p></p>')
  })

  it('keeps Arabic with harakat unchanged', () => {
    const arabic = '<p dir="auto">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ</p>'

    expect(sanitizeQuestionHtml(arabic)).toBe(arabic)
  })
})
