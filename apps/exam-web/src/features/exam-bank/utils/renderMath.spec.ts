import { describe, expect, it } from 'vitest'
import { decodeEntities, renderMath } from './renderMath'

describe('renderMath', () => {
  it('replaces a data-latex span with KaTeX markup', () => {
    const html = renderMath(
      '<p dir="auto">Hasil <span data-latex="\\frac{1}{2}">\\frac{1}{2}</span></p>',
    )

    expect(html).toContain('class="katex"')
    expect(html).toContain('<p dir="auto">Hasil ')
    expect(html).not.toContain('data-latex')
  })

  it('reads the formula from the attribute, whose entities are decoded', () => {
    const html = renderMath('<span data-latex="a &lt; b">a &lt; b</span>')

    expect(html).toContain('class="katex"')
    expect(html).toContain('class="mrel">&lt;</span>')
  })

  it('shows a broken formula as red text instead of throwing', () => {
    const html = renderMath('<span data-latex="\\frac{1">\\frac{1</span>')

    expect(html).toContain('katex-error')
  })

  it('leaves html with no formula untouched', () => {
    expect(renderMath('<p>Halo</p>')).toBe('<p>Halo</p>')
  })

  it('decodes the entities the editor and the server write', () => {
    expect(decodeEntities('a&amp;b &lt;c&gt; &quot;d&quot; &#39;e&#39;')).toBe(
      'a&b <c> "d" \'e\'',
    )
  })
})
