// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import type * as VueRouter from 'vue-router'
import { landingDefaults } from '../data/landingDefaults'
import LandingView from './LandingView.vue'

const publicApi = vi.hoisted(() => ({
  fetchActiveWaves: vi.fn(),
  fetchActiveDownloads: vi.fn(),
}))
vi.mock('../composables/usePublicAdmission', () => ({
  usePublicAdmission: () => publicApi,
}))

const landingApi = vi.hoisted(() => ({
  getLandingPublished: vi.fn(),
  getLandingDraft: vi.fn(),
  landingImageUrl: (id: string) => `/admissions/landing/images/${id}`,
}))
vi.mock('../api/admissionApi', () => ({ admissionApi: landingApi }))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRoute: () => ({ query: {} }),
    useRouter: () => ({ replace: vi.fn() }),
  }
})

const none = {
  hero: null,
  life: null,
  info: null,
  steps: null,
  faq: null,
  stories: null,
  closing: null,
}

const mountView = (props = {}) =>
  mount(LandingView, {
    props,
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        LandingNavbar: true,
        LandingWaveSection: true,
        LandingRequirements: true,
        LandingDownloads: true,
      },
    },
  })

beforeEach(() => {
  vi.clearAllMocks()
  publicApi.fetchActiveWaves.mockResolvedValue({ waves: [], documentTypes: [] })
  publicApi.fetchActiveDownloads.mockResolvedValue([])
  landingApi.getLandingPublished.mockResolvedValue({ data: { data: none } })
})

describe('LandingView', () => {
  it('shows the built-in page when nothing is published', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('h1').html()).toContain(
      'Di sini, cerita<br>barumu dimulai.',
    )
    expect(wrapper.find('#informasi').exists()).toBe(false)
  })

  it('shows published content and the poster section with its footer link', async () => {
    landingApi.getLandingPublished.mockResolvedValue({
      data: {
        data: {
          ...none,
          hero: { ...landingDefaults.hero, titleLines: ['Judul terbit'] },
          info: {
            ...landingDefaults.info,
            posters: [
              { image: { imageId: 'p1' }, alt: 'Poster', caption: null },
            ],
          },
        },
      },
    })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Judul terbit')
    expect(wrapper.find('#informasi').exists()).toBe(true)
    expect(
      wrapper.findAll('footer a').map((a) => a.attributes('href')),
    ).toContain('#informasi')
  })

  it('falls back to the built-in page when the content request fails', async () => {
    landingApi.getLandingPublished.mockRejectedValue(new Error('down'))
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.get('h1').html()).toContain(
      'Di sini, cerita<br>barumu dimulai.',
    )
  })

  it('reads the draft and shows a banner in draft mode', async () => {
    landingApi.getLandingDraft.mockResolvedValue({
      data: {
        data: {
          sections: {
            ...none,
            hero: { ...landingDefaults.hero, titleLines: ['Judul draf'] },
          },
          hasUnpublishedChanges: true,
          publishedAt: null,
        },
      },
    })
    const wrapper = mountView({ mode: 'draft' })
    await flushPromises()

    expect(landingApi.getLandingPublished).not.toHaveBeenCalled()
    expect(wrapper.get('h1').text()).toBe('Judul draf')
    expect(wrapper.get('[data-test="draft-banner"]').text()).toContain(
      'Pratinjau draf',
    )
  })

  it('shows an error, not the built-in page, when the draft cannot be loaded', async () => {
    landingApi.getLandingDraft.mockRejectedValue(new Error('down'))
    const wrapper = mountView({ mode: 'draft' })
    await flushPromises()

    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.get('[data-test="draft-error"]').text()).toContain(
      'Pratinjau draf gagal dimuat',
    )
    expect(wrapper.find('[data-test="draft-banner"]').exists()).toBe(true)
  })

  it('shows no banner for visitors', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('[data-test="draft-banner"]').exists()).toBe(false)
  })
})
