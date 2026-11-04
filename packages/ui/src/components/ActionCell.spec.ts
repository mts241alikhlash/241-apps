// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import { defineComponent, h } from 'vue'
import ActionCell from './ActionCell.vue'

const mounted: ReturnType<typeof mount>[] = []

function mountCell(props: Record<string, unknown> = {}) {
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(ActionCell, props)),
    }),
    { attachTo: document.body },
  )
  mounted.push(wrapper)
  return wrapper
}

async function openMenu(wrapper: ReturnType<typeof mountCell>) {
  const trigger = wrapper.get('button')
  await trigger.trigger('keydown', { key: 'Enter' })
  await flushPromises()
}

function menuItems() {
  return [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
    item.textContent?.trim(),
  )
}

afterEach(() => {
  while (mounted.length) mounted.pop()?.unmount()
  document.body.innerHTML = ''
})

it('lists the extra items before edit and delete', async () => {
  const wrapper = mountCell({
    items: [
      { label: 'Terbitkan', onClick: vi.fn() },
      { label: 'Sematkan', onClick: vi.fn() },
    ],
  })

  await openMenu(wrapper)

  expect(menuItems()).toEqual(['Terbitkan', 'Sematkan', 'Edit', 'Hapus'])
})

it('runs the click handler of the chosen item', async () => {
  const publish = vi.fn()
  const wrapper = mountCell({
    items: [{ label: 'Terbitkan', onClick: publish }],
    hideDelete: true,
  })
  await openMenu(wrapper)

  const item = [...document.body.querySelectorAll('[role="menuitem"]')].find(
    (node) => node.textContent?.includes('Terbitkan'),
  ) as HTMLElement
  item.click()

  expect(publish).toHaveBeenCalledTimes(1)
})

it('marks a destructive item in red', async () => {
  const wrapper = mountCell({
    items: [{ label: 'Cabut', destructive: true, onClick: vi.fn() }],
    hideEdit: true,
    hideDelete: true,
  })
  await openMenu(wrapper)

  const item = document.body.querySelector('[role="menuitem"]')!
  expect(item.className).toContain('text-destructive')
})

it('keeps working without any extra items', async () => {
  const wrapper = mountCell()

  await openMenu(wrapper)

  expect(menuItems()).toEqual(['Edit', 'Hapus'])
})
