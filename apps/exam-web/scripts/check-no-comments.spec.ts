import { describe, expect, it } from 'vitest'
import { scanJavaScript, scanSource, scanText } from './check-no-comments.mjs'

const found = (text: string) =>
  (scanJavaScript(text) as { index: number; end: number }[]).map((hit) =>
    text.slice(hit.index, hit.end),
  )

describe('scanJavaScript', () => {
  it('finds a line comment after a template interpolation', () => {
    const source = 'const a = `x${b}y`;\n// hidden\n'
    expect(found(source)).toEqual(['// hidden'])
  })

  it('finds a comment after a nested interpolation', () => {
    const source = 'const a = `x${ { b: `${c}` } }y`;\n/* hidden */\n'
    expect(found(source)).toEqual(['/* hidden */'])
  })

  it('leaves a URL in a string alone', () => {
    expect(found("const u = 'https://example.test/a'\n")).toEqual([])
  })

  it('leaves a regex that matches slashes alone', () => {
    expect(found('const re = /\\/\\//g\n')).toEqual([])
  })

  it('leaves a template literal that contains slashes alone', () => {
    expect(found('const t = `https://example.test//path`\n')).toEqual([])
  })

  it('finds a block comment at the top of a file', () => {
    expect(found('/** doc */\nconst a = 1\n')).toEqual(['/** doc */'])
  })
})

describe('scanSource', () => {
  it('finds a CSS block comment', () => {
    expect(
      scanSource('a.css', 'a { color: red; } /* hidden */\n'),
    ).toHaveLength(1)
  })

  it('finds an HTML comment in a Vue template', () => {
    const source = '<template>\n  <!-- hidden -->\n  <div />\n</template>\n'
    expect(scanSource('a.vue', source)).toHaveLength(1)
  })

  it('finds a comment in a Vue script block', () => {
    const source =
      '<script setup lang="ts">\n// hidden\nconst a = 1\n</script>\n'
    expect(scanSource('a.vue', source)).toHaveLength(1)
  })

  it('finds a comment in a Vue style block', () => {
    const source = '<style>\n/* hidden */\n</style>\n'
    expect(scanSource('a.vue', source)).toHaveLength(1)
  })
})

describe('directives', () => {
  it('exempts the vite client reference and the vitest environment pragma', () => {
    const source = [
      '/// <reference types="vite/client" />',
      '// @vitest-environment happy-dom',
      'const a = 1',
    ].join('\n')
    expect(scanText('a.ts', source)).toEqual([])
  })

  it('still flags a real comment sharing a directive line', () => {
    const source = 'const a = 1 // hidden'
    expect(scanText('a.ts', source)).toHaveLength(1)
  })
})
