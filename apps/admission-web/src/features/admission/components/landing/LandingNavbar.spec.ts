// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import LandingNavbar from './LandingNavbar.vue'

async function mountNavbar(
  props: { ready?: boolean; showStories?: boolean } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  return mount(LandingNavbar, {
    attachTo: document.body,
    props,
    global: { plugins: [router] },
  })
}

describe('LandingNavbar', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('uses the school logo as the labeled home link without nested controls', async () => {
    const wrapper = await mountNavbar()

    expect(
      wrapper
        .get('a[aria-label="PSB 241, kembali ke halaman utama"] img')
        .attributes('alt'),
    ).toBe('Logo MTs Persis 241 Al-Ikhlash')
    expect(wrapper.text()).not.toContain('Penerimaan Santri Baru')
    expect(wrapper.find('a button').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers one sign-in link that reads Masuk on a phone and Masuk / Daftar on a wide screen', async () => {
    const wrapper = await mountNavbar()

    const links = wrapper.findAll('a[href="/login"]')
    expect(links).toHaveLength(1)
    expect(links[0].attributes('aria-label')).toBe('Masuk atau daftar')
    expect(links[0].find('.sm\\:hidden').text()).toBe('Masuk')
    expect(links[0].find('.sm\\:inline').text()).toBe('Masuk / Daftar')
    wrapper.unmount()
  })

  it('lists every section in the desktop navigation', async () => {
    const wrapper = await mountNavbar()

    const labels = wrapper
      .get('nav[aria-label="Navigasi halaman"]')
      .findAll('a')
      .map((link) => link.text())
    expect(labels).toEqual([
      'Mengenal',
      'Gelombang',
      'Alur Daftar',
      'Persyaratan',
      'Cerita',
      'FAQ',
    ])
    wrapper.unmount()
  })

  it('opens the section menu from the menu button and closes it after choosing a section', async () => {
    const wrapper = await mountNavbar()
    const button = wrapper.get('button[aria-label="Buka menu"]')
    expect(button.text()).toContain('Menu')

    await button.trigger('click')
    await flushPromises()

    const links = document.body.querySelectorAll(
      '[role="dialog"] nav[aria-label="Navigasi halaman"] a',
    )
    expect(links).toHaveLength(6)
    expect((links[2] as HTMLElement).textContent?.trim()).toBe('Alur Daftar')
    expect((links[2] as HTMLElement).getAttribute('href')).toBe('#alur')

    ;(links[2] as HTMLElement).click()
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })

  describe('active section tracking', () => {
    const observed: string[] = []

    beforeEach(() => {
      observed.length = 0
      class FakeObserver {
        observe(target: Element) {
          observed.push(target.id)
        }

        disconnect() {
          observed.length = 0
        }
      }
      vi.stubGlobal('IntersectionObserver', FakeObserver)
    })

    afterEach(() => vi.unstubAllGlobals())

    it('observes the sections that exist when it mounts', async () => {
      for (const id of ['kehidupan', 'faq']) {
        const section = document.createElement('section')
        section.id = id
        document.body.appendChild(section)
      }
      const wrapper = await mountNavbar()
      expect(observed.sort()).toEqual(['faq', 'kehidupan'])
      wrapper.unmount()
    })

    it('waits for the content, then observes the sections that appeared', async () => {
      const wrapper = await mountNavbar({ ready: false })
      expect(observed).toEqual([])

      for (const id of ['kehidupan', 'alur', 'faq']) {
        const section = document.createElement('section')
        section.id = id
        document.body.appendChild(section)
      }
      await wrapper.setProps({ ready: true })
      await flushPromises()

      expect(observed.sort()).toEqual(['alur', 'faq', 'kehidupan'])
      wrapper.unmount()
    })
  })

  it('hides the stories link, on desktop and in the menu, when there is no story', async () => {
    const wrapper = await mountNavbar({ showStories: false })
    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(hrefs).not.toContain('#cerita')
    expect(hrefs).toContain('#faq')
    wrapper.unmount()
  })

  it('shows the stories link by default', async () => {
    const wrapper = await mountNavbar()
    expect(
      wrapper.findAll('a').map((link) => link.attributes('href')),
    ).toContain('#cerita')
    wrapper.unmount()
  })
})
