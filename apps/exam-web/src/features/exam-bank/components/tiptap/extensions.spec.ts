// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import { buildExtensions } from './extensions'

vi.mock('../../api/examBankApi', () => ({
  examBankApi: { getImage: () => new Promise(() => undefined) },
}))

const ID = '3d2a9b2e-6a4f-4b1c-9d0e-1f2a3b4c5d6e'

function roundTrip(html: string): string {
  const editor = new Editor({
    extensions: buildExtensions(() => undefined),
    content: html,
  })
  const out = editor.getHTML()
  editor.destroy()
  return out
}

describe('editor extensions', () => {
  it('keeps superscript and subscript, which change the meaning of a formula or a word', () => {
    const html = roundTrip(
      '<p dir="auto">x<sup>2</sup> + 1 = 5 dan H<sub>2</sub>O</p>',
    )

    expect(html).toContain('x<sup>2</sup>')
    expect(html).toContain('H<sub>2</sub>O')
  })

  it('keeps strikethrough and quotes', () => {
    const html = roundTrip(
      '<p dir="auto"><s>salah</s></p><blockquote><p dir="auto">kutipan</p></blockquote>',
    )

    expect(html).toContain('<s>salah</s>')
    expect(html).toContain('<blockquote>')
  })

  it('keeps a table with its header and merged cells', () => {
    const html = roundTrip(
      '<table><tbody><tr><th colspan="2"><p>Judul</p></th></tr>' +
        '<tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>',
    )

    expect(html).toContain('<table')
    expect(html).toMatch(/<th[^>]*colspan="2"/)
    expect(html).toContain('<td')
    expect(html).toContain('Judul')
  })

  it('keeps formulas, pictures and the direction of each block', () => {
    const html = roundTrip(
      `<p dir="auto">a <span data-latex="x^2">x^2</span> <img data-file-id="${ID}"></p>`,
    )

    expect(html).toContain('<span data-latex="x^2">x^2</span>')
    expect(html).toContain(`<img data-file-id="${ID}">`)
    expect(html).toContain('<p dir="auto">')
  })

  it('keeps Arabic with harakat', () => {
    const arabic = 'مَا مَعْنَى كِتَابٌ؟'

    expect(roundTrip(`<p dir="auto">${arabic}</p>`)).toContain(arabic)
  })
})
