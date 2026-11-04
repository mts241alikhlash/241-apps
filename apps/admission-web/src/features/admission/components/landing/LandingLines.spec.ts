// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import LandingLines from './LandingLines.vue'

const rendered = (lines: string[]) =>
  mount({ render: () => h('p', [h(LandingLines, { lines })]) }).get('p').element
    .innerHTML

describe('LandingLines', () => {
  it('puts a line break between lines and none after the last', () => {
    expect(rendered(['Di sini, cerita', 'barumu dimulai.'])).toBe(
      'Di sini, cerita<br>barumu dimulai.',
    )
  })

  it('renders a single line without a break', () => {
    expect(rendered(['Satu baris'])).toBe('Satu baris')
  })

  it('escapes markup in a line', () => {
    const html = rendered(['<b>tebal</b>'])
    expect(html).not.toContain('<b>')
    expect(html).toBe('&lt;b&gt;tebal&lt;/b&gt;')
  })
})
