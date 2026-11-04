// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { RouterView } from 'vue-router'
import { authConfig, configureAuth } from '@/features/platform/auth'
import SignUpDialog from '@/features/admission/components/SignUpDialog.vue'
import { admissionApi } from '@/features/admission/api/admissionApi'
import { publicAdmissionService } from '@/features/admission/services/publicAdmissionService'
import router from './index'

enableAutoUnmount(afterEach)
afterEach(() => vi.restoreAllMocks())

async function mountLanding(path = '/') {
  vi.spyOn(publicAdmissionService, 'fetchActiveWaves').mockResolvedValue({
    waves: [
      {
        id: 'wave-1',
        code: 'PSB-1',
        name: 'Gelombang 1',
        academicYear: '2026/2027',
        description: null,
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        quota: 100,
        remainingQuota: 25,
        registrationFee: 100000,
      },
    ],
    documentTypes: [],
  })
  vi.spyOn(admissionApi, 'getLandingPublished').mockResolvedValue({
    data: {
      data: {
        hero: null,
        life: null,
        info: null,
        steps: null,
        faq: null,
        stories: null,
        closing: null,
      },
    },
  } as Awaited<ReturnType<typeof admissionApi.getLandingPublished>>)
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(path)
  await router.isReady()
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return wrapper
}

it.each([
  ['hero', '.hero-actions'],
  ['closing', '.closing-copy'],
])(
  'sends the %s registration action to login without opening signup',
  async (_, selector) => {
    const wrapper = await mountLanding()
    const action = wrapper
      .get(selector)
      .findAll('a, button')
      .find((element) => element.text() === 'Mulai pendaftaran')!

    await action.trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe('/login')
      expect(wrapper.getComponent(SignUpDialog).props('modelValue')).toBe(false)
    })
    expect(action.element.tagName).toBe('A')
    expect(action.attributes('href')).toBe('/login')
  },
)

it('opens legacy landing signup links on login instead of the landing page', async () => {
  const wrapper = await mountLanding('/?signup=1')

  await vi.waitFor(() => {
    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.getComponent(SignUpDialog).props('modelValue')).toBe(true)
    expect(router.currentRoute.value.query.signup).toBeUndefined()
  })
})

it('opens registration on login without sending the applicant to the homepage', async () => {
  const previousConfig = authConfig.value
  configureAuth({ signUpUrl: '/register' })
  try {
    const pinia = createPinia()
    setActivePinia(pinia)
    await router.push('/login')
    await router.isReady()
    const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
      global: { plugins: [pinia, router] },
    })
    await flushPromises()
    await wrapper.get('[data-testid="login-signup-link"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.getComponent(SignUpDialog).props('modelValue')).toBe(true)
    wrapper.unmount()
  } finally {
    authConfig.value = previousConfig
  }
})
