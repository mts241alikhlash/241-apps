// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AttachmentName from './AttachmentName.vue'

const long = `Kartu Keluarga - ${'A'.repeat(120)}.pdf`

describe('AttachmentName', () => {
  it('renders a link when href is given', () => {
    const w = mount(AttachmentName, { props: { name: 'KK.pdf', href: '/f/1' } })
    expect(w.element.tagName).toBe('A')
    expect(w.attributes('href')).toBe('/f/1')
  })

  it('renders a button and emits click without href', async () => {
    const w = mount(AttachmentName, { props: { name: 'KK.pdf' } })
    expect(w.element.tagName).toBe('BUTTON')
    expect(w.attributes('type')).toBe('button')
    await w.trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
  })

  it('wraps long names and never truncates', () => {
    const w = mount(AttachmentName, { props: { name: long } })
    expect(w.text()).toBe(long)
    expect(w.classes()).toContain('break-words')
    expect(w.classes()).not.toContain('truncate')
  })
})
