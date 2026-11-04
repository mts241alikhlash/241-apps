// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import HeaderAppSwitcher from './HeaderAppSwitcher.vue'

const { apps, load } = vi.hoisted(() => ({
  apps: { value: [] as { key: string; label: string; url: string }[] },
  load: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/features/platform/auth', () => ({
  authConfig: ref({ ssoApp: 'admission' }),
  useSsoApps: () => ({ apps: ref(apps.value), load }),
}))

const passthrough = { template: '<div><slot /></div>' }
const mountSwitcher = () =>
  mount(HeaderAppSwitcher, {
    global: {
      stubs: {
        DropdownMenu: passthrough,
        DropdownMenuContent: passthrough,
        DropdownMenuTrigger: passthrough,
        DropdownMenuItem: { template: '<button><slot /></button>' },
      },
    },
  })

describe('HeaderAppSwitcher', () => {
  it('shows the current app with its logo and name even when the list is empty', async () => {
    apps.value = []
    const wrapper = mountSwitcher()
    await flushPromises()
    expect(load).toHaveBeenCalled()
    expect(wrapper.get('img').attributes('src')).toBe('/logo.webp')
    expect(wrapper.text()).toContain('241 Admission')
    wrapper.unmount()
  })

  it('uses the label the account service gives for the current app', async () => {
    apps.value = [
      {
        key: 'admission',
        label: 'Penerimaan Santri Baru',
        url: 'http://admission.test',
      },
      { key: 'academic', label: 'Akademik', url: 'http://academic.test' },
    ]
    const wrapper = mountSwitcher()
    await flushPromises()
    expect(wrapper.text()).toContain('Penerimaan Santri Baru')
    expect(wrapper.text()).toContain('Akademik')
    wrapper.unmount()
  })

  it('opens the address of the app that is chosen and ignores the current one', async () => {
    apps.value = [
      {
        key: 'admission',
        label: 'Penerimaan Santri Baru',
        url: 'http://admission.test',
      },
      { key: 'academic', label: 'Akademik', url: 'http://academic.test' },
    ]
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const wrapper = mountSwitcher()
    await flushPromises()
    const buttons = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('Akademik'))
    await buttons[0].trigger('click')
    expect(assign).toHaveBeenCalledWith('http://academic.test')
    assign.mockClear()
    const current = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Penerimaan Santri Baru')
    for (const button of current) await button.trigger('click')
    expect(assign).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    wrapper.unmount()
  })
})
