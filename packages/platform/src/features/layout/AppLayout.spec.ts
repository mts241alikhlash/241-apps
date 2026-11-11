// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Users } from '@lucide/vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'
import { useAuthStore } from '../auth'
import { AppLayout } from './index'

vi.mock('../auth/services/authService', () => ({
  authService: {
    logoutUser: vi.fn(),
    syncAuthenticatedUserProfile: vi.fn().mockResolvedValue(undefined),
  },
}))

const sections: MenuSection[] = [
  {
    label: 'Menu',
    items: [
      { title: 'Terlihat', url: '/a', icon: Users },
      {
        title: 'Tersembunyi',
        url: '/b',
        icon: Users,
        requiredPermission: 'hidden.read',
      },
    ],
  },
]

async function mountLayout(props: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setUser({
    id: 'u1',
    identifier: 'admin',
    isActive: true,
    roles: ['ADMIN'],
    permissions: ['hidden.read'],
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')
  const wrapper = mount(AppLayout, {
    props: { menuSections: sections, ...props },
    global: {
      plugins: [
        pinia,
        router,
        createI18n({
          legacy: false,
          locale: 'id',
          missingWarn: false,
          fallbackWarn: false,
        }),
      ],
    },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('AppLayout', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a floating sidebar that collapses to icons', async () => {
    const wrapper = await mountLayout()
    const sidebar = wrapper.get('[data-slot="sidebar"][data-variant]')
    expect(sidebar.attributes('data-variant')).toBe('floating')
    await wrapper.get('[data-slot="sidebar-toggle"]').trigger('click')
    await flushPromises()
    expect(
      wrapper
        .get('[data-slot="sidebar"][data-variant]')
        .attributes('data-collapsible'),
    ).toBe('icon')
  })

  it('applies permissionsFor to the menu', async () => {
    const wrapper = await mountLayout({
      permissionsFor: (codes: string[]) =>
        codes.filter((c) => c !== 'hidden.read'),
    })
    expect(wrapper.text()).toContain('Terlihat')
    expect(wrapper.text()).not.toContain('Tersembunyi')
  })

  it('shows the item when permissionsFor is not given', async () => {
    const wrapper = await mountLayout()
    expect(wrapper.text()).toContain('Tersembunyi')
  })

  it('gives the content inset the full viewport height', async () => {
    const wrapper = await mountLayout()
    expect(wrapper.get('[data-slot="sidebar-inset"]').classes()).toContain(
      'h-svh',
    )
    expect(wrapper.html()).not.toContain('100svh-3rem')
  })
})
