// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './index'

function mountTabs(props: Record<string, unknown> = {}, listClass?: string) {
  return mount(
    defineComponent({
      render: () =>
        h(
          Tabs,
          { defaultValue: 'a', ...props },
          {
            default: () => [
              h(TabsList, { class: listClass }, () => [
                h(TabsTrigger, { value: 'a' }, () => 'A'),
                h(TabsTrigger, { value: 'b' }, () => 'B'),
              ]),
              h(TabsContent, { value: 'a' }, () => 'Isi A'),
              h(TabsContent, { value: 'b' }, () => 'Isi B'),
            ],
          },
        ),
    }),
    { attachTo: document.body },
  )
}

const list = (wrapper: ReturnType<typeof mountTabs>) =>
  wrapper.get('[data-slot="tabs-list"]')
const triggers = (wrapper: ReturnType<typeof mountTabs>) =>
  wrapper.findAll('[data-slot="tabs-trigger"]')

describe('Tabs variants', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the Mira pill list when no variant is given', () => {
    const wrapper = mountTabs()

    expect(list(wrapper).classes()).toEqual(
      expect.arrayContaining(['bg-muted', 'rounded-md', 'h-8', 'p-[3px]']),
    )
    expect(list(wrapper).classes()).not.toContain('border-b')
    expect(triggers(wrapper)[0].classes()).toEqual(
      expect.arrayContaining([
        'rounded-md',
        'data-[state=active]:bg-background',
      ]),
    )
    expect(triggers(wrapper)[0].classes()).not.toContain('border-b-2')
    wrapper.unmount()
  })

  it('keeps the underline for variant="line" and the pill for variant="default"', () => {
    const byDefault = mountTabs({ variant: 'default' })
    const byLine = mountTabs({ variant: 'line' })

    expect(list(byDefault).attributes('class')).not.toBe(
      list(byLine).attributes('class'),
    )
    expect(triggers(byLine)[0].classes()).toContain('border-b-2')
    expect(triggers(byDefault)[0].classes()).not.toContain('border-b-2')
    byDefault.unmount()
    byLine.unmount()
  })

  it('draws a thin bottom border and a thick active underline for variant="line"', () => {
    const wrapper = mountTabs({ variant: 'line' })

    expect(list(wrapper).classes()).toEqual(
      expect.arrayContaining(['border-b', 'bg-transparent', 'overflow-x-auto']),
    )
    expect(list(wrapper).classes()).not.toContain('bg-muted')
    for (const trigger of triggers(wrapper)) {
      expect(trigger.classes()).toEqual(
        expect.arrayContaining([
          'border-b-2',
          'min-h-[var(--control-h-lg,2rem)]',
          'data-[state=active]:border-primary',
          'data-[state=active]:bg-transparent',
        ]),
      )
      expect(trigger.classes()).not.toContain(
        'data-[state=active]:bg-background',
      )
    }
    wrapper.unmount()
  })

  it('draws the focus ring inside the trigger so the list does not clip it in the line variant', () => {
    const wrapper = mountTabs({ variant: 'line' })

    for (const trigger of triggers(wrapper)) {
      expect(trigger.classes()).toEqual(
        expect.arrayContaining([
          'focus-visible:inset-ring-[3px]',
          'focus-visible:inset-ring-ring/50',
        ]),
      )
      expect(trigger.classes()).not.toContain('focus-visible:ring-[3px]')
    }
    wrapper.unmount()
  })

  it('hides the scrollbar and keeps the active underline unclipped in the line variant', () => {
    const wrapper = mountTabs({ variant: 'line' })

    expect(list(wrapper).classes()).toEqual(
      expect.arrayContaining([
        '[scrollbar-width:none]',
        '[&::-webkit-scrollbar]:hidden',
      ]),
    )
    for (const trigger of triggers(wrapper)) {
      expect(trigger.classes()).not.toContain('-mb-px')
    }
    wrapper.unmount()
  })

  it('fills the container and bleeds with negative margins without w-auto', () => {
    const wrapper = mountTabs({ variant: 'line' }, '-mx-4 px-4')

    expect(list(wrapper).classes()).toContain('flex')
    expect(list(wrapper).classes()).not.toContain('inline-flex')
    expect(list(wrapper).classes()).not.toContain('w-full')
    wrapper.unmount()
  })

  it('activates a tab that receives focus in the line variant', async () => {
    const wrapper = mountTabs({ variant: 'line' })

    ;(triggers(wrapper)[1].element as HTMLElement).focus()
    await flushPromises()

    expect(triggers(wrapper)[1].attributes('data-state')).toBe('active')
    expect(wrapper.text()).toContain('Isi B')
    wrapper.unmount()
  })

  it('lets a page add classes to the list', () => {
    const wrapper = mountTabs({ variant: 'line' }, '-mx-4 px-4')

    expect(list(wrapper).classes()).toEqual(
      expect.arrayContaining(['border-b', '-mx-4', 'px-4']),
    )
    wrapper.unmount()
  })

  it('still switches tabs in the line variant', async () => {
    const wrapper = mountTabs({ variant: 'line' })

    expect(triggers(wrapper)[0].attributes('data-state')).toBe('active')
    expect(wrapper.text()).toContain('Isi A')

    await triggers(wrapper)[1].trigger('mousedown', { button: 0 })

    expect(triggers(wrapper)[1].attributes('data-state')).toBe('active')
    expect(triggers(wrapper)[0].attributes('data-state')).toBe('inactive')
    expect(wrapper.text()).toContain('Isi B')
    wrapper.unmount()
  })
})
