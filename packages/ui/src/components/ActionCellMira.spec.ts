// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import { afterEach, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import ActionCell from './ActionCell.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

it('action menu is compact like a Mira dropdown', async () => {
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(ActionCell, { manageLabel: 'Kelola', items: [] }),
        ),
    }),
    { attachTo: document.body },
  )
  await wrapper.get('button').trigger('keydown', { key: 'Enter' })
  await flushPromises()

  const content = document.body.querySelector('[data-slot=dropdown-menu-content]')
  expect(content).not.toBeNull()
  const contentClass = content!.getAttribute('class') ?? ''
  expect(contentClass).not.toContain('w-[190px]')
  expect(contentClass).not.toContain('p-1.5')
  expect(contentClass).not.toContain('space-y-1')

  const items = [...document.body.querySelectorAll('[role=menuitem]')]
  expect(items.length).toBeGreaterThan(1)
  for (const item of items) {
    const c = item.getAttribute('class') ?? ''
    expect(c).not.toContain('py-2.5')
    expect(c).not.toContain('px-3')
    expect(item.querySelector('svg')?.getAttribute('class') ?? '').not.toContain(
      'h-4 w-4',
    )
  }
  wrapper.unmount()
})
