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

describe('Tabs', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('draws a thin bottom border and a thick active underline', () => {
    const wrapper = mountTabs()

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

  it('draws the focus ring inside the trigger so the list does not clip it', () => {
    const wrapper = mountTabs()

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

  it('hides the scrollbar and keeps the active underline unclipped', () => {
    const wrapper = mountTabs()

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
    const wrapper = mountTabs({}, '-mx-4 px-4')

    expect(list(wrapper).classes()).toContain('flex')
    expect(list(wrapper).classes()).not.toContain('inline-flex')
    expect(list(wrapper).classes()).not.toContain('w-full')
    wrapper.unmount()
  })

  it('activates a tab that receives focus', async () => {
    const wrapper = mountTabs()

    ;(triggers(wrapper)[1].element as HTMLElement).focus()
    await flushPromises()

    expect(triggers(wrapper)[1].attributes('data-state')).toBe('active')
    expect(wrapper.text()).toContain('Isi B')
    wrapper.unmount()
  })

  it('lets a page add classes to the list', () => {
    const wrapper = mountTabs({}, '-mx-4 px-4')

    expect(list(wrapper).classes()).toEqual(
      expect.arrayContaining(['border-b', '-mx-4', 'px-4']),
    )
    wrapper.unmount()
  })

  it('still switches tabs', async () => {
    const wrapper = mountTabs()

    expect(triggers(wrapper)[0].attributes('data-state')).toBe('active')
    expect(wrapper.text()).toContain('Isi A')

    await triggers(wrapper)[1].trigger('mousedown', { button: 0 })

    expect(triggers(wrapper)[1].attributes('data-state')).toBe('active')
    expect(triggers(wrapper)[0].attributes('data-state')).toBe('inactive')
    expect(wrapper.text()).toContain('Isi B')
    wrapper.unmount()
  })
})
