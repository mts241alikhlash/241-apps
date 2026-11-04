// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import AppLayout from './AppLayout.vue'

const { changePassword } = vi.hoisted(() => ({
  changePassword: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/features/platform/auth', () => ({
  useAuthSession: () => ({
    user: ref({ id: 'user-1', name: 'Admin', roles: ['ADMIN'] }),
    logoutUser: vi.fn(),
    changePassword: vi.fn(),
  }),
  authApi: { changePassword },
}))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const passthrough = { template: '<div><slot /></div>' }
const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })

function mountLayout() {
  return mount(AppLayout, {
    global: {
      plugins: [router()],
      stubs: {
        AppSidebar: true,
        HeaderAppSwitcher: true,
        RouterView: true,
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        DropdownMenu: passthrough,
        DropdownMenuContent: passthrough,
        DropdownMenuGroup: passthrough,
        DropdownMenuTrigger: passthrough,
        DropdownMenuLabel: passthrough,
        DropdownMenuSeparator: true,
        DropdownMenuItem: { template: '<button><slot /></button>' },
      },
    },
  })
}

describe('header controls', () => {
  it('exposes the inner scroll container for restoring list position', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-app-scroll]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('names the search button and the account menu', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('button[aria-label="Cari halaman"]').exists()).toBe(
      true,
    )
    const accountButton = wrapper
      .findAll('button')
      .find(
        (b) =>
          b.text().includes('Admin') && b.find('[data-slot="avatar"]').exists(),
      )
    expect(accountButton).toBeDefined()
    wrapper.unmount()
  })

  it('puts the page in an inset card under a full-width top bar', () => {
    const wrapper = mountLayout()
    expect(wrapper.find('[data-slot="sidebar-inset"]').exists()).toBe(true)
    const topBar = wrapper.get('header[data-app-topbar]')
    expect(topBar.classes()).toContain('fixed')
    expect(
      wrapper.get('[data-slot="sidebar-wrapper"]').attributes('style'),
    ).toContain('--sidebar-offset')
    wrapper.unmount()
  })

  it('puts the app switcher on the left and gives every header control the same 32 px size', () => {
    const wrapper = mountLayout()
    const topBar = wrapper.get('header[data-app-topbar]')
    expect(topBar.find('header-app-switcher-stub').exists()).toBe(true)
    const search = topBar.get('button[aria-label="Cari halaman"]')
    expect(search.classes()).toContain('size-8')
    const trigger = topBar.get('button[aria-label="Buka menu"]')
    expect(trigger.classes()).toContain('size-8')
    wrapper.unmount()
  })

  it('shows the breadcrumb inside the inset, not in the top bar', () => {
    const wrapper = mountLayout()
    const inset = wrapper.get('[data-slot="sidebar-inset"]')
    expect(inset.find('[data-slot="breadcrumb"]').exists()).toBe(true)
    expect(
      wrapper
        .get('header[data-app-topbar]')
        .find('[data-slot="breadcrumb"]')
        .exists(),
    ).toBe(false)
    wrapper.unmount()
  })

  it('opens the profile password dialog with current password and eight-character validation', async () => {
    const wrapper = mountLayout()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Ganti Password')!
      .trigger('click')
    expect(wrapper.find('input[name="currentPassword"]').exists()).toBe(true)
    await wrapper.get('input[name="currentPassword"]').setValue('old-password')
    await wrapper.get('input[name="newPassword"]').setValue('short6')
    await wrapper.get('input[name="confirmPassword"]').setValue('short6')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(changePassword).not.toHaveBeenCalled()
    await wrapper.get('input[name="newPassword"]').setValue('new-password')
    await wrapper.get('input[name="confirmPassword"]').setValue('new-password')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    )
    wrapper.unmount()
  })
})
