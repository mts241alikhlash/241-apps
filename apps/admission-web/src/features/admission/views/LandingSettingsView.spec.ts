// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as VueRouter from 'vue-router'
import { defineComponent, h, inject, provide } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { landingDefaults } from '../data/landingDefaults'
import LandingSettingsView from './LandingSettingsView.vue'

const service = vi.hoisted(() => ({
  fetchDraft: vi.fn(),
  saveSection: vi.fn(),
  publish: vi.fn(),
  discard: vi.fn(),
  uploadImage: vi.fn(),
}))
vi.mock('../services/landingService', () => ({ landingService: service }))
vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    landingImageUrl: (id: string) => `/admissions/landing/images/${id}`,
  },
}))

const access = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((p) => access.granted.has(p)),
  }),
}))

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRouter: () => router, onBeforeRouteLeave: vi.fn() }
})

const passthrough = { template: '<div><slot /></div>' }
const none = {
  hero: null,
  life: null,
  info: null,
  steps: null,
  faq: null,
  stories: null,
  closing: null,
}
const overview = (extra: Record<string, unknown> = {}) => ({
  sections: none,
  hasUnpublishedChanges: false,
  publishedAt: null,
  ...extra,
})

const stubs = {
  AlertDialog: passthrough,
  AlertDialogContent: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogTitle: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogCancel: { template: '<button><slot /></button>' },
  AlertDialogAction: { template: '<button><slot /></button>' },
}

const mountView = () => mount(LandingSettingsView, { global: { stubs } })
const button = (wrapper: ReturnType<typeof mountView>, label: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === label)

beforeEach(() => {
  vi.clearAllMocks()
  access.granted = new Set([
    'admission-landing.read',
    'admission-landing.update',
    'admission-landing.publish',
  ])
  service.fetchDraft.mockResolvedValue({ overview: overview() })
})

describe('LandingSettingsView', () => {
  it('shows a tab per section and starts on the hero with the built-in content', async () => {
    const wrapper = mountView()
    await flushPromises()

    const tabs = wrapper.findAll('[role="tab"]').map((tab) => tab.text())
    expect(tabs).toEqual([
      'Bagian atas',
      'Mengenal sekolah',
      'Informasi PPDB',
      'Alur pendaftaran',
      'Tanya jawab',
      'Cerita keluarga',
      'Penutup',
    ])
    expect(
      (wrapper.get('input[name="eyebrow"]').element as HTMLInputElement).value,
    ).toBe(landingDefaults.hero.eyebrow)
  })

  it('shows the draft content of a section when there is one', async () => {
    service.fetchDraft.mockResolvedValue({
      overview: overview({
        sections: {
          ...none,
          hero: { ...landingDefaults.hero, eyebrow: 'Dari draf' },
        },
      }),
    })
    const wrapper = mountView()
    await flushPromises()
    expect(
      (wrapper.get('input[name="eyebrow"]').element as HTMLInputElement).value,
    ).toBe('Dari draf')
  })

  it('shows the state: published or pending changes', async () => {
    const builtIn = mountView()
    await flushPromises()
    expect(builtIn.get('[data-test="landing-status"]').text()).toContain(
      'Isi bawaan',
    )
    expect(builtIn.get('[data-test="landing-status"]').text()).not.toContain(
      'Sudah terbit',
    )

    service.fetchDraft.mockResolvedValue({
      overview: overview({ publishedAt: '2026-10-09T10:00:00.000Z' }),
    })
    const clean = mountView()
    await flushPromises()
    expect(clean.get('[data-test="landing-status"]').text()).toContain(
      'Sudah terbit',
    )

    service.fetchDraft.mockResolvedValue({
      overview: overview({ hasUnpublishedChanges: true }),
    })
    const pending = mountView()
    await flushPromises()
    expect(pending.get('[data-test="landing-status"]').text()).toContain(
      'Ada perubahan belum diterbitkan',
    )
  })

  it('keeps the unsaved edits of a tab while another tab is open', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('input[name="eyebrow"]').setValue('Belum disimpan')
    await wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text().startsWith('Tanya jawab'))!
      .trigger('mousedown')
    await wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text().startsWith('Tanya jawab'))!
      .trigger('click')
    await flushPromises()
    await wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text().startsWith('Bagian atas'))!
      .trigger('mousedown')
    await wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text().startsWith('Bagian atas'))!
      .trigger('click')
    await flushPromises()

    expect(
      (wrapper.get('input[name="eyebrow"]').element as HTMLInputElement).value,
    ).toBe('Belum disimpan')
    expect(wrapper.findAll('[role="tab"]')[0].text()).toContain(
      'belum disimpan',
    )
    expect(
      button(wrapper, 'Simpan draf')!.attributes('disabled'),
    ).toBeUndefined()
  })

  it('keeps unsaved edits when the saved drafts are published', async () => {
    service.fetchDraft.mockResolvedValue({
      overview: overview({ hasUnpublishedChanges: true }),
    })
    service.publish.mockResolvedValue({
      overview: overview({ publishedAt: '2026-10-09T10:00:00.000Z' }),
    })
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('input[name="eyebrow"]').setValue('Belum disimpan')

    await button(wrapper, 'Terbitkan')!.trigger('click')
    await button(wrapper, 'Terbitkan sekarang')!.trigger('click')
    await flushPromises()

    expect(service.publish).toHaveBeenCalledTimes(1)
    expect(
      (wrapper.get('input[name="eyebrow"]').element as HTMLInputElement).value,
    ).toBe('Belum disimpan')
  })

  it('saves the draft of the open section and updates the state', async () => {
    service.saveSection.mockResolvedValue({
      overview: overview({ hasUnpublishedChanges: true }),
    })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('input[name="eyebrow"]').setValue('Teks baru')
    await button(wrapper, 'Simpan draf')!.trigger('click')
    await flushPromises()

    expect(service.saveSection).toHaveBeenCalledWith(
      'hero',
      expect.objectContaining({ eyebrow: 'Teks baru' }),
    )
    expect(wrapper.get('[data-test="landing-status"]').text()).toContain(
      'Ada perubahan belum diterbitkan',
    )
  })

  it('disables Simpan draf until something changed and marks the tab when it did', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(button(wrapper, 'Simpan draf')!.attributes('disabled')).toBeDefined()

    await wrapper.get('input[name="eyebrow"]').setValue('Teks baru')
    expect(
      button(wrapper, 'Simpan draf')!.attributes('disabled'),
    ).toBeUndefined()
    expect(wrapper.findAll('[role="tab"]')[0].text()).toContain(
      'belum disimpan',
    )
  })

  it('shows the validation message and saves nothing when a limit is broken', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('input[name="eyebrow"]').setValue('   ')
    await button(wrapper, 'Simpan draf')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Wajib diisi.')
    expect(service.saveSection).not.toHaveBeenCalled()
  })

  it('fills the open section with the built-in content without saving', async () => {
    service.fetchDraft.mockResolvedValue({
      overview: overview({
        sections: {
          ...none,
          hero: { ...landingDefaults.hero, eyebrow: 'Diubah' },
        },
      }),
    })
    const wrapper = mountView()
    await flushPromises()

    await button(wrapper, 'Isi dengan bawaan')!.trigger('click')

    expect(
      (wrapper.get('input[name="eyebrow"]').element as HTMLInputElement).value,
    ).toBe(landingDefaults.hero.eyebrow)
    expect(service.saveSection).not.toHaveBeenCalled()
  })

  it('publishes after confirmation and refreshes the state', async () => {
    service.fetchDraft.mockResolvedValue({
      overview: overview({ hasUnpublishedChanges: true }),
    })
    service.publish.mockResolvedValue({
      overview: overview({ publishedAt: '2026-10-09T10:00:00.000Z' }),
    })
    const wrapper = mountView()
    await flushPromises()

    await button(wrapper, 'Terbitkan')!.trigger('click')
    await button(wrapper, 'Terbitkan sekarang')!.trigger('click')
    await flushPromises()

    expect(service.publish).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-test="landing-status"]').text()).toContain(
      'Sudah terbit',
    )
  })

  it('publishes even when the dialog closes itself before the confirm handler runs', async () => {
    service.fetchDraft.mockResolvedValue({
      overview: overview({ hasUnpublishedChanges: true }),
    })
    service.publish.mockResolvedValue({ overview: overview() })
    const SelfClosingDialog = defineComponent({
      props: { open: Boolean },
      emits: ['update:open'],
      setup(_, { emit, slots }) {
        provide('closeDialog', () => emit('update:open', false))
        return () => h('div', slots.default?.())
      },
    })
    const ClosingAction = defineComponent({
      setup(_, { slots }) {
        const close = inject<() => void>('closeDialog')
        return () =>
          h('button', { onClick: () => close?.() }, slots.default?.())
      },
    })
    const wrapper = mount(LandingSettingsView, {
      global: {
        stubs: {
          ...stubs,
          AlertDialog: SelfClosingDialog,
          AlertDialogAction: ClosingAction,
        },
      },
    })
    await flushPromises()

    await button(wrapper, 'Terbitkan')!.trigger('click')
    await button(wrapper, 'Terbitkan sekarang')!.trigger('click')
    await flushPromises()

    expect(service.publish).toHaveBeenCalledTimes(1)
    expect(service.discard).not.toHaveBeenCalled()
  })

  it('discards after confirmation and reloads the content from the answer', async () => {
    service.fetchDraft.mockResolvedValue({
      overview: overview({
        hasUnpublishedChanges: true,
        sections: {
          ...none,
          hero: { ...landingDefaults.hero, eyebrow: 'Draf' },
        },
      }),
    })
    service.discard.mockResolvedValue({ overview: overview() })
    const wrapper = mountView()
    await flushPromises()

    await button(wrapper, 'Buang perubahan')!.trigger('click')
    await button(wrapper, 'Buang sekarang')!.trigger('click')
    await flushPromises()

    expect(service.discard).toHaveBeenCalledTimes(1)
    expect(
      (wrapper.get('input[name="eyebrow"]').element as HTMLInputElement).value,
    ).toBe(landingDefaults.hero.eyebrow)
  })

  it('goes to the preview in the same tab', async () => {
    const wrapper = mountView()
    await flushPromises()
    await button(wrapper, 'Pratinjau')!.trigger('click')
    expect(router.push).toHaveBeenCalledWith('/admin/landing/preview')
  })

  it('hides publish and disables the forms for a user who may only read', async () => {
    access.granted = new Set(['admission-landing.read'])
    const wrapper = mountView()
    await flushPromises()

    expect(button(wrapper, 'Terbitkan')).toBeUndefined()
    expect(
      wrapper.get('input[name="eyebrow"]').attributes('disabled'),
    ).toBeDefined()
    expect(button(wrapper, 'Simpan draf')?.attributes('disabled')).toBeDefined()
  })

  it('shows the load error with a retry', async () => {
    service.fetchDraft.mockResolvedValueOnce({ error: 'Gagal memuat.' })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Gagal memuat.')
    await button(wrapper, 'Coba lagi')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('input[name="eyebrow"]').exists()).toBe(true)
  })
})
