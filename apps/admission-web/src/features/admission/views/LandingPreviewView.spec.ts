// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import type * as VueRouter from 'vue-router'
import { mount } from '@vue/test-utils'
import LandingPreviewView from './LandingPreviewView.vue'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRouter: () => router }
})

const LandingViewStub = {
  props: ['mode'],
  template:
    '<div data-test="landing" :data-mode="mode"><slot name="banner-action" /></div>',
}

describe('LandingPreviewView', () => {
  it('renders the landing page in draft mode with a way back', async () => {
    const wrapper = mount(LandingPreviewView, {
      global: { stubs: { LandingView: LandingViewStub } },
    })

    expect(wrapper.get('[data-test="landing"]').attributes('data-mode')).toBe(
      'draft',
    )
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Kembali ke pengaturan')!
      .trigger('click')
    expect(router.push).toHaveBeenCalledWith('/admin/landing')
  })
})
