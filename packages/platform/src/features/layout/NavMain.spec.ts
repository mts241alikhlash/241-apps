// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { BookOpen, Users } from '@lucide/vue'
import { defineComponent, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SidebarProvider } from '@mts241alikhlash/ui/sidebar'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'
import NavMain from './NavMain.vue'

const sections: MenuSection[] = [
  {
    label: 'Menu',
    items: [
      { title: 'Beranda', url: '/home', icon: Users },
      {
        title: 'Bank Soal',
        url: '#',
        icon: BookOpen,
        items: [
          { title: 'Paket Soal', url: '/packages' },
          { title: 'Persetujuan', url: '/approvals' },
        ],
      },
    ],
  },
]

async function mountNav(open: boolean) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/home')
  const Host = defineComponent(
    () => () =>
      h(SidebarProvider, { defaultOpen: open }, () =>
        h('div', { 'data-collapsible': open ? '' : 'icon' }, [
          h(NavMain, { sections }),
        ]),
      ),
  )
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: {
      plugins: [
        router,
        createI18n({
          legacy: false,
          locale: 'id',
          missingWarn: false,
          fallbackWarn: false,
        }),
      ],
    },
  })
  await flushPromises()
  return wrapper
}

const parentButton = () =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
    button.textContent?.includes('Bank Soal'),
  )

afterEach(() => {
  document.body.replaceChildren()
})

describe('NavMain', () => {
  it('opens the sub-menu links from a collapsed sidebar', async () => {
    const wrapper = await mountNav(false)

    const trigger = parentButton()
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')

    trigger?.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
    )
    trigger?.click()
    await flushPromises()

    const links = [...document.querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    )
    expect(links).toContain('/packages')
    expect(links).toContain('/approvals')
    wrapper.unmount()
  })

  it('keeps the collapsible sub-menu in an expanded sidebar', async () => {
    const wrapper = await mountNav(true)

    const trigger = parentButton()
    expect(trigger?.getAttribute('aria-haspopup')).toBeNull()
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('keeps a plain item a link in both states', async () => {
    for (const open of [false, true]) {
      const wrapper = await mountNav(open)
      const home = [...document.querySelectorAll('a')].find((a) =>
        a.textContent?.includes('Beranda'),
      )
      expect(home?.getAttribute('href')).toBe('/home')
      wrapper.unmount()
      document.body.replaceChildren()
    }
  })
})
