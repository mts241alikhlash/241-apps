// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { CardTabs } from './index'

const tabs = [
  { value: 'a', label: 'Menunggu' },
  { value: 'b', label: 'Selesai' },
]

const mountTabs = (props: Record<string, unknown> = {}) =>
  mount(CardTabs, {
    props: { tabs, defaultValue: 'a', ...props },
    slots: { a: '<p>Isi A</p>', b: '<p>Isi B</p>' },
    attachTo: document.body,
  })

describe('CardTabs', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders one bordered list and the active slot', () => {
    const w = mountTabs()
    expect(w.findAll('[data-slot="tabs-trigger"]')).toHaveLength(2)
    expect(w.findAll('[data-slot="tabs-list"]')).toHaveLength(1)
    expect(w.get('[data-slot="tabs-list"]').classes()).toContain('border-b')
    expect(w.text()).toContain('Isi A')
    expect(w.text()).not.toContain('Isi B')
  })

  it('switches content when a tab is clicked', async () => {
    const w = mountTabs()
    const second = w.findAll('[data-slot="tabs-trigger"]')[1]!
    await second.trigger('mousedown')
    await second.trigger('click')
    expect(w.text()).toContain('Isi B')
  })

  it('removes the top padding when the content starts with a field', () => {
    const block = mountTabs().get('[data-slot="tabs-content"]').classes()
    const field = mountTabs({ start: 'field' })
      .get('[data-slot="tabs-content"]')
      .classes()
    expect(block).toContain('pt-4')
    expect(field).toContain('pt-0')
  })

  it('tints the tab bar like the card header', () => {
    const c = mountTabs().get('[data-slot="tabs-list"]').classes()
    expect(c).toContain('bg-muted/30')
    expect(c).not.toContain('bg-transparent')
  })

  it('keeps the tab list scrollable', () => {
    expect(mountTabs().get('[data-slot="tabs-list"]').classes()).toContain(
      'overflow-x-auto',
    )
  })
})
